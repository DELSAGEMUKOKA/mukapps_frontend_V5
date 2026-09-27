// src/modules/magasin/utils/categoryExcel.ts

import type ExcelJS from 'exceljs';
import type { Category } from '@/shared/types';
import type { CreateCategoryPayload } from '../api/categoryApi';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convertit une valeur de cellule ExcelJS en chaîne de caractères.
 * ExcelJS peut renvoyer : string | number | Date | RichText | { formula, result } | ...
 */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  // RichText : { richText: [{ text }, ...] }
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rich = (value as { richText: { text: string }[] }).richText;
    return rich.map((r) => r.text).join('');
  }
  // Formule : { formula, result }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    const res = (value as { result: unknown }).result;
    return res === null || res === undefined ? '' : String(res);
  }
  return String(value);
}

/**
 * Convertit une valeur de cellule en nombre (entier).
 */
function cellToNumber(value: unknown): number {
  const str = cellToString(value);
  const num = Number(str);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Télécharge un buffer sous forme de fichier .xlsx
 */
function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Applique un style d'en-tête (fond vert, texte blanc, gras) sur une ligne.
 * Types ExcelJS précis → plus de `any`.
 */
function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell: ExcelJS.Cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
}

// ============================================================================
// EXPORT : Catégories → Excel
// ============================================================================

export async function exportCategoriesToExcel(
  categories: Category[],
  filename = 'categories.xlsx',
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Catégories');

  ws.columns = [
    { header: 'Nom', key: 'name', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Couleur', key: 'color', width: 15 },
    { header: 'Nb Produits', key: 'productCount', width: 15 },
    { header: 'Date création', key: 'createdAt', width: 18 },
  ];

  styleHeaderRow(ws.getRow(1));

  categories.forEach((c) => {
    ws.addRow({
      name: c.name,
      description: c.description || '',
      color: c.color || '',
      productCount: c._count?.products ?? 0,
      createdAt: new Date(c.createdAt).toLocaleDateString('fr-FR'),
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename);
}

// ============================================================================
// TEMPLATE : Fichier modèle à télécharger
// ============================================================================

export async function downloadCategoryTemplate(
  filename = 'template_categories.xlsx',
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Catégories');

  ws.columns = [
    { header: 'Nom *', key: 'name', width: 30 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Couleur', key: 'color', width: 15 },
  ];

  styleHeaderRow(ws.getRow(1));

  // Lignes d'exemple
  ws.addRow({
    name: 'Alimentation',
    description: 'Produits alimentaires et boissons',
    color: '#10b981',
  });
  ws.addRow({
    name: 'Hygiène',
    description: "Produits d'hygiène et soins",
    color: '#3b82f6',
  });
  ws.addRow({
    name: 'Électronique',
    description: '',
    color: '#f59e0b',
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename);
}

// ============================================================================
// IMPORT : Excel → Catégories
// ============================================================================

export interface CategoryImportResult {
  valid: CreateCategoryPayload[];
  errors: string[];
}

export async function importCategoriesFromExcel(file: File): Promise<CategoryImportResult> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) {
    return { valid: [], errors: ['Aucune feuille trouvée dans le fichier'] };
  }

  // ─── Lecture de la ligne d'en-tête ───
  const headerRow = ws.getRow(1);
  const headers: Record<number, string> = {};
  headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
    headers[colNumber] = cellToString(cell.value).trim();
  });

  // ─── Lecture des données ───
  const valid: CreateCategoryPayload[] = [];
  const errors: string[] = [];

  const totalRows = ws.rowCount;

  for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
    const row = ws.getRow(rowNumber);

    // Extraction par nom d'en-tête (tolérant aux variations)
    const getValue = (...keys: string[]): string => {
      for (const [colNumber, header] of Object.entries(headers)) {
        if (keys.some((k) => header.toLowerCase() === k.toLowerCase())) {
          return cellToString(row.getCell(Number(colNumber)).value).trim();
        }
      }
      return '';
    };

    const name = getValue('Nom *', 'Nom', 'name');
    if (!name) {
      // Ligne vide → on ignore silencieusement (pas d'erreur)
      const isEmpty =
        !getValue('Description', 'description') &&
        !getValue('Couleur', 'color');
      if (isEmpty) continue;

      errors.push(`Ligne ${rowNumber} : nom manquant`);
      continue;
    }

    const color = getValue('Couleur', 'color');
    const isValidColor = !color || /^#[0-9a-fA-F]{6}$/.test(color);
    if (!isValidColor) {
      errors.push(
        `Ligne ${rowNumber} : couleur invalide "${color}" (format attendu : #RRGGBB)`,
      );
    }

    valid.push({
      name,
      description: getValue('Description', 'description') || undefined,
      color: isValidColor && color ? color : undefined,
    });
  }

  return { valid, errors };
}

// ============================================================================
// Ré-export pour compatibilité (si d'autres fichiers importent ces helpers)
// ============================================================================

export { cellToString, cellToNumber };