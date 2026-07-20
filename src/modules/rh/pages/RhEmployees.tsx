import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, UserCog, CreditCard as Edit2, Trash2, QrCode, X, Check, RefreshCw, Download, ExternalLink, Camera, Loader as Loader2, ImageOff, IdCard } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  rhEmployeesApi, rhDepartmentsApi, rhQrCodeApi,
  CONTRACT_TYPE_LABELS, EMPLOYEE_STATUS_LABELS,
} from '../api/rhApi';
import type { RhEmployee, RhContractType, RhEmployeeStatus, CreateEmployeeDto } from '../api/rhApi';
import { TOKEN_KEY } from '@/core/config/constants';
import { env } from '@/core/config/env';
import { useAppStore } from '@/core/store';
import { companySettingsApi } from '@/modules/users/api/companySettingsApi';
import { generateServiceCard } from '../utils/serviceCardGenerator';
import { useFormatCurrency } from '@/shared/hooks/useCurrency';

const STATUS_BADGE: Record<RhEmployeeStatus, string> = {
  ACTIF: 'badge-success',
  SUSPENDU: 'badge-warning',
  INACTIF: 'badge-error',
};

const CONTRACT_BADGE: Record<RhContractType, string> = {
  CDI: 'badge-primary',
  CDD: 'badge-secondary',
  STAGE: 'badge-warning',
  FREELANCE: 'badge-secondary',
};

function EmployeeAvatar({ employee, size = 'sm' }: { employee: Pick<RhEmployee, 'firstName' | 'lastName' | 'photo'>; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-7 h-7 text-[10px]';
  const radius = size === 'lg' ? 'rounded-xl' : 'rounded-lg';
  if (employee.photo) {
    return (
      <img
        src={employee.photo}
        alt={`${employee.firstName} ${employee.lastName}`}
        className={`${dim} ${radius} object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} ${radius} bg-[var(--primary-light)] flex items-center justify-center font-bold text-[var(--primary)] flex-shrink-0`}>
      {employee.firstName[0]}{employee.lastName[0]}
    </div>
  );
}

function blobToDataUrl(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = blobUrl;
  });
}

async function fetchUrlToDataUrl(url: string): Promise<string | null> {
  try {
    // URL from getLogo() is relative (e.g. "/settings/logo") — must prepend API base
    const absoluteUrl = url.startsWith('http') ? url : `${env.API_URL}${url}`;
    const token = localStorage.getItem(TOKEN_KEY) ?? '';
    const res = await fetch(absoluteUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function QrCodeModal({ employee, onClose }: { employee: RhEmployee; onClose: () => void }) {
  const qc = useQueryClient();
  const company = useAppStore((s) => s.company);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);

  const fetchQrImage = useCallback(async () => {
    setLoading(true);
    setImgError(false);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    try {
      const token = localStorage.getItem(TOKEN_KEY) ?? '';
      const url = rhQrCodeApi.getQrCode(employee.id);
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Not found');
      const blob = await res.blob();
      setBlobUrl(URL.createObjectURL(blob));
    } catch {
      setImgError(true);
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    fetchQrImage();
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, []);

  const regenerateMutation = useMutation({
    mutationFn: () => rhQrCodeApi.regenerate(employee.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rh', 'employees'] });
      toast.success('QR Code régénéré');
      fetchQrImage();
    },
    onError: () => toast.error('Erreur lors de la régénération'),
  });

  const handleDownloadQr = async () => {
    if (!blobUrl) return;
    setDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `qr-${employee.employeeNumber}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!blobUrl) return;
    setGeneratingCard(true);
    try {
      const qrDataUrl = await blobToDataUrl(blobUrl);

      // Fetch fresh settings from API (same as hotel bill) — falls back to localStorage cache
      const settings = await companySettingsApi.getSettings();
      const companyName = (settings as any)?.companyName || company?.name || undefined;

      // Load logo: same logic as hotel billsPrint.ts
      let logoDataUrl: string | null = null;
      try {
        const logoData = await companySettingsApi.getLogo();
        if (logoData) {
          const logoSrc = (logoData as any).logo ?? (logoData as any).url ?? null;
          if (logoSrc) logoDataUrl = await fetchUrlToDataUrl(logoSrc);
        }
      } catch { /* logo optional */ }

      const dataUrl = await generateServiceCard({
        employee,
        company,
        companyName,
        qrBlobUrl: qrDataUrl,
        logoUrl: logoDataUrl,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `carte-service-${employee.employeeNumber}.png`;
      a.click();
      toast.success('Carte de service générée');
    } catch {
      toast.error('Erreur lors de la génération de la carte');
    } finally {
      setGeneratingCard(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">QR Code de pointage</h2>
            <p className="text-xs text-[var(--text-secondary)]">{employee.firstName} {employee.lastName} · {employee.employeeNumber}</p>
          </div>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-52 h-52 rounded-xl border-2 border-[var(--border-light)] overflow-hidden bg-gray-50 flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw size={24} className="text-gray-300 animate-spin" />
                <p className="text-xs text-[var(--text-secondary)]">Chargement...</p>
              </div>
            ) : imgError ? (
              <div className="flex flex-col items-center gap-2 text-center px-4">
                <QrCode size={32} className="text-gray-300" />
                <p className="text-xs text-[var(--text-secondary)]">QR non généré</p>
                <p className="text-[10px] text-gray-400">Cliquez "Régénérer" pour créer le QR Code</p>
              </div>
            ) : (
              <img
                src={blobUrl!}
                alt={`QR Code ${employee.employeeNumber}`}
                className="w-full h-full object-contain p-2"
              />
            )}
          </div>

          <div className="text-center">
            <p className="text-xs font-semibold text-[var(--text-primary)]">{employee.position}</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {employee.department?.name ?? 'Sans département'}
            </p>
          </div>

          {/* Download options */}
          <div className="w-full space-y-2">
            <p className="text-[10px] uppercase tracking-wide font-semibold text-[var(--text-secondary)] text-center">Télécharger</p>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadQr}
                disabled={!blobUrl || downloading}
                className="flex-1 flex items-center justify-center gap-2 btn-secondary text-xs disabled:opacity-40"
              >
                {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                QR seul
              </button>
              <button
                onClick={handleDownloadCard}
                disabled={!blobUrl || generatingCard}
                className="flex-1 flex items-center justify-center gap-2 btn-primary text-xs disabled:opacity-40"
              >
                {generatingCard ? <Loader2 size={12} className="animate-spin" /> : <IdCard size={12} />}
                {generatingCard ? 'Génération...' : 'Carte de service'}
              </button>
            </div>
            <button
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="w-full flex items-center justify-center gap-2 btn-secondary text-xs"
            >
              <RefreshCw size={13} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
              Régénérer le QR Code
            </button>
          </div>

          <a
            href="/rh/qr-kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
          >
            <ExternalLink size={12} /> Ouvrir le kiosque de pointage
          </a>
        </div>
      </div>
    </div>
  );
}

function EmployeeModal({
  employee,
  departments,
  onClose,
  onSave,
}: {
  employee: RhEmployee | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSave: (data: CreateEmployeeDto & { status?: RhEmployeeStatus; _pendingPhotoFile?: File | null }) => void;
}) {
  const [form, setForm] = useState<CreateEmployeeDto & { status?: RhEmployeeStatus }>({
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    email: employee?.email ?? '',
    phone: employee?.phone ?? '',
    address: employee?.address ?? '',
    dateOfBirth: employee?.dateOfBirth?.slice(0, 10) ?? '',
    hireDate: employee?.hireDate?.slice(0, 10) ?? '',
    endDate: employee?.endDate?.slice(0, 10) ?? '',
    position: employee?.position ?? '',
    departmentId: employee?.departmentId ?? '',
    contractType: employee?.contractType ?? 'CDI',
    baseSalary: employee?.baseSalary ?? 0,
    status: employee?.status ?? 'ACTIF',
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(employee?.photo ?? null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 5 MB)');
      return;
    }

    if (employee) {
      setPhotoUploading(true);
      rhEmployeesApi.uploadPhoto(employee.id, file)
        .then(updated => {
          setPhotoPreview(updated.photo ?? null);
          setPhotoFile(null);
          toast.success('Photo mise à jour');
        })
        .catch(() => toast.error('Erreur lors de l\'upload'))
        .finally(() => setPhotoUploading(false));
    } else {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeletePhoto = async () => {
    if (!employee) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    setPhotoDeleting(true);
    try {
      await rhEmployeesApi.deletePhoto(employee.id);
      setPhotoPreview(null);
      toast.success('Photo supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setPhotoDeleting(false);
    }
  };

  const handleSave = () => {
    onSave({ ...form, _pendingPhotoFile: photoFile });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {employee ? 'Modifier l\'employé' : 'Nouvel employé'}
          </h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="overflow-y-auto p-5 scrollbar-thin">
          {/* Photo upload */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[var(--border-light)]">
            <div className="relative flex-shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Photo employé"
                  className="w-20 h-20 rounded-xl object-cover border-2 border-[var(--border-light)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[var(--primary-light)] flex items-center justify-center text-2xl font-bold text-[var(--primary)] border-2 border-dashed border-[var(--border-light)]">
                  {form.firstName?.[0] || '?'}{form.lastName?.[0] || ''}
                </div>
              )}
              {(photoUploading || photoDeleting) && (
                <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                  <Loader2 size={18} className="text-white animate-spin" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--text-primary)]">Photo de profil</p>
              <p className="text-[11px] text-[var(--text-secondary)]">JPG, PNG ou WEBP · 5 MB max{!employee ? ' · Enregistrée après création' : ''}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading || photoDeleting}
                  className="flex items-center gap-1.5 btn-secondary text-xs disabled:opacity-50"
                >
                  <Camera size={12} />
                  {photoPreview ? 'Changer' : 'Ajouter'}
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleDeletePhoto}
                    disabled={photoUploading || photoDeleting}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ImageOff size={12} /> Supprimer
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="label">Prénom *</label>
              <input className="input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Prénom" />
            </div>
            <div className="form-group">
              <label className="label">Nom *</label>
              <input className="input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Nom" />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemple.com" />
            </div>
            <div className="form-group">
              <label className="label">Téléphone</label>
              <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+225 07 00 00 00" />
            </div>
            <div className="form-group col-span-2">
              <label className="label">Adresse</label>
              <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Adresse" />
            </div>
            <div className="form-group">
              <label className="label">Poste / Fonction *</label>
              <input className="input" value={form.position} onChange={e => set('position', e.target.value)} placeholder="Ex: Développeur, Comptable..." />
            </div>
            <div className="form-group">
              <label className="label">Département</label>
              <select className="input" value={form.departmentId} onChange={e => set('departmentId', e.target.value)}>
                <option value="">-- Aucun --</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Type de contrat *</label>
              <select className="input" value={form.contractType} onChange={e => set('contractType', e.target.value as RhContractType)}>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Salaire de base *</label>
              <input className="input" type="number" min={0} value={form.baseSalary} onChange={e => set('baseSalary', Number(e.target.value))} placeholder="0" />
            </div>
            <div className="form-group">
              <label className="label">Date d'embauche *</label>
              <input className="input" type="date" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Date de fin (CDD/Stage)</label>
              <input className="input" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="label">Date de naissance</label>
              <input className="input" type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
            </div>
            {employee && (
              <div className="form-group">
                <label className="label">Statut</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value as RhEmployeeStatus)}>
                  {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={!form.firstName || !form.lastName || !form.position || !form.hireDate || !form.baseSalary}
          >
            <Check size={13} /> {employee ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeDetailModal({ employee, onClose }: { employee: RhEmployee; onClose: () => void }) {
  const fmt = useFormatCurrency();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Fiche employé</h2>
          <button onClick={onClose} className="btn-ghost w-7 h-7 p-0"><X size={14} /></button>
        </div>

        <div className="overflow-y-auto p-5 scrollbar-thin space-y-4">
          <div className="flex items-center gap-4">
            <EmployeeAvatar employee={employee} size="lg" />
            <div>
              <p className="font-bold text-[var(--text-primary)]">{employee.firstName} {employee.lastName}</p>
              <p className="text-xs text-[var(--text-secondary)]">{employee.position}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={STATUS_BADGE[employee.status] + ' badge'}>{EMPLOYEE_STATUS_LABELS[employee.status]}</span>
                <span className={CONTRACT_BADGE[employee.contractType] + ' badge'}>{CONTRACT_TYPE_LABELS[employee.contractType]}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><p className="label">Matricule</p><p className="font-semibold text-[var(--text-primary)]">{employee.employeeNumber}</p></div>
            <div><p className="label">Département</p><p className="font-semibold text-[var(--text-primary)]">{employee.department?.name ?? '—'}</p></div>
            <div><p className="label">Salaire de base</p><p className="font-semibold text-[var(--text-primary)]">{fmt(employee.baseSalary)}</p></div>
            <div><p className="label">Date d'embauche</p><p className="font-semibold text-[var(--text-primary)]">{new Date(employee.hireDate).toLocaleDateString('fr-FR')}</p></div>
            {employee.email && <div><p className="label">Email</p><p className="font-semibold text-[var(--text-primary)] truncate">{employee.email}</p></div>}
            {employee.phone && <div><p className="label">Téléphone</p><p className="font-semibold text-[var(--text-primary)]">{employee.phone}</p></div>}
            {employee.address && <div className="col-span-2"><p className="label">Adresse</p><p className="font-semibold text-[var(--text-primary)]">{employee.address}</p></div>}
          </div>

          {employee.payslips && employee.payslips.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Derniers bulletins</p>
              <div className="space-y-1.5">
                {employee.payslips.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-[var(--bg-secondary)] rounded-lg">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{p.period}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{fmt(Number(p.netSalary))}</span>
                    <span className={`badge ${p.status === 'PAYE' ? 'badge-success' : p.status === 'VALIDE' ? 'badge-primary' : 'badge-secondary'}`}>
                      {p.status === 'PAYE' ? 'Payé' : p.status === 'VALIDE' ? 'Validé' : 'Brouillon'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-light)]">
          <button onClick={onClose} className="btn-secondary w-full">Fermer</button>
        </div>
      </div>
    </div>
  );
}

export default function RhEmployees() {
  const qc = useQueryClient();
  const fmt = useFormatCurrency();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RhEmployeeStatus | ''>('ACTIF');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RhEmployee | null>(null);
  const [detailEmp, setDetailEmp] = useState<RhEmployee | null>(null);
  const [qrEmp, setQrEmp] = useState<RhEmployee | null>(null);

  const { data: depts = [] } = useQuery({
    queryKey: ['rh', 'departments'],
    queryFn: () => rhDepartmentsApi.getAll({ isActive: true }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['rh', 'employees', 'all'],
    queryFn: () => rhEmployeesApi.getAll({ limit: 500 }),
  });

  const createMutation = useMutation({
    mutationFn: async (dto: CreateEmployeeDto & { _pendingPhotoFile?: File | null }) => {
      const { _pendingPhotoFile, ...employeeData } = dto;
      const created = await rhEmployeesApi.create(employeeData);
      if (_pendingPhotoFile) {
        try {
          await rhEmployeesApi.uploadPhoto(created.id, _pendingPhotoFile);
        } catch {
          toast.error('Employé créé mais erreur lors de l\'upload de la photo');
        }
      }
      return created;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'employees'] }); toast.success('Employé créé'); setModalOpen(false); },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateEmployeeDto> & { status?: RhEmployeeStatus } }) => {
      // ✅ Nettoyer les données : convertir les chaînes vides en null
      const cleanData: any = {};
      Object.keys(data).forEach(key => {
        const value = data[key as keyof typeof data];
        if (value === '') {
          cleanData[key] = null;
        } else if (value !== undefined) {
          cleanData[key] = value;
        }
      });
      return rhEmployeesApi.update(id, cleanData);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'employees'] }); toast.success('Employé mis à jour'); setEditing(null); },
    onError: (error: any) => {
      console.error('Erreur mise à jour:', error.response?.data);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rhEmployeesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rh', 'employees'] }); toast.success('Employé supprimé'); },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const allEmployees = data?.employees ?? [];
  const employees = allEmployees
    .filter(e => !statusFilter || e.status === statusFilter)
    .filter(e => !deptFilter || e.departmentId === deptFilter)
    .filter(e => !search || `${e.firstName} ${e.lastName} ${e.employeeNumber} ${e.position}`.toLowerCase().includes(search.toLowerCase()));
  const total = employees.length;
  const pages = Math.ceil(employees.length / 20);
  const pagedEmployees = employees.slice((page - 1) * 20, page * 20);

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employés</h1>
          <p className="page-subtitle">{total} employé{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/rh/qr-kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary flex items-center gap-2"
          >
            <QrCode size={14} /> Kiosque QR
          </a>
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={14} /> Nouvel employé
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            className="input pl-7"
            placeholder="Rechercher par nom, matricule, poste..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input w-36" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as RhEmployeeStatus | ''); setPage(1); }}>
          <option value="">Tous statuts</option>
          {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input w-40" value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}>
          <option value="">Tous depts</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Matricule</th>
              <th>Poste</th>
              <th>Département</th>
              <th>Contrat</th>
              <th>Salaire</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : pagedEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12">
                  <UserCog size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-[var(--text-secondary)]">Aucun employé trouvé</p>
                </td>
              </tr>
            ) : pagedEmployees.map(emp => (
              <tr key={emp.id}>
                <td>
                  <button
                    onClick={() => setDetailEmp(emp)}
                    className="flex items-center gap-2 group text-left"
                  >
                    <EmployeeAvatar employee={emp} size="sm" />
                    <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                      {emp.firstName} {emp.lastName}
                    </span>
                  </button>
                </td>
                <td className="font-mono text-[var(--text-secondary)]">{emp.employeeNumber}</td>
                <td>{emp.position}</td>
                <td>{emp.department?.name ?? <span className="text-gray-300">—</span>}</td>
                <td><span className={`badge ${CONTRACT_BADGE[emp.contractType]}`}>{CONTRACT_TYPE_LABELS[emp.contractType]}</span></td>
                <td className="font-medium">{fmt(emp.baseSalary)}</td>
                <td><span className={`badge ${STATUS_BADGE[emp.status]}`}>{EMPLOYEE_STATUS_LABELS[emp.status]}</span></td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setQrEmp(emp)}
                      className="btn-ghost w-7 h-7 p-0 text-[var(--primary)]"
                      title="QR Code"
                    >
                      <QrCode size={12} />
                    </button>
                    <button
                      onClick={() => setEditing(emp)}
                      className="btn-ghost w-7 h-7 p-0"
                      title="Modifier"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Supprimer ${emp.firstName} ${emp.lastName} ?`)) deleteMutation.mutate(emp.id); }}
                      className="btn-ghost w-7 h-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Page {page} sur {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Précédent</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary btn-sm">Suivant</button>
          </div>
        </div>
      )}

      {(modalOpen || editing) && (
        <EmployeeModal
          employee={editing}
          departments={depts}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={(dto) => {
            if (editing) {
              // ✅ Pour la mise à jour, extraire et nettoyer les données
              const { _pendingPhotoFile, ...updateData } = dto;
              updateMutation.mutate({ id: editing.id, data: updateData });
            } else {
              createMutation.mutate(dto);
            }
          }}
        />
      )}
      {detailEmp && <EmployeeDetailModal employee={detailEmp} onClose={() => setDetailEmp(null)} />}
      {qrEmp && <QrCodeModal employee={qrEmp} onClose={() => setQrEmp(null)} />}
    </div>
  );
}