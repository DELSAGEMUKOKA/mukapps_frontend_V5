// src/modules/magasin/utils/productExcel.ts

import type ExcelJS from 'exceljs';
import type { CreateProductPayload } from '../api/productApi';
import type { Product } from '@/shared/types';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convertit une valeur de cellule ExcelJS en chaîne de caractères.
 */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  // RichText
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rich = (value as { richText: { text: string }[] }).richText;
    return rich.map((r) => r.text).join('');
  }
  // Formule
  if (typeof value === 'object' && value !== null && 'result' in value) {
    const res = (value as { result: unknown }).result;
    return res === null || res === undefined ? '' : String(res);
  }
  return String(value);
}

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
// EXPORT : Produits → Excel
// ============================================================================

export async function exportProductsToExcel(
  products: Product[],
  filename = 'produits.xlsx',
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Produits');

  ws.columns = [
    { header: 'Nom', key: 'name', width: 30 },
    { header: 'Code barre', key: 'barcode', width: 18 },
    { header: 'Catégorie', key: 'category', width: 20 },
    { header: 'Prix vente', key: 'unitPrice', width: 14 },
    { header: 'Prix achat', key: 'costPrice', width: 14 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Unité', key: 'unit', width: 10 },
    { header: 'Stock min', key: 'minStock', width: 12 },
    { header: 'Date expiration', key: 'expiryDate', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Statut', key: 'status', width: 10 },
  ];

  styleHeaderRow(ws.getRow(1));

  products.forEach((p) => {
    ws.addRow({
      name: p.name,
      barcode: p.barcode || '',
      category: p.category?.name || '',
      unitPrice: p.unitPrice,
      costPrice: p.costPrice ?? '',
      stock: p.stock,
      unit: p.unit || '',
      minStock: p.minStock ?? '',
      expiryDate: p.expiryDate || '',
      description: p.description || '',
      status: p.isActive ? 'Actif' : 'Inactif',
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename);
}

// ============================================================================
// TEMPLATE : Fichier modèle à télécharger
// ============================================================================

export async function downloadProductTemplate(filename = 'template_produits.xlsx'): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  // ─── Feuille Produits ───
  const ws = wb.addWorksheet('Produits');

  ws.columns = [
    { header: 'Nom *', key: 'name', width: 30 },
    { header: 'Code barre', key: 'barcode', width: 18 },
    { header: 'Catégorie (nom exact)', key: 'category', width: 26 },
    { header: 'Prix vente *', key: 'unitPrice', width: 14 },
    { header: 'Prix achat', key: 'costPrice', width: 14 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Unité', key: 'unit', width: 10 },
    { header: 'Stock min', key: 'minStock', width: 12 },
    { header: 'Date expiration (YYYY-MM-DD)', key: 'expiryDate', width: 28 },
    { header: 'Description', key: 'description', width: 40 },
  ];

  styleHeaderRow(ws.getRow(1));

  ws.addRow({
    name: 'Eau minérale 1.5L',
    barcode: '6111243100055',
    category: 'Boissons',
    unitPrice: 500,
    costPrice: 400,
    stock: 100,
    unit: 'PCS',
    minStock: 10,
    expiryDate: '2025-12-31',
    description: 'Eau minérale naturelle',
  });

  ws.addRow({
    name: 'Savon Palmolive',
    barcode: '',
    category: 'Hygiène',
    unitPrice: 1200,
    costPrice: 900,
    stock: 50,
    unit: 'PCS',
    minStock: 5,
    expiryDate: '',
    description: '',
  });

  ws.addRow({
    name: 'Farine de maïs 1kg',
    barcode: '6223002030055',
    category: 'Alimentation',
    unitPrice: 2500,
    costPrice: 2000,
    stock: 200,
    unit: 'KG',
    minStock: 20,
    expiryDate: '2026-06-30',
    description: 'Farine de maïs jaune',
  });

  // ─── Feuille Instructions ───
  const instructionsWs = wb.addWorksheet('Instructions');
  instructionsWs.columns = [{ key: 'text', width: 75 }];

  const instructions: string[] = [
    'INSTRUCTIONS IMPORTATION',
    '',
    'Colonnes obligatoires :',
    '  - Nom *                      : Nom du produit (texte)',
    '  - Prix vente *               : Prix de vente (nombre positif)',
    '',
    'Colonnes facultatives :',
    '  - Code barre                 : Code-barres EAN/UPC (texte)',
    "  - Catégorie (nom exact)      : Doit correspondre exactement au nom d'une catégorie existante",
    "  - Prix achat                 : Prix d'achat (nombre)",
    '  - Stock                      : Quantité en stock (nombre entier, défaut 0)',
    '  - Unité                      : PCS, KG, L, etc. (texte)',
    "  - Stock min                  : Seuil d'alerte stock faible (nombre entier)",
    '  - Date expiration (YYYY-MM-DD): Format YYYY-MM-DD (ex: 2025-12-31)',
    '  - Description                : Description libre (texte)',
    '',
    'NOTES :',
    "  - La première ligne est l'en-tête, ne pas la modifier",
    "  - Les lignes avec un nom ou prix manquant seront ignorées avec un message d'erreur",
    '  - Les catégories non trouvées seront signalées (produit créé sans catégorie)',
    '  - Les dates doivent être au format YYYY-MM-DD',
  ];

  instructions.forEach((text) => {
    instructionsWs.addRow({ text });
  });

  // Titre en gras
  const titleRow = instructionsWs.getRow(1);
  titleRow.getCell(1).font = { bold: true, size: 14 };

  const buffer = await wb.xlsx.writeBuffer();
  downloadBuffer(buffer as ArrayBuffer, filename);
}

// ============================================================================
// IMPORT : Excel → Produits
// ============================================================================

export interface ParsedProductRow {
  rowIndex: number;
  name: string;
  barcode?: string;
  categoryName?: string;
  categoryId?: string;
  unitPrice: number;
  costPrice?: number;
  stock: number;
  unit?: string;
  minStock?: number;
  expiryDate?: string;
  description?: string;
  warnings: string[];
}

export interface ProductImportResult {
  valid: CreateProductPayload[];
  parsed: ParsedProductRow[];
  errors: string[];
  categoryWarnings: string[];
}

export async function importProductsFromExcel(
  file: File,
  categories: Array<{ id: string; name: string }> = [],
): Promise<ProductImportResult> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) {
    return {
      valid: [],
      parsed: [],
      errors: ['Aucune feuille trouvée dans le fichier'],
      categoryWarnings: [],
    };
  }

  // ─── Lecture de la ligne d'en-tête ───
  const headerRow = ws.getRow(1);
  const headers: Record<string, number> = {}; // header → colIndex
  headerRow.eachCell((cell, colNumber) => {
    const header = cellToString(cell.value).trim();
    if (header) headers[header] = colNumber;
  });

  // ─── Map des catégories ───
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => {
    categoryMap.set(c.name.toLowerCase().trim(), c.id);
  });

  // ─── Helpers d'extraction ───
  const getCellValue = (row: ExcelJS.Row, ...keys: string[]): unknown => {
    for (const key of keys) {
      const colIndex = headers[key];
      if (colIndex !== undefined) {
        return row.getCell(colIndex).value;
      }
    }
    return undefined;
  };

  const getString = (row: ExcelJS.Row, ...keys: string[]): string => {
    return cellToString(getCellValue(row, ...keys)).trim();
  };

  const valid: CreateProductPayload[] = [];
  const parsed: ParsedProductRow[] = [];
  const errors: string[] = [];
  const categoryWarnings: string[] = [];

  const totalRows = ws.rowCount;

  for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
    const row = ws.getRow(rowNumber);

    // Ignorer les lignes complètement vides
    const firstHeader = Object.keys(headers)[0];
    if (firstHeader) {
      const firstCol = headers[firstHeader];
      if (
        row.getCell(firstCol).value === null ||
        row.getCell(firstCol).value === undefined
      ) {
        // Vérifier si la ligne entière est vide
        let hasData = false;
        row.eachCell((c: ExcelJS.Cell) => {
          if (c.value !== null && c.value !== undefined && c.value !== '') hasData = true;
        });
        if (!hasData) continue;
      }
    }

    const name = getString(row, 'Nom *', 'Nom', 'name', 'NOM');
    if (!name) {
      errors.push(`Ligne ${rowNumber} : nom manquant`);
      continue;
    }

    const priceRaw = getCellValue(
      row,
      'Prix vente *',
      'Prix vente',
      'unitPrice',
      'prix_vente',
    );
    const unitPrice = parseFloat(cellToString(priceRaw));
    if (isNaN(unitPrice) || unitPrice < 0) {
      errors.push(`Ligne ${rowNumber} ("${name}") : prix de vente invalide`);
      continue;
    }

    const rowWarnings: string[] = [];

    // ─── Prix achat ───
    const costStr = getString(row, 'Prix achat', 'costPrice', 'prix_achat');
    const costPrice = costStr ? parseFloat(costStr) : undefined;

    // ─── Stock ───
    const stockStr = getString(row, 'Stock', 'stock', 'quantite', 'Quantité');
    const stock = parseInt(stockStr) || 0;

    // ─── Stock min ───
    const minStockStr = getString(row, 'Stock min', 'minStock', 'stock_min');
    const minStock = minStockStr ? parseInt(minStockStr) : undefined;

    // ─── Unité ───
    const unit =
      getString(row, 'Unité', 'Unite', 'unit', 'UNITE') || undefined;

    // ─── Date expiration ───
    const expiryRaw = getString(
      row,
      'Date expiration (YYYY-MM-DD)',
      'Date expiration',
      'expiryDate',
      'expiration',
    );
    let expiryDate: string | undefined;
    if (expiryRaw) {
      const d = new Date(expiryRaw);
      if (isNaN(d.getTime())) {
        rowWarnings.push(`Date expiration invalide ("${expiryRaw}") — ignorée`);
      } else {
        expiryDate = d.toISOString().split('T')[0];
      }
    }

    // ─── Catégorie ───
    const categoryNameRaw = getString(
      row,
      'Catégorie (nom exact)',
      'Catégorie',
      'categorie',
      'category',
    );

    let categoryId: string | undefined;
    if (categoryNameRaw) {
      const found = categoryMap.get(categoryNameRaw.toLowerCase());
      if (found) {
        categoryId = found;
      } else {
        rowWarnings.push(
          `Catégorie "${categoryNameRaw}" non trouvée — produit créé sans catégorie`,
        );
        const warning = `Catégorie inconnue : "${categoryNameRaw}" (ligne ${rowNumber})`;
        if (!categoryWarnings.includes(warning)) {
          categoryWarnings.push(warning);
        }
      }
    }

    // ─── Code barre ───
    const barcodeRaw = getString(row, 'Code barre', 'barcode', 'code_barre');

    // ─── Description ───
    const description =
      getString(row, 'Description', 'description') || undefined;

    parsed.push({
      rowIndex: rowNumber,
      name,
      barcode: barcodeRaw || undefined,
      categoryName: categoryNameRaw || undefined,
      categoryId,
      unitPrice,
      costPrice: costPrice !== undefined && !isNaN(costPrice) ? costPrice : undefined,
      stock,
      unit,
      minStock: minStock !== undefined && !isNaN(minStock) ? minStock : undefined,
      expiryDate,
      description,
      warnings: rowWarnings,
    });

    valid.push({
      name,
      barcode: barcodeRaw || undefined,
      categoryId,
      unitPrice,
      costPrice: costPrice !== undefined && !isNaN(costPrice) ? costPrice : undefined,
      stock,
      unit,
      minStock: minStock !== undefined && !isNaN(minStock) ? minStock : undefined,
      expiryDate,
      description,
    });
  }

  return { valid, parsed, errors, categoryWarnings };
}