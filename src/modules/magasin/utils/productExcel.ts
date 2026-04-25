import * as XLSX from 'xlsx';
import type { CreateProductPayload } from '../api/productApi';
import type { Product } from '@/shared/types';

export function exportProductsToExcel(products: Product[], filename = 'produits.xlsx') {
  const rows = products.map((p) => ({
    'Nom': p.name,
    'Code barre': p.barcode || '',
    'Catégorie': p.category?.name || '',
    'Prix vente': p.unitPrice,
    'Prix achat': p.costPrice ?? '',
    'Stock': p.stock,
    'Unité': p.unit || '',
    'Stock min': p.minStock ?? '',
    'Date expiration': p.expiryDate || '',
    'Description': p.description || '',
    'Statut': p.isActive ? 'Actif' : 'Inactif',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produits');
  XLSX.writeFile(wb, filename);
}

export function downloadProductTemplate(filename = 'template_produits.xlsx') {
  const examples = [
    {
      'Nom *': 'Eau minérale 1.5L',
      'Code barre': '6111243100055',
      'Catégorie (nom exact)': 'Boissons',
      'Prix vente *': 500,
      'Prix achat': 400,
      'Stock': 100,
      'Unité': 'PCS',
      'Stock min': 10,
      'Date expiration (YYYY-MM-DD)': '2025-12-31',
      'Description': 'Eau minérale naturelle',
    },
    {
      'Nom *': 'Savon Palmolive',
      'Code barre': '',
      'Catégorie (nom exact)': 'Hygiène',
      'Prix vente *': 1200,
      'Prix achat': 900,
      'Stock': 50,
      'Unité': 'PCS',
      'Stock min': 5,
      'Date expiration (YYYY-MM-DD)': '',
      'Description': '',
    },
    {
      'Nom *': 'Farine de maïs 1kg',
      'Code barre': '6223002030055',
      'Catégorie (nom exact)': 'Alimentation',
      'Prix vente *': 2500,
      'Prix achat': 2000,
      'Stock': 200,
      'Unité': 'KG',
      'Stock min': 20,
      'Date expiration (YYYY-MM-DD)': '2026-06-30',
      'Description': 'Farine de maïs jaune',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(examples);
  ws['!cols'] = [
    { wch: 30 }, { wch: 18 }, { wch: 26 }, { wch: 14 }, { wch: 14 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 40 },
  ];

  const instructionsData = [
    ['INSTRUCTIONS IMPORTATION'],
    [''],
    ['Colonnes obligatoires :'],
    ['  - Nom *                      : Nom du produit (texte)'],
    ['  - Prix vente *               : Prix de vente (nombre positif)'],
    [''],
    ['Colonnes facultatives :'],
    ['  - Code barre                 : Code-barres EAN/UPC (texte)'],
    ["  - Catégorie (nom exact)      : Doit correspondre exactement au nom d'une catégorie existante"],
    ['  - Prix achat                 : Prix d\'achat (nombre)'],
    ['  - Stock                      : Quantité en stock (nombre entier, défaut 0)'],
    ['  - Unité                      : PCS, KG, L, etc. (texte)'],
    ['  - Stock min                  : Seuil d\'alerte stock faible (nombre entier)'],
    ['  - Date expiration (YYYY-MM-DD): Format YYYY-MM-DD (ex: 2025-12-31)'],
    ['  - Description                : Description libre (texte)'],
    [''],
    ['NOTES :'],
    ['  - La première ligne est l\'en-tête, ne pas la modifier'],
    ['  - Les lignes avec un nom ou prix manquant seront ignorées avec un message d\'erreur'],
    ['  - Les catégories non trouvées seront signalées (produit créé sans catégorie)'],
    ['  - Les dates doivent être au format YYYY-MM-DD'],
  ];

  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsWs['!cols'] = [{ wch: 75 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produits');
  XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');
  XLSX.writeFile(wb, filename);
}

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
  categories: Array<{ id: string; name: string }> = []
): Promise<ProductImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        const categoryMap = new Map<string, string>();
        categories.forEach((c) => {
          categoryMap.set(c.name.toLowerCase().trim(), c.id);
        });

        const valid: CreateProductPayload[] = [];
        const parsed: ParsedProductRow[] = [];
        const errors: string[] = [];
        const categoryWarnings: string[] = [];

        rows.forEach((row, i) => {
          const rowNum = i + 2;
          const name = String(
            row['Nom *'] ?? row['Nom'] ?? row['name'] ?? row['NOM'] ?? ''
          ).trim();

          if (!name) {
            errors.push(`Ligne ${rowNum} : nom manquant`);
            return;
          }

          const priceRaw = row['Prix vente *'] ?? row['Prix vente'] ?? row['unitPrice'] ?? row['prix_vente'] ?? 0;
          const unitPrice = parseFloat(String(priceRaw));
          if (isNaN(unitPrice) || unitPrice < 0) {
            errors.push(`Ligne ${rowNum} ("${name}") : prix de vente invalide`);
            return;
          }

          const rowWarnings: string[] = [];

          const costRaw = row['Prix achat'] ?? row['costPrice'] ?? row['prix_achat'];
          const costPrice = costRaw !== '' && costRaw !== undefined
            ? parseFloat(String(costRaw))
            : undefined;

          const stockRaw = row['Stock'] ?? row['stock'] ?? row['quantite'] ?? row['Quantité'] ?? 0;
          const stock = parseInt(String(stockRaw)) || 0;

          const minStockRaw = row['Stock min'] ?? row['minStock'] ?? row['stock_min'];
          const minStock = minStockRaw !== '' && minStockRaw !== undefined
            ? parseInt(String(minStockRaw))
            : undefined;

          const unit = String(
            row['Unité'] ?? row['Unite'] ?? row['unit'] ?? row['UNITE'] ?? ''
          ).trim() || undefined;

          const expiryRaw = String(
            row['Date expiration (YYYY-MM-DD)'] ?? row['Date expiration'] ?? row['expiryDate'] ?? row['expiration'] ?? ''
          ).trim();
          let expiryDate: string | undefined;
          if (expiryRaw) {
            const d = new Date(expiryRaw);
            if (isNaN(d.getTime())) {
              rowWarnings.push(`Date expiration invalide ("${expiryRaw}") — ignorée`);
            } else {
              expiryDate = d.toISOString().split('T')[0];
            }
          }

          const categoryNameRaw = String(
            row['Catégorie (nom exact)'] ?? row['Catégorie'] ?? row['categorie'] ?? row['category'] ?? ''
          ).trim();

          let categoryId: string | undefined;
          if (categoryNameRaw) {
            const found = categoryMap.get(categoryNameRaw.toLowerCase());
            if (found) {
              categoryId = found;
            } else {
              rowWarnings.push(`Catégorie "${categoryNameRaw}" non trouvée — produit créé sans catégorie`);
              const warning = `Catégorie inconnue : "${categoryNameRaw}" (ligne ${rowNum})`;
              if (!categoryWarnings.includes(warning)) {
                categoryWarnings.push(warning);
              }
            }
          }

          const barcodeRaw = String(
            row['Code barre'] ?? row['barcode'] ?? row['code_barre'] ?? ''
          ).trim();

          const description = String(row['Description'] ?? row['description'] ?? '').trim() || undefined;

          parsed.push({
            rowIndex: rowNum,
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
        });

        resolve({ valid, parsed, errors, categoryWarnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
