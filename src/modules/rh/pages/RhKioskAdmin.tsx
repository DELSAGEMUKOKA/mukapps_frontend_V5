import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Monitor, ShieldCheck, ShieldOff, RefreshCw, Trash2, Copy, Check, Eye, EyeOff, ExternalLink, Loader as Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { kioskAdminApi } from '../api/rhApi';
import type { RhKiosk, RhKioskWithToken } from '../api/rhApi';

const QK = { kiosks: ['rh', 'kiosks'] };

function TokenReveal({ token, onClose }: { token: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">Token kiosque</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-amber-700 font-medium">
            Copiez ce token et configurez la borne. Il ne sera plus visible après fermeture.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
          <span className={`flex-1 text-sm font-mono text-gray-800 break-all ${!visible ? 'blur-sm select-none' : ''}`}>
            {token}
          </span>
          <button
            onClick={() => setVisible(v => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button
          onClick={copy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] transition-colors"
        >
          {copied ? <><Check size={16} /> Copié !</> : <><Copy size={16} /> Copier le token</>}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          Entrez ce token sur la page <code className="bg-gray-100 px-1 rounded">/rh/qr-kiosk</code> de la borne.
        </p>
      </div>
    </div>
  );
}

function CreateKioskModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (n: string) => kioskAdminApi.create(n),
    onSuccess: (kiosk: RhKioskWithToken) => {
      qc.invalidateQueries({ queryKey: QK.kiosks });
      onClose();
      toast.custom(() => (
        <TokenReveal token={kiosk.token} onClose={() => toast.dismiss()} />
      ), { duration: Infinity });
    },
    onError: () => toast.error('Impossible de créer le kiosque'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">Nouvelle borne</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (name.trim()) mutate(name.trim()); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nom de la borne</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: Entrée Principale, Accueil RDC..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RhKioskAdmin() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [revealToken, setRevealToken] = useState<string | null>(null);

  const { data: kiosks = [], isLoading } = useQuery<RhKiosk[]>({
    queryKey: QK.kiosks,
    queryFn: kioskAdminApi.list,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      kioskAdminApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.kiosks }),
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const regenerate = useMutation({
    mutationFn: (id: string) => kioskAdminApi.regenerateToken(id),
    onSuccess: (kiosk: RhKioskWithToken) => {
      qc.invalidateQueries({ queryKey: QK.kiosks });
      setRevealToken(kiosk.token);
    },
    onError: () => toast.error('Erreur lors de la régénération'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => kioskAdminApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.kiosks });
      toast.success('Borne supprimée');
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  return (
    <div className="p-6 space-y-6">
      {revealToken && <TokenReveal token={revealToken} onClose={() => setRevealToken(null)} />}
      {showCreate && <CreateKioskModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des kiosques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bornes de pointage QR Code</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/rh/qr-kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={14} /> Ouvrir le kiosque
          </a>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus size={14} /> Nouvelle borne
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : kiosks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Monitor size={20} className="text-gray-400" />
          </div>
          <p className="text-gray-600 font-medium">Aucune borne configurée</p>
          <p className="text-gray-400 text-sm max-w-xs">
            Créez une borne pour obtenir un token à coller dans la page kiosque.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus size={14} /> Créer la première borne
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {kiosks.map(k => (
            <div
              key={k.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  k.status === 'ACTIVE' ? 'bg-emerald-50' : 'bg-gray-100'
                }`}>
                  <Monitor size={18} className={k.status === 'ACTIVE' ? 'text-emerald-600' : 'text-gray-400'} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{k.name}</p>
                  <p className="text-xs text-gray-400">
                    Créé le {new Date(k.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  k.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {k.status === 'ACTIVE'
                    ? <><ShieldCheck size={11} /> Actif</>
                    : <><ShieldOff size={11} /> Inactif</>}
                </span>

                <button
                  onClick={() => toggleStatus.mutate({ id: k.id, status: k.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                  disabled={toggleStatus.isPending}
                  title={k.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  {k.status === 'ACTIVE' ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Régénérer le token de "${k.name}" ? L'ancienne borne sera déconnectée.`))
                      regenerate.mutate(k.id);
                  }}
                  disabled={regenerate.isPending}
                  title="Régénérer le token"
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={16} className={regenerate.isPending ? 'animate-spin' : ''} />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Supprimer la borne "${k.name}" ?`))
                      remove.mutate(k.id);
                  }}
                  disabled={remove.isPending}
                  title="Supprimer"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-xs text-blue-700 font-semibold mb-1">Comment configurer une borne ?</p>
        <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
          <li>Créez une borne ici et copiez son token (<code className="bg-blue-100 px-1 rounded">ks_live_...</code>)</li>
          <li>Ouvrez <code className="bg-blue-100 px-1 rounded">/rh/qr-kiosk</code> sur la tablette ou l'écran dédié</li>
          <li>Collez le token dans l'écran de configuration</li>
          <li>Le kiosque est prêt — il mémorise le token dans son navigateur</li>
        </ol>
      </div>
    </div>
  );
}
