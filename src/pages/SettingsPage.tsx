import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Building2, Barcode, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/core/store';
import { usersApi } from '@/modules/users/api/usersApi';
import { authApi } from '@/core/api/authApi';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { getRoleLabel } from '@/lib/utils';
import type { CompanySettings, LogoData } from '@/shared/types';

const BarcodeLabels = lazy(() => import('@/modules/magasin/pages/BarcodeLabels'));

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

const DEFAULT_SETTINGS: CompanySettings = {
  companyName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  website: '',
  slogan: '',
  rccm: '',
  idNat: '',
  taxId: '',
  impotNumber: '',
  currency: 'FC',
  dateFormat: 'DD/MM/YYYY',
  invoicePrefix: 'FAC',
  invoiceFooter: '',
};

type Tab = 'profile' | 'security' | 'company' | 'barcodes';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [companyForm, setCompanyForm] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const { data: savedSettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => companySettingsApi.getSettings(),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (savedSettings) {
      setCompanyForm((prev) => ({ ...prev, ...savedSettings }));
    }
  }, [savedSettings]);

  // ✅ Requête pour récupérer le logo avec transformation correcte
  const { data: logoData, refetch: refetchLogo } = useQuery({
    queryKey: ['company-logo'],
    queryFn: async (): Promise<LogoData | null> => {
      const result = await companySettingsApi.getLogo();
      // ✅ Adaptation : le backend retourne "logo" (base64), pas "url"
      if (result && 'logo' in result) {
        return { url: result.logo, mimeType: result.logoMimeType, size: result.logoSize };
      }
      return result;
    },
    enabled: isAdmin,
  });

  // ✅ Extraire l'URL du logo pour l'affichage
  useEffect(() => {
    if (logoData?.url) {
      setLogoUrl(logoData.url);
    } else {
      setLogoUrl(null);
    }
  }, [logoData]);

  const profileMutation = useMutation({
    mutationFn: (payload: typeof profileForm) => usersApi.updateProfile(payload),
    onSuccess: (data) => {
      toast.success('Profil mis à jour');
      if (data?.data) updateUser(data.data);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) => authApi.changePassword(payload),
    onSuccess: () => {
      toast.success('Mot de passe modifié');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const companyMutation = useMutation({
    mutationFn: (payload: Partial<CompanySettings>) => companySettingsApi.updateSettings(payload),
    onSuccess: () => toast.success('Paramètres de l\'entreprise sauvegardés'),
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => companySettingsApi.uploadLogo(file),
    onSuccess: (data) => {
      toast.success('Logo téléchargé');
      // ✅ Mise à jour immédiate de l'URL affichée
      if (data && 'logo' in data) {
        setLogoUrl(data.logo);
      } else if (data && 'url' in data) {
        setLogoUrl(data.url);
      }
      qc.invalidateQueries({ queryKey: ['company-logo'] });
      refetchLogo();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de l\'upload'),
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => companySettingsApi.deleteLogo(),
    onSuccess: () => {
      toast.success('Logo supprimé');
      setLogoUrl(null);
      qc.invalidateQueries({ queryKey: ['company-logo'] });
      refetchLogo();
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur lors de la suppression'),
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Format non supporté. Utilisez PNG, JPEG, GIF ou WebP');
      return;
    }
    if (file.size > 64 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 MB)');
      return;
    }
    uploadLogoMutation.mutate(file);
    e.target.value = '';
  };

  const tabs = [
    { id: 'profile' as Tab, label: 'Profil', icon: User },
    { id: 'security' as Tab, label: 'Sécurité', icon: Lock },
    ...(isAdmin ? [{ id: 'company' as Tab, label: 'Entreprise', icon: Building2 }] : []),
    { id: 'barcodes' as Tab, label: 'Codes-barres', icon: Barcode },
  ];

  const setField = (field: keyof CompanySettings, value: string) =>
    setCompanyForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className={`space-y-6 ${activeTab === 'barcodes' ? 'max-w-none' : 'max-w-3xl'}`}>
      <div>
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Gérez votre compte et vos préférences</p>
      </div>

      <div className="flex gap-1 p-1 bg-secondary-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-secondary-900 shadow-card'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-xl font-bold text-white">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-secondary-900">{user?.firstName} {user?.lastName}</h3>
              <p className="text-sm text-secondary-500">{user?.email}</p>
              <span className="badge-primary mt-1 inline-block">{user ? getRoleLabel(user.role) : ''}</span>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); profileMutation.mutate(profileForm); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Prénom</label>
                <input className="input" value={profileForm.firstName} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Nom</label>
                <input className="input" value={profileForm.lastName} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Téléphone</label>
              <input type="tel" className="input" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" value={user?.email} disabled />
            </div>
            <button type="submit" className="btn-primary" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-secondary-900 mb-4">Changer le mot de passe</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pwForm.newPassword !== pwForm.confirmPassword) {
                toast.error('Les mots de passe ne correspondent pas');
                return;
              }
              passwordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            }}
            className="space-y-4"
          >
            <div className="form-group">
              <label className="label">Mot de passe actuel</label>
              <input type="password" className="input" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="label">Nouveau mot de passe</label>
              <input type="password" className="input" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="label">Confirmer le mot de passe</label>
              <input type="password" className="input" value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
            </div>
            <button type="submit" className="btn-primary" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'En cours...' : 'Changer le mot de passe'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'barcodes' && (
        <Suspense fallback={<div className="py-12 text-center text-sm text-secondary-400">Chargement...</div>}>
          <BarcodeLabels />
        </Suspense>
      )}

      {activeTab === 'company' && isAdmin && (
        <form
          onSubmit={(e) => { e.preventDefault(); companyMutation.mutate(companyForm); }}
          className="space-y-5"
        >
          {/* Logo upload */}
          <div className="card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-secondary-900 pb-2 border-b border-secondary-100">
              Logo de l'entreprise
            </h3>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Logo preview area */}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadLogoMutation.isPending}
                className="group relative w-full sm:w-48 h-36 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#017e84] bg-gray-50 hover:bg-[#017e84]/5 flex items-center justify-center overflow-hidden transition-all duration-200 flex-shrink-0 disabled:cursor-not-allowed"
              >
                {uploadLogoMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2 text-[#017e84]">
                    <span className="w-8 h-8 border-2 border-[#017e84]/20 border-t-[#017e84] rounded-full animate-spin" />
                    <span className="text-xs font-medium">Upload en cours...</span>
                  </div>
                ) : logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Logo entreprise" className="w-full h-full object-contain p-3" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex flex-col items-center gap-1.5 text-white">
                        <Upload size={20} />
                        <span className="text-xs font-medium">Remplacer</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#017e84] transition-colors">
                    <ImageIcon size={32} strokeWidth={1.5} />
                    <span className="text-xs font-medium">Cliquer pour ajouter</span>
                  </div>
                )}
              </button>

              {/* Info + actions */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-secondary-800">
                    {logoUrl ? 'Logo actuel' : 'Aucun logo configuré'}
                  </p>
                  <p className="text-xs text-secondary-500 leading-relaxed">
                    Le logo apparaît sur tous vos documents PDF (devis, Proformas, factures).<br />
                    Formats acceptés : PNG, JPEG, GIF, WebP — Taille max : 5 MB
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadLogoMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#017e84] text-white rounded-lg hover:bg-[#016a70] transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    <Upload size={14} />
                    {logoUrl ? 'Remplacer le logo' : 'Télécharger un logo'}
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => { if (confirm('Supprimer le logo ?')) deleteLogoMutation.mutate(); }}
                      disabled={deleteLogoMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                    >
                      {deleteLogoMutation.isPending ? (
                        <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Supprimer
                    </button>
                  )}
                </div>

                {logoUrl && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Logo actif — visible sur tous les documents
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-secondary-900 pb-2 border-b border-secondary-100">
              Informations générales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group sm:col-span-2">
                <label className="label">Nom de l'entreprise</label>
                <input className="input" value={companyForm.companyName} onChange={(e) => setField('companyName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Email <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
                <input className="input" value={companyForm.email} onChange={(e) => setField('email', e.target.value)} placeholder="contact@entreprise.com" />
              </div>
              <div className="form-group">
                <label className="label">Téléphone</label>
                <input type="tel" className="input" value={companyForm.phone} onChange={(e) => setField('phone', e.target.value)} />
              </div>
              <div className="form-group sm:col-span-2">
                <label className="label">Adresse</label>
                <input className="input" value={companyForm.address} onChange={(e) => setField('address', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Ville</label>
                <input className="input" value={companyForm.city} onChange={(e) => setField('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Code postal</label>
                <input className="input" value={companyForm.postalCode} onChange={(e) => setField('postalCode', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Pays</label>
                <input className="input" value={companyForm.country} onChange={(e) => setField('country', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Site web <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
                <input className="input" value={companyForm.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://www.entreprise.com" />
              </div>
              <div className="form-group sm:col-span-2">
                <label className="label">Slogan</label>
                <input className="input" value={companyForm.slogan} onChange={(e) => setField('slogan', e.target.value)} placeholder="Votre partenaire de confiance" />
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-secondary-900 pb-2 border-b border-secondary-100">
              Identifiants légaux
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">RCCM</label>
                <input className="input font-mono" value={companyForm.rccm} onChange={(e) => setField('rccm', e.target.value)} placeholder="RCCM/KIN/..." />
              </div>
              <div className="form-group">
                <label className="label">ID National</label>
                <input className="input font-mono" value={companyForm.idNat} onChange={(e) => setField('idNat', e.target.value)} placeholder="01-A-..." />
              </div>
              <div className="form-group">
                <label className="label">N° Impôt (NIF)</label>
                <input className="input font-mono" value={companyForm.taxId} onChange={(e) => setField('taxId', e.target.value)} placeholder="A1234567B" />
              </div>
              <div className="form-group">
                <label className="label">N° Impôt (local)</label>
                <input className="input font-mono" value={companyForm.impotNumber} onChange={(e) => setField('impotNumber', e.target.value)} placeholder="IMP-2024-..." />
              </div>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-secondary-900 pb-2 border-b border-secondary-100">
              Paramètres de facturation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="label">Devise</label>
                <input
                  className="input font-mono uppercase"
                  value={companyForm.currency}
                  onChange={(e) => setField('currency', e.target.value.toUpperCase())}
                  placeholder="FC"
                  maxLength={10}
                />
              </div>
              <div className="form-group">
                <label className="label">Format de date</label>
                <select className="input" value={companyForm.dateFormat} onChange={(e) => setField('dateFormat', e.target.value)}>
                  {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Préfixe factures</label>
                <input className="input font-mono" value={companyForm.invoicePrefix} onChange={(e) => setField('invoicePrefix', e.target.value)} placeholder="FAC" maxLength={10} />
              </div>
              <div className="form-group sm:col-span-3">
                <label className="label">Pied de page des factures</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={companyForm.invoiceFooter}
                  onChange={(e) => setField('invoiceFooter', e.target.value)}
                  placeholder="Merci pour votre confiance. Paiement à 30 jours."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={companyMutation.isPending}>
              {companyMutation.isPending ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}