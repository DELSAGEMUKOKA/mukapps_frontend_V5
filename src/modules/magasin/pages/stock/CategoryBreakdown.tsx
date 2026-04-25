// src/modules/magasin/pages/stock/CategoryBreakdown.tsx
import { formatCurrency } from '@/lib/utils';

interface CategoryBreakdownProps {
  categories: {
    categoryId: string | null;
    categoryName: string;
    productCount: number;
    totalQuantity: number;
    stockValue: number;
    sellingValue: number;
  }[];
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  if (categories.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-secondary-900 mb-4">
        📊 Vue d'ensemble par catégorie
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.categoryId || 'uncategorized'} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-secondary-900">{cat.categoryName}</h3>
              <span className="text-xs text-gray-400">{cat.productCount} produit(s)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <p className="text-xs text-gray-500">Unités</p>
                <p className="text-lg font-bold text-secondary-900">{cat.totalQuantity}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valeur</p>
                <p className="text-lg font-bold text-secondary-900">{formatCurrency(cat.stockValue)}</p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Prix vente potentiel:</span>
                <span className="font-medium">{formatCurrency(cat.sellingValue)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}