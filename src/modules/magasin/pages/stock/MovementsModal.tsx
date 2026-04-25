// src/modules/magasin/pages/stock/MovementsModal.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, X, Clock } from 'lucide-react';
import { stockApi, type Product, type StockMovement } from '../../api/stockApi';
import { formatDate } from '@/lib/utils';

interface MovementsModalProps {
  product: Product | null;
  onClose: () => void;
}

export function MovementsModal({ product, onClose }: MovementsModalProps) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', product?.id, page],
    queryFn: () => stockApi.getMovements({ productId: product?.id, page, limit }),
    enabled: !!product,
  });

  const movements: StockMovement[] = data?.movements || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 0 };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Mouvements de stock</h2>
            <p className="text-sm text-gray-500">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="py-10 text-center">Chargement...</div>
          ) : movements.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Clock size={40} className="mx-auto mb-3" />
              <p>Aucun mouvement pour ce produit</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">Quantité</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Raison</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">Utilisateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{formatDate(movement.createdAt)}</td>
                        <td className="px-4 py-3">
                          {movement.type === 'add' ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Plus size={12} /> Entrée
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <Minus size={12} /> Sortie
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{movement.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{movement.reason}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {movement.user?.firstName} {movement.user?.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">Page {pagination.page} / {pagination.totalPages}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 1}
                      className="btn-secondary text-sm"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= pagination.totalPages}
                      className="btn-secondary text-sm"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}