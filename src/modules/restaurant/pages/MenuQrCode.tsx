import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Download, Copy, CheckCheck, ExternalLink, RefreshCw, CircleAlert as AlertCircle, Smartphone, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { menuQrApi, type MenuQrData } from '../api/restaurantApi';
import { SmartLoader } from '@/core/components/common/SmartLoader';
import { cn } from '@/lib/utils';

export default function MenuQrCode() {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['restaurant-menu-qr'],
    queryFn: () => menuQrApi.generate(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const qr: MenuQrData | undefined = (data as any)?.data?.data ?? (data as any)?.data;

  const handleCopy = async () => {
    if (!qr?.menuUrl) return;
    try {
      await navigator.clipboard.writeText(qr.menuUrl);
      setCopied(true);
      toast.success('Lien copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const handleDownload = () => {
    if (!qr?.qrCodeDataUrl) return;
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = qr.qrCodeDataUrl;
      a.download = `menu-qrcode-${qr.company?.name?.replace(/\s+/g, '-') ?? 'restaurant'}.png`;
      a.click();
      toast.success('QR code téléchargé avec succès');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <SmartLoader text="Génération du QR code..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={22} className="text-red-500" />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Impossible de générer le QR code</h2>
        <p className="text-sm text-gray-500 mb-4">Vérifiez votre connexion ou réessayez.</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <QrCode size={15} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">QR Code Menu</h1>
          </div>
          <p className="text-sm text-gray-500">
            Permettez à vos clients de consulter votre menu en scannant ce QR code.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* QR Code card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-8 flex items-center justify-center">
              {qr?.qrCodeDataUrl ? (
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <img
                    src={qr.qrCodeDataUrl}
                    alt="QR Code Menu"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 bg-gray-200 rounded-xl animate-pulse" />
              )}
            </div>
            {qr?.company && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">Restaurant</p>
                <p className="text-sm font-semibold text-gray-800">{qr.company.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions card */}
        <div className="lg:col-span-3 space-y-4">

          {/* Action buttons */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Actions
            </label>

            <button
              onClick={handleDownload}
              disabled={downloading || !qr}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} className={cn(downloading && 'animate-bounce')} />
              <span>{downloading ? 'Téléchargement...' : 'Télécharger en PNG (haute résolution)'}</span>
            </button>

            {qr?.menuUrl && (
              <a
                href={qr.menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <ExternalLink size={16} />
                <span>Prévisualiser le menu client</span>
              </a>
            )}
          </div>

          {/* How-to */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Info size={15} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Comment utiliser ce QR code ?</p>
                <ol className="space-y-1.5">
                  {[
                    'Téléchargez l\'image PNG pour l\'impression.',
                    'Placez le QR code sur les tables, au comptoir ou à l\'entrée.',
                    'Les clients scannent avec leur smartphone — aucune application requise.',
                    'Le menu se met à jour automatiquement dès que vous modifiez des articles.',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile preview hint */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
        <Smartphone size={16} className="text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          La page menu est optimisée pour mobile. Testez-la depuis votre smartphone en scannant le QR code ou en ouvrant le lien.
        </p>
      </div>
    </div>
  );
}
