import * as XLSX from 'xlsx';
import type { Category } from '@/shared/types';
import type { CreateCategoryPayload } from '../api/categoryApi';

export function exportCategoriesToExcel(categories: Category[], filename = 'categories.xlsx') {
  const rows = categories.map((c) => ({
    'Nom': c.name,
    'Description': c.description || '',
    'Couleur': c.color || '',
    'Nb Produits': c._count?.products ?? 0,
    'Date création': new Date(c.createdAt).toLocaleDateString('fr-FR'),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 30 },
    { wch: 50 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catégories');
  XLSX.writeFile(wb, filename);
}

export function downloadCategoryTemplate(filename = 'template_categories.xlsx') {
  const headers = ['Nom *', 'Description', 'Couleur'];

  const examples = [
    { 'Nom *': 'Alimentation', 'Description': 'Produits alimentaires et boissons', 'Couleur': '#10b981' },
    { 'Nom *': 'Hygiène', 'Description': 'Produits d\'hygiène et soins', 'Couleur': '#3b82f6' },
    { 'Nom *': 'Électronique', 'Description': '', 'Couleur': '#f59e0b' },
  ];

  const ws = XLSX.utils.json_to_sheet(examples, { header: headers });

  ws['!cols'] = [
    { wch: 30 },
    { wch: 50 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catégories');
  XLSX.writeFile(wb, filename);
}

export interface CategoryImportResult {
  valid: CreateCategoryPayload[];
  errors: string[];
}

export async function importCategoriesFromExcel(file: File): Promise<CategoryImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        const valid: CreateCategoryPayload[] = [];
        const errors: string[] = [];

        rows.forEach((row, i) => {
          const name = String(row['Nom *'] || row['Nom'] || row['name'] || '').trim();
          if (!name) {
            errors.push(`Ligne ${i + 2} : nom manquant`);
            return;
          }

          const color = String(row['Couleur'] || row['color'] || '').trim();
          const isValidColor = !color || /^#[0-9a-fA-F]{6}$/.test(color);
          if (!isValidColor) {
            errors.push(`Ligne ${i + 2} : couleur invalide "${color}" (format attendu : #RRGGBB)`);
          }

          valid.push({
            name,
            description: String(row['Description'] || row['description'] || '').trim() || undefined,
            color: isValidColor && color ? color : undefined,
          });
        });

        resolve({ valid, errors });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
