import { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Phone, Mail, MapPin, User, Check, Star } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clientApi } from '@/modules/client/api/clientApi';
import type { Customer } from '@/shared/types';

interface Props {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
}

const EMPTY: FormState = { firstName: '', lastName: '', phone: '', email: '', address: '', notes: '' };

export default function InvoicingClientModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const t = setTimeout(() => firstNameRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { 
      if (e.key === 'Escape') { 
        e.preventDefault(); 
        onClose(); 
      } 
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) errs.firstName = 'Prénom requis';
    if (!form.lastName.trim()) errs.lastName = 'Nom requis';
    if (!form.phone.trim()) errs.phone = 'Téléphone requis';
    
    // Validation email optionnelle
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Email invalide';
    }
    
    // Validation téléphone (au moins 8 chiffres)
    const phoneClean = form.phone.trim().replace(/\s/g, '');
    if (phoneClean.length < 8) {
      errs.phone = 'Numéro de téléphone invalide (minimum 8 chiffres)';
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setApiError(null);
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      
      console.log('📤 Envoi client:', payload);
      const result = await clientApi.create(payload);
      console.log('📥 Réponse brute:', result);
      return result;
    },
    onSuccess: (customer: Customer) => {
      console.log('✅ Client créé:', customer);
      
      // Invalider tous les caches de clients
      qc.invalidateQueries({ queryKey: ['invoicing-clients'] });
      qc.invalidateQueries({ queryKey: ['clients-pos'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['clients-list'] });
      
      // Rafraîchir les requêtes
      setTimeout(() => {
        qc.refetchQueries({ queryKey: ['invoicing-clients'] });
        qc.refetchQueries({ queryKey: ['clients-pos'] });
      }, 100);
      
      toast.success(`${customer.firstName} ${customer.lastName} créé avec succès`);
      onCreated(customer);
      onClose(); // Fermer automatiquement le modal après création
    },
    onError: (error: ApiError) => {
      console.error('❌ Erreur création client:', error);
      
      // Gérer les erreurs spécifiques de l'API
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de la création du client';
      
      // Afficher les erreurs de validation du backend
      if (error?.response?.data?.errors) {
        const backendErrors = error.response.data.errors;
        const newErrors: Partial<Record<keyof FormState, string>> = {};
        
        if (backendErrors.email) newErrors.email = backendErrors.email[0];
        if (backendErrors.phone) newErrors.phone = backendErrors.phone[0];
        if (backendErrors.firstName) newErrors.firstName = backendErrors.firstName[0];
        if (backendErrors.lastName) newErrors.lastName = backendErrors.lastName[0];
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        }
      }
      
      setApiError(errorMessage);
      toast.error(errorMessage);
    },
  });

  const handleSubmit = () => {
    console.log('🔘 Formulaire soumis');
    setApiError(null);
    
    if (!validate()) {
      console.log('❌ Validation échouée:', errors);
      return;
    }
    
    console.log('✅ Validation OK, appel mutation');
    mutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const setField = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (apiError) setApiError(null);
  };

  const initials = (form.firstName[0] ?? '') + (form.lastName[0] ?? '');

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-[70]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#017e84] to-[#029aa2] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {initials ? initials.toUpperCase() : <User size={22} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nouveau client</h2>
              <p className="text-xs text-white/70 mt-0.5">Renseignez les informations du client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenu du formulaire */}
        <div className="p-5 space-y-4">
          {/* Message d'erreur API */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <p className="font-medium">Erreur</p>
              <p className="text-xs mt-1">{apiError}</p>
            </div>
          )}

          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Prénom <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={firstNameRef}
                  type="text"
                  value={form.firstName}
                  onChange={setField('firstName')}
                  placeholder="Prénom"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.firstName ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-[#017e84]/20 focus:border-[#017e84]'
                  }`}
                />
              </div>
              {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700">
                Nom <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={form.lastName}
                  onChange={setField('lastName')}
                  placeholder="Nom de famille"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.lastName ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-[#017e84]/20 focus:border-[#017e84]'
                  }`}
                />
              </div>
              {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Téléphone */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={setField('phone')}
                placeholder="+243 81 000 00 00"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.phone ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-[#017e84]/20 focus:border-[#017e84]'
                }`}
              />
            </div>
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Email <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="client@exemple.com"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.email ? 'border-red-400 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-[#017e84]/20 focus:border-[#017e84]'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Adresse */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Adresse <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={form.address}
                onChange={setField('address')}
                placeholder="Adresse complète"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84] transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700">
              Notes <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <Star className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
              <textarea
                value={form.notes}
                onChange={setField('notes')}
                placeholder="Informations complémentaires..."
                rows={2}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#017e84]/20 focus:border-[#017e84] transition-colors resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 bg-[#017e84] text-white rounded-xl hover:bg-[#016a70] font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Check size={16} />}
              {mutation.isPending ? 'Création...' : 'Créer le client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}