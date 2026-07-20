import { useState } from 'react';
import { X, MessageCircle, Mail, Copy, Check, Link, Send } from 'lucide-react';

interface ShareModalProps {
  docNumber: string;
  docType: 'devis' | 'proforma' | 'facture';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  totalAmount?: string;
  onClose: () => void;
  onGeneratePdf?: () => Promise<string | null>;
}

function buildWhatsAppUrl(phone: string, message: string) {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function buildSmsUrl(phone: string, message: string) {
  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

function buildMailUrl(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function ShareModal({
  docNumber,
  docType,
  clientName,
  clientEmail,
  clientPhone,
  totalAmount,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [customPhone, setCustomPhone] = useState(clientPhone || '');
  const [customEmail, setCustomEmail] = useState(clientEmail || '');

  const docLabel = docType === 'devis' ? 'Devis' : docType === 'proforma' ? 'Proforma' : 'Facture';
  const greeting = clientName ? `Bonjour ${clientName},\n\n` : 'Bonjour,\n\n';

  const messageText = [
    `${greeting}Veuillez trouver ci-joint votre ${docLabel} n° ${docNumber}.`,
    totalAmount ? `Montant total : ${totalAmount}` : '',
    '\nN\'hésitez pas à nous contacter pour toute question.',
    '\nCordialement.',
  ].filter(Boolean).join('\n');

  const emailSubject = `${docLabel} n° ${docNumber}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const channels = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white',
      disabled: !customPhone,
      hint: !customPhone ? 'Numéro requis' : undefined,
      action: () => {
        window.open(buildWhatsAppUrl(customPhone, messageText), '_blank');
      },
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: Send,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white',
      disabled: !customPhone,
      hint: !customPhone ? 'Numéro requis' : undefined,
      action: () => {
        window.open(buildSmsUrl(customPhone, messageText), '_blank');
      },
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      color: 'bg-gray-700 hover:bg-gray-800',
      textColor: 'text-white',
      disabled: !customEmail,
      hint: !customEmail ? 'Email requis' : undefined,
      action: () => {
        window.open(buildMailUrl(customEmail, emailSubject, messageText), '_blank');
      },
    },
    {
      id: 'copy',
      label: copied ? 'Copié !' : 'Copier',
      icon: copied ? Check : Copy,
      color: copied ? 'bg-emerald-500' : 'bg-gray-100 hover:bg-gray-200',
      textColor: copied ? 'text-white' : 'text-gray-700',
      disabled: false,
      action: handleCopy,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
              <Link size={15} className="text-[#2563EB]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Partager le document</h2>
              <p className="text-xs text-gray-500">{docLabel} n° {docNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Contact fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Numéro de téléphone</label>
              <input
                type="tel"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="+243 000 000 000"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adresse email</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="client@exemple.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Message preview */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-28 overflow-y-auto border border-gray-100">
              {messageText}
            </div>
          </div>

          {/* Share channels */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Partager via</label>
            <div className="grid grid-cols-2 gap-2">
              {channels.map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    onClick={ch.action}
                    disabled={ch.disabled}
                    title={ch.hint}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${ch.color} ${ch.textColor} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Icon size={15} />
                    {ch.label}
                    {ch.hint && <span className="text-xs opacity-70 truncate">({ch.hint})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
