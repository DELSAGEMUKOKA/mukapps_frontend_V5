import { useState, useEffect } from 'react';
import { X, CreditCard, AlertTriangle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RecordPaymentPayload } from '../api/invoicingApi';

interface Props {
  title: string;
  totalAmount: number;
  amountDue: number;
  onClose: () => void;
  onSubmit: (payload: RecordPaymentPayload) => Promise<void>;
  isDraft?: boolean;
  onSendAndPay?: (payload: RecordPaymentPayload) => Promise<void>;
}

// ✅ CORRECTION: Les valeurs doivent correspondre à l'API (en majuscules)
const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'CHECK', label: 'Chèque' },
  { value: 'CARD', label: 'Carte bancaire' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
];

export default function RecordPaymentModal({
  title,
  totalAmount,
  amountDue,
  onClose,
  onSubmit,
  isDraft = false,
  onSendAndPay
}: Props) {
  // ✅ CORRECTION: Valeur par défaut 'CASH' au lieu de 'transfer'
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState(amountDue);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mettre à jour le montant quand amountDue change
  useEffect(() => {
    if (amountDue > 0) {
      setAmount(amountDue);
    }
  }, [amountDue]);

  // Fonction d'arrondi sécurisé
  const round = (value: number) => Math.round(value * 100) / 100;

  // Formater les nombres
  const formatNumber = (value: number) => {
    return value.toLocaleString('fr-FR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newAmount = parseFloat(e.target.value);
    if (isNaN(newAmount)) newAmount = 0;
    newAmount = round(newAmount);
    setAmount(newAmount);
    setError(null);
    
    if (newAmount <= 0) {
      setError('Le montant doit être supérieur à 0');
    } else if (newAmount > amountDue) {
      setError(`Le montant (${formatNumber(newAmount)}) dépasse le reste dû (${formatNumber(amountDue)})`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const roundedAmount = round(amount);
    const roundedDue = round(amountDue);

    // ✅ Validation robuste
    if (!roundedAmount || roundedAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    // ⚠️ Tolérance pour éviter les bugs float
    if (roundedAmount > roundedDue + 0.01) {
      toast.error(`Le montant (${formatNumber(roundedAmount)}) dépasse le reste dû (${formatNumber(roundedDue)})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ CORRECTION: payload avec les bons champs pour l'API
      const payload: RecordPaymentPayload = {
        paymentMethod: method,      // ✅ 'paymentMethod' (pas 'method')
        paymentAmount: roundedAmount, // ✅ 'paymentAmount' (pas 'amount')
        ...(reference.trim() && { paymentReference: reference.trim() }),
        ...(notes.trim() && { notes: notes.trim() })
      };

      console.log('📤 Payload envoyé:', payload);

      // Si la facture est en brouillon et que onSendAndPay est fourni
      if (isDraft && onSendAndPay) {
        await onSendAndPay(payload);
        toast.success('Facture envoyée et paiement enregistré');
      } else {
        await onSubmit(payload);
        toast.success('Paiement enregistré avec succès');
      }
      
      onClose();
    } catch (error: any) {
      console.error('❌ Erreur API:', error?.response?.data || error);
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de l’enregistrement';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isValid = amount > 0 && amount <= amountDue && !error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#2563EB]" />
            <h2 className="font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Message d'alerte pour facture en brouillon */}
        {isDraft && (
          <div className="mx-6 mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
            <Send size={14} className="text-yellow-600" />
            <p className="text-xs text-yellow-700">
              Cette facture est en brouillon. Elle sera envoyée automatiquement avant l'enregistrement du paiement.
            </p>
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Résumé des montants */}
          <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Montant total</p>
              <p className="font-bold text-gray-900">
                {formatNumber(round(totalAmount))} FCFA
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Reste dû</p>
              <p className="font-bold text-orange-600">
                {formatNumber(round(amountDue))} FCFA
              </p>
            </div>
          </div>

          {/* Méthode de paiement */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Méthode de paiement <span className="text-red-500">*</span>
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] bg-white"
              required
            >
              {METHODS.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Montant reçu */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Montant reçu <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={handleAmountChange}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] ${
                error ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
              required
            />
            <p className="text-xs text-gray-400">
              Utilisez le point (.) comme séparateur décimal
            </p>
            {!error && amountDue > 0 && amount > 0 && amount <= amountDue && (
              <p className="text-xs text-green-600">
                Reste après paiement : {formatNumber(amountDue - amount)} FCFA
              </p>
            )}
          </div>

          {/* Référence (optionnel) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Référence <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="N° de virement, numéro de chèque..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Notes (optionnel) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">
              Notes <span className="text-gray-400">(optionnel)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Informations complémentaires..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#016a70] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                isDraft ? (
                  <>
                    <Send size={14} />
                    Envoyer et payer
                  </>
                ) : (
                  'Enregistrer'
                )
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}