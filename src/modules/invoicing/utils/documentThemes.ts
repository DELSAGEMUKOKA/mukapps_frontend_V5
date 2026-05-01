export interface DocumentTheme {
  id: string;
  name: string;
  description: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  accentText: string;
  topBarGradient: string;
  bottomBarGradient: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  tableHeaderSubText: string;
  summaryHeaderBg: string;
  summaryTotalColor: string;
  clientBorderTop: string;
  sectionLabelColor: string;
  fontFamily: string;
  badge?: {
    bg: string;
    border: string;
    text: string;
  };
}

export const DOCUMENT_THEMES: DocumentTheme[] = [
  {
    id: 'moderne',
    name: 'Moderne',
    description: 'Design épuré avec accent teal',
    accent: '#017e84',
    accentLight: '#e2f7f8',
    accentDark: '#016a70',
    accentText: '#ffffff',
    topBarGradient: 'linear-gradient(90deg,#017e84 0%,#029aa2 50%,#e2f7f8 100%)',
    bottomBarGradient: 'linear-gradient(90deg,#e2f7f8 0%,#029aa2 50%,#017e84 100%)',
    tableHeaderBg: '#017e84',
    tableHeaderText: '#ffffff',
    tableHeaderSubText: 'rgba(255,255,255,0.85)',
    summaryHeaderBg: '#f8fafc',
    summaryTotalColor: '#017e84',
    clientBorderTop: '#017e84',
    sectionLabelColor: '#017e84',
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  {
    id: 'classique',
    name: 'Classique',
    description: 'Élégance intemporelle en bleu marine',
    accent: '#1e3a5f',
    accentLight: '#e8eef6',
    accentDark: '#162d4a',
    accentText: '#ffffff',
    topBarGradient: 'linear-gradient(90deg,#1e3a5f 0%,#2d5282 50%,#e8eef6 100%)',
    bottomBarGradient: 'linear-gradient(90deg,#e8eef6 0%,#2d5282 50%,#1e3a5f 100%)',
    tableHeaderBg: '#1e3a5f',
    tableHeaderText: '#ffffff',
    tableHeaderSubText: 'rgba(255,255,255,0.8)',
    summaryHeaderBg: '#f0f4f8',
    summaryTotalColor: '#1e3a5f',
    clientBorderTop: '#2d5282',
    sectionLabelColor: '#2d5282',
    fontFamily: "Georgia, 'Times New Roman', serif",
    badge: {
      bg: '#e8eef6',
      border: '#b8cce4',
      text: '#1e3a5f',
    },
  },
  {
    id: 'minimaliste',
    name: 'Minimaliste',
    description: 'Sobre, propre, professionnel',
    accent: '#111827',
    accentLight: '#f3f4f6',
    accentDark: '#000000',
    accentText: '#ffffff',
    topBarGradient: 'linear-gradient(90deg,#111827 0%,#374151 50%,#9ca3af 100%)',
    bottomBarGradient: 'linear-gradient(90deg,#9ca3af 0%,#374151 50%,#111827 100%)',
    tableHeaderBg: '#111827',
    tableHeaderText: '#ffffff',
    tableHeaderSubText: 'rgba(255,255,255,0.75)',
    summaryHeaderBg: '#f9fafb',
    summaryTotalColor: '#111827',
    clientBorderTop: '#374151',
    sectionLabelColor: '#6b7280',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  {
    id: 'elegant',
    name: 'Élégant',
    description: 'Raffiné avec touches dorées',
    accent: '#92400e',
    accentLight: '#fef3c7',
    accentDark: '#78350f',
    accentText: '#ffffff',
    topBarGradient: 'linear-gradient(90deg,#78350f 0%,#b45309 40%,#fbbf24 70%,#fef3c7 100%)',
    bottomBarGradient: 'linear-gradient(90deg,#fef3c7 0%,#fbbf24 30%,#b45309 60%,#78350f 100%)',
    tableHeaderBg: '#92400e',
    tableHeaderText: '#fffbeb',
    tableHeaderSubText: 'rgba(255,251,235,0.85)',
    summaryHeaderBg: '#fffbeb',
    summaryTotalColor: '#92400e',
    clientBorderTop: '#b45309',
    sectionLabelColor: '#b45309',
    fontFamily: "Garamond, Georgia, 'Times New Roman', serif",
    badge: {
      bg: '#fef3c7',
      border: '#fde68a',
      text: '#92400e',
    },
  },
];

export const DEFAULT_THEME_ID = 'moderne';

export function getTheme(id: string): DocumentTheme {
  return DOCUMENT_THEMES.find(t => t.id === id) ?? DOCUMENT_THEMES[0];
}
