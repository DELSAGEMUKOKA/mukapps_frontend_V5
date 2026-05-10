import { X, Download } from 'lucide-react';
import type { DocumentDesign } from '../utils/buildDocumentHtml';

interface DesignOption {
  id: DocumentDesign;
  label: string;
  description: string;
  preview: string;
}

const DESIGNS: DesignOption[] = [
  {
    id: 'classique',
    label: 'Classique',
    description: 'Professionnel avec bandeau teal',
    preview: 'classique',
  },
  {
    id: 'moderne',
    label: 'Moderne',
    description: 'En-tête sombre, typographie audacieuse',
    preview: 'moderne',
  },
  {
    id: 'minimaliste',
    label: 'Minimaliste',
    description: 'Épuré, fond blanc, police sérif',
    preview: 'minimaliste',
  },
];

function ClassiquePreview() {
  return (
    <div style={{ fontFamily: 'system-ui', fontSize: '7px', lineHeight: '1.4', background: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ height: '3px', background: 'linear-gradient(90deg,#2563EB,#029aa2,#e2f7f8)' }} />
      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div>
            <div style={{ width: '50px', height: '5px', background: '#0f172a', borderRadius: '2px', marginBottom: '3px' }} />
            <div style={{ width: '36px', height: '3px', background: '#94a3b8', borderRadius: '1px' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '6px', fontWeight: 700, letterSpacing: '1px', color: '#2563EB', marginBottom: '2px' }}>DEVIS</div>
            <div style={{ width: '40px', height: '5px', background: '#0f172a', borderRadius: '2px', marginLeft: 'auto' }} />
            <div style={{ width: '40px', height: '2px', background: '#2563EB', borderRadius: '1px', marginTop: '2px', marginLeft: 'auto' }} />
          </div>
        </div>
        <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '5px' }} />
        <div style={{ background: '#2563EB', padding: '3px 5px', borderRadius: '3px', marginBottom: '3px', display: 'flex', gap: '20px' }}>
          {['Désignation','Qté','PU','Total'].map(h => (
            <div key={h} style={{ color: '#fff', fontSize: '5px', fontWeight: 700 }}>{h}</div>
          ))}
        </div>
        {[1,2].map(r => (
          <div key={r} style={{ display: 'flex', gap: '20px', padding: '2px 5px', background: r % 2 === 0 ? '#f8fafc' : '#fff' }}>
            {['Item…','1','100','100'].map((v,i) => (
              <div key={i} style={{ color: '#334155', fontSize: '5px' }}>{v}</div>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '3px 5px', fontSize: '6px', fontWeight: 700, color: '#2563EB' }}>200 FCFA</div>
        </div>
      </div>
      <div style={{ height: '2px', background: 'linear-gradient(90deg,#e2f7f8,#029aa2,#2563EB)' }} />
    </div>
  );
}

function ModernePreview() {
  return (
    <div style={{ fontFamily: 'system-ui', fontSize: '7px', lineHeight: '1.4', background: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{ background: '#2563eb', padding: '8px 10px', marginBottom: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: '50px', height: '5px', background: '#fff', borderRadius: '2px', marginBottom: '3px' }} />
            <div style={{ width: '36px', height: '3px', background: 'rgba(255,255,255,0.5)', borderRadius: '1px' }} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '4px', padding: '4px 6px', textAlign: 'right' }}>
            <div style={{ fontSize: '5px', color: 'rgba(255,255,255,0.6)', letterSpacing: '1px', marginBottom: '2px' }}>DEVIS</div>
            <div style={{ width: '36px', height: '5px', background: '#fff', borderRadius: '2px' }} />
          </div>
        </div>
      </div>
      <div style={{ height: '2px', background: 'linear-gradient(90deg,rgba(37,99,235,0.3),#2563eb)' }} />
      <div style={{ padding: '6px 10px' }}>
        <div style={{ background: '#2563eb', padding: '3px 5px', borderRadius: '3px', marginBottom: '3px', display: 'flex', gap: '20px' }}>
          {['Désignation','Qté','PU','Total'].map(h => (
            <div key={h} style={{ color: '#fff', fontSize: '5px', fontWeight: 700 }}>{h}</div>
          ))}
        </div>
        {[1,2].map(r => (
          <div key={r} style={{ display: 'flex', gap: '20px', padding: '2px 5px', background: r % 2 === 0 ? '#f8fafc' : '#fff' }}>
            {['Item…','1','100','100'].map((v,i) => (
              <div key={i} style={{ color: '#334155', fontSize: '5px' }}>{v}</div>
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '3px 5px', fontSize: '6px', fontWeight: 700, color: '#2563eb' }}>200 FCFA</div>
        </div>
      </div>
    </div>
  );
}

function MinimalistePreview() {
  return (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: '7px', lineHeight: '1.4', background: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <div style={{ width: '50px', height: '5px', background: '#1a1a1a', borderRadius: '1px', marginBottom: '3px' }} />
          <div style={{ width: '36px', height: '3px', background: '#aaa', borderRadius: '1px' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '5px', fontWeight: 600, letterSpacing: '2px', color: '#999', marginBottom: '3px' }}>DEVIS</div>
          <div style={{ width: '36px', height: '6px', background: '#1a1a1a', borderRadius: '1px', fontWeight: 300, marginLeft: 'auto' }} />
        </div>
      </div>
      <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '6px' }} />
      <div style={{ borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '20px', paddingBottom: '3px', marginBottom: '3px' }}>
        {['Désignation','Qté','PU','Total'].map(h => (
          <div key={h} style={{ color: '#555', fontSize: '5px', fontWeight: 600 }}>{h}</div>
        ))}
      </div>
      {[1,2].map(r => (
        <div key={r} style={{ display: 'flex', gap: '20px', padding: '2px 0', borderBottom: '1px solid #eee' }}>
          {['Item…','1','100','100'].map((v,i) => (
            <div key={i} style={{ color: '#1a1a1a', fontSize: '5px' }}>{v}</div>
          ))}
        </div>
      ))}
      <div style={{ borderTop: '2px solid #1a1a1a', marginTop: '5px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '5px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '1px', textTransform: 'uppercase' }}>Total TTC</div>
        <div style={{ fontSize: '7px', fontWeight: 300, color: '#1a1a1a' }}>200 FCFA</div>
      </div>
    </div>
  );
}

const PREVIEW_COMPONENTS: Record<DocumentDesign, React.FC> = {
  classique: ClassiquePreview,
  moderne: ModernePreview,
  minimaliste: MinimalistePreview,
};

interface Props {
  onSelect: (design: DocumentDesign) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function DesignPickerModal({ onSelect, onClose, loading }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Choisir un modèle de design</h2>
            <p className="text-xs text-gray-500 mt-0.5">Sélectionnez le style du PDF à générer</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Design grid */}
        <div className="p-6 grid grid-cols-3 gap-4">
          {DESIGNS.map((d) => {
            const Preview = PREVIEW_COMPONENTS[d.id];
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d.id)}
                disabled={loading}
                className="group flex flex-col gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-[#2563EB] hover:shadow-md transition-all disabled:opacity-60 text-left"
              >
                <div className="w-full aspect-[3/4] overflow-hidden rounded-lg bg-gray-50 flex items-start justify-center pt-2 px-2">
                  <div className="w-full scale-[0.85] origin-top">
                    <Preview />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-gray-900 group-hover:text-[#2563EB] transition-colors">{d.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                  <Download size={12} />
                  Télécharger
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
