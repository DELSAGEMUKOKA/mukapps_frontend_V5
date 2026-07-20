import { Link } from 'react-router-dom';
import { ShoppingCart, Users, UtensilsCrossed, Building2, FileText, TrendingUp, UserCheck, Package, Lock, CircleCheck as CheckCircle, Zap, Shield, MessageCircle, ArrowRight, ChevronRight, Star, Play, Menu, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const modules = [
  {
    icon: ShoppingCart,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Magasin & POS',
    description: 'Caisse, produits, stocks et factures — tout pour piloter votre commerce au quotidien.',
  },
  {
    icon: UtensilsCrossed,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    title: 'Restaurant & Bar',
    description: 'Commandes, tables, cuisine, facturation et rapports pour votre établissement.',
  },
  {
    icon: Building2,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    title: 'Hôtel',
    description: 'Réservations, chambres, housekeeping et tarifs depuis une seule interface.',
  },
  {
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'RH & Présences',
    description: 'Employés, congés, pointage QR code, paie et rapports RH en temps réel.',
  },
  {
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'Facturation',
    description: 'Devis, factures, proformas et relances clients avec exports PDF professionnels.',
  },
  {
    icon: TrendingUp,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    title: 'Finance',
    description: 'Suivi des revenus, dépenses et rapports financiers pour une vision claire.',
  },
  {
    icon: UserCheck,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    title: 'Clients',
    description: 'Fiches clients, historique des achats, gestion des dettes et fidélisation.',
  },
  {
    icon: Lock,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    title: 'Accès & Sécurité',
    description: 'Rôles, permissions granulaires, multi-utilisateurs et journal d\'activité.',
  },
];

const steps = [
  { number: '01', title: 'Créez un compte entreprise', desc: 'Renseignez les informations de votre entreprise en moins de 2 minutes.' },
  { number: '02', title: 'Choisissez vos modules', desc: 'Activez uniquement les modules dont vous avez besoin.' },
  { number: '03', title: 'Invitez votre équipe', desc: 'Ajoutez vos collaborateurs avec les accès appropriés.' },
  { number: '04', title: 'Commencez à travailler', desc: 'Gérez votre activité efficacement dès le premier jour.' },
];

const advantages = [
  { icon: CheckCircle, color: 'text-emerald-500', title: 'Simple', desc: 'Interface claire et intuitive. Aucune formation requise pour démarrer.' },
  { icon: Zap, color: 'text-amber-500', title: 'Rapide', desc: 'Actions instantanées, chargements minimaux pour ne jamais perdre de temps.' },
  { icon: Shield, color: 'text-blue-500', title: 'Sécurisé', desc: 'Contrôles d\'accès rigoureux et données protégées en permanence.' },
  { icon: Package, color: 'text-violet-500', title: 'Tout-en-un', desc: 'Magasin, RH, hôtel, restaurant — un seul outil pour tout gérer.' },
];

const testimonials = [
  { name: 'Marie Konan', role: 'Gérante, Beauty Shop', content: 'MukApps a révolutionné la gestion de ma boutique. Plus besoin de plusieurs logiciels, tout est centralisé !', rating: 5 },
  { name: 'Jean Dupont', role: 'Directeur, Tech Solutions', content: 'Le module client nous a permis de fidéliser notre clientèle. Interface simple et très efficace.', rating: 5 },
  { name: 'Myriam', role: 'Propriétaire, Mylpo Market', content: 'Le module magasin nous permet de faire les inventaires et contrôles même à distance. Excellent outil.', rating: 5 },
];

const pricing = [
  { name: 'Starter', price: 'Gratuit', sub: 'Pour démarrer', features: ['1 utilisateur', 'Jusqu\'à 100 produits', 'Support email'], popular: false },
  { name: 'Pro', price: '10$', sub: '/mois', features: ['5 utilisateurs', 'Produits illimités', 'Support prioritaire', 'Export CSV/PDF'], popular: true },
  { name: 'Enterprise', price: '30$', sub: '/mois', features: ['Utilisateurs illimités', 'Tous les modules', 'Support 24/7', 'Domaine personnalisé'], popular: false },
];

const contacts = [
  { phone: '+243820695401', display: '+243 820 695 401' },
  { phone: '+243991470040', display: '+243 991 470 040' },
];

const navLinks = [
  { href: '#modules', label: 'Modules' },
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#contact', label: 'Contact' },
];

export default function LandingPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.title = 'MukApps | Solution de gestion d\'entreprise tout-en-un';
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleVideoToggle = (play: boolean) => {
    setIsVideoPlaying(play);
    if (!play && videoRef.current) videoRef.current.pause();
  };

  return (
    <div className="min-h-screen bg-white font-sans text-base">

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm border-b border-[var(--border-light)]' : 'bg-white/80 backdrop-blur-md'}`}>
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-8" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-medium">
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
              Commencer <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-lg text-[var(--text-secondary)]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[var(--border-light)] px-6 py-4 flex flex-col gap-3">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-[var(--text-secondary)] py-1">
                {l.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-[var(--border-light)]">
              <Link to="/login" className="flex-1 text-center text-sm font-medium py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-primary)]">
                Connexion
              </Link>
              <Link to="/register" className="flex-1 text-center text-sm font-semibold py-2.5 rounded-xl bg-[var(--primary)] text-white">
                Commencer
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 15% 60%, #2563EB 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, #10B981 0%, transparent 45%)' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-4 py-2 rounded-full mb-8">
            <Zap size={12} className="text-amber-400" />
            8 modules · Gestion d'entreprise tout-en-un
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Gérez votre entreprise<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">simplement</span> avec MukApps
          </h1>

          <p className="text-slate-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Magasin, restaurant, hôtel, RH, facturation — tous vos outils de gestion réunis dans une seule plateforme claire et rapide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base shadow-lg hover:shadow-blue-900/30 hover:scale-105">
              Commencer gratuitement <ArrowRight size={18} />
            </Link>
            <a href="#apercu" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base">
              <Play size={16} className="fill-white" /> Voir la démo
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row justify-center gap-8 sm:gap-12">
            {[
              { value: '500+', label: 'Entreprises actives' },
              { value: '8', label: 'Modules disponibles' },
              { value: '24/7', label: 'Support WhatsApp' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Aperçu Dashboard */}
      <section id="apercu" className="py-20 px-6 bg-[var(--bg-secondary)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Aperçu du tableau de bord</h2>
            <p className="text-[var(--text-secondary)] text-lg">Une interface moderne pour tout piloter d'un coup d'œil.</p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => handleVideoToggle(false)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!isVideoPlaying ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-white border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--gray-100)]'}`}
            >
              Aperçu image
            </button>
            <button
              onClick={() => handleVideoToggle(true)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isVideoPlaying ? 'bg-[var(--primary)] text-white shadow-sm' : 'bg-white border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--gray-100)]'}`}
            >
              <Play size={13} /> Vidéo démo
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-xl border border-[var(--border-light)] bg-white">
            <div className="bg-[var(--gray-800)] px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-[var(--gray-700)] rounded-md px-3 py-1 text-xs text-[var(--gray-400)] max-w-xs text-center mx-auto">
                  app.mukapps.com/dashboard
                </div>
              </div>
            </div>
            {!isVideoPlaying ? (
              <img src="/dasbord_mukapps.jpeg" alt="Tableau de bord MukApps" className="w-full max-h-96 object-cover object-top" loading="lazy" />
            ) : (
              <video
                ref={videoRef}
                src="/dasbord_mukapps_video.mp4"
                poster="/dasbord_mukapps.jpeg"
                className="w-full max-h-96 object-cover"
                controls
                autoPlay
                playsInline
              >
                <source src="/dasbord_mukapps_video.mp4" type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              Plateforme modulaire
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Un module pour chaque besoin</h2>
            <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto">Activez uniquement ce dont vous avez besoin. Ajoutez de nouveaux modules à tout moment.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div key={mod.title} className="group p-6 rounded-2xl border border-[var(--border-light)] bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-default">
                  <div className={`w-11 h-11 ${mod.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={22} className={mod.color} />
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-2 text-base">{mod.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{mod.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20 px-6 bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Pourquoi choisir MukApps ?</h2>
            <p className="text-[var(--text-secondary)] text-lg">Conçu pour les entreprises qui veulent aller vite et bien.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((adv) => {
              const Icon = adv.icon;
              return (
                <div key={adv.title} className="text-center p-8 rounded-2xl bg-white border border-[var(--border-light)] hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200">
                  <Icon size={32} className={`${adv.color} mx-auto mb-4`} />
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{adv.title}</h3>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{adv.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="py-20 px-6 bg-[var(--gray-900)]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/70 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              <Zap size={12} className="text-amber-400" /> Simple et rapide
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Comment ça marche ?</h2>
            <p className="text-slate-400 text-lg">Soyez opérationnel en quelques minutes.</p>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-6 bottom-6 w-px bg-[var(--gray-700)] hidden sm:block" />
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.number} className="flex items-start gap-5 bg-[var(--gray-800)]/60 border border-[var(--gray-700)] rounded-2xl p-6 hover:bg-[var(--gray-800)] transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center font-bold text-white text-sm">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base mb-1">{step.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Ils nous font confiance</h2>
            <p className="text-[var(--text-secondary)] text-lg">Rejoignez des centaines d'entreprises satisfaites.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] hover:shadow-card-hover transition-all duration-200">
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-5">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-[var(--primary)] font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)] text-sm">{t.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="py-20 px-6 bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4">Des offres pour tous les besoins</h2>
            <p className="text-[var(--text-secondary)] text-lg">Commencez gratuitement. Évoluez selon votre croissance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border-2 transition-all hover:-translate-y-1 ${
                  plan.popular
                    ? 'border-[var(--primary)] bg-white shadow-lg shadow-blue-100'
                    : 'border-[var(--border-light)] bg-white hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white text-xs font-bold px-4 py-1 rounded-full">
                    Le plus populaire
                  </div>
                )}
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-bold text-[var(--text-primary)]">{plan.price}</span>
                  <span className="text-sm text-[var(--text-secondary)] pb-1">{plan.sub}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                      <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
                      : 'bg-[var(--gray-100)] text-[var(--text-primary)] hover:bg-[var(--gray-200)]'
                  }`}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact WhatsApp */}
      <section id="contact" className="py-16 px-6 bg-emerald-50 border-y border-emerald-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Besoin d'aide ? Contactez-nous</h2>
          <p className="text-[var(--text-secondary)] mb-8 text-base">Notre équipe est disponible sur WhatsApp pour répondre à vos questions.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {contacts.map((c) => (
              <a
                key={c.phone}
                href={`https://wa.me/${c.phone.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-7 py-4 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-105"
              >
                <MessageCircle size={18} />
                {c.display}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, #2563EB 0%, transparent 60%)' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Prêt à transformer votre<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">gestion d'entreprise ?</span>
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">
            Rejoignez les entreprises qui font confiance à MukApps pour leur gestion quotidienne.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-bold px-10 py-5 rounded-2xl text-lg transition-all shadow-xl hover:shadow-blue-900/40 hover:scale-105"
          >
            Créer mon compte gratuitement
            <ArrowRight size={22} />
          </Link>
          <p className="text-slate-500 text-sm mt-5">Aucune carte bancaire requise · Démarrage immédiat</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--gray-900)] py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-8 brightness-0 invert" />
            <div className="flex flex-wrap justify-center gap-6">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  {l.label}
                </a>
              ))}
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Connexion</Link>
              <Link to="/register" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Inscription</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-[var(--gray-700)] text-center">
            <p className="text-slate-600 text-sm">&copy; {new Date().getFullYear()} MukApps. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
