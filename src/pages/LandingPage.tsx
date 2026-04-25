import { Link } from 'react-router-dom';
import { Store, Users, ShoppingCart, Lock, CircleCheck as CheckCircle, Zap, Shield, Building2, MessageCircle, ArrowRight, ChevronRight, Star, Phone, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

const modules = [
  {
    icon: <ShoppingCart size={28} className="text-primary-600" />,
    title: 'Magasin',
    description: 'Gérez vos produits, catégories, stocks, ventes et factures depuis un seul endroit.',
    features: ['Gestion des produits', 'Suivi des stocks', 'Point de vente', 'Factures & rapports'],
  },
  {
    icon: <Users size={28} className="text-accent-600" />,
    title: 'Clients',
    description: 'Centralisez vos clients, consultez leur historique et fidélisez votre clientèle.',
    features: ['Fiche client complète', 'Historique des achats', 'Gestion des dettes', 'Segmentation'],
  },
  {
    icon: <Lock size={28} className="text-warning-600" />,
    title: 'Utilisateurs',
    description: 'Contrôlez les accès de votre équipe avec des rôles et permissions précis.',
    features: ['Rôles & permissions', 'Multi-utilisateurs', 'Journal d\'activité', 'Sécurité avancée'],
  },
];

const steps = [
  { number: '01', title: 'Cliquez sur Commencer', desc: 'Accédez au formulaire d\'inscription en un clic.' },
  { number: '02', title: 'Créez un compte entreprise', desc: 'Renseignez les informations de votre entreprise.' },
  { number: '03', title: 'Connectez-vous', desc: 'Accédez à votre espace avec vos identifiants.' },
  { number: '04', title: 'Choisissez un module', desc: 'Sélectionnez les modules adaptés à vos besoins.' },
  { number: '05', title: 'Commencez à travailler', desc: 'Gérez votre activité efficacement dès maintenant.' },
];

const advantages = [
  {
    icon: <CheckCircle size={32} className="text-accent-500" />,
    title: 'Simple',
    desc: 'Interface claire et intuitive, aucune formation requise pour démarrer.',
  },
  {
    icon: <Zap size={32} className="text-warning-500" />,
    title: 'Rapide',
    desc: 'Temps de chargement minimal, actions instantanées pour gagner du temps.',
  },
  {
    icon: <Shield size={32} className="text-primary-500" />,
    title: 'Sécurisé',
    desc: 'Vos données sont protégées avec des contrôles d\'accès rigoureux.',
  },
  {
    icon: <Building2 size={32} className="text-error-500" />,
    title: 'Multi-entreprise',
    desc: 'Gérez plusieurs entreprises depuis un seul compte administrateur.',
  },
];

const testimonials = [
  {
    name: 'Marie Konan',
    role: 'Gérante, Beauty Shop',
    content: 'MukApps a révolutionné la gestion de ma boutique. Plus besoin de plusieurs logiciels, tout est centralisé !',
    rating: 5,
  },
  {
    name: 'Jean Dupont',
    role: 'Directeur, Tech Solutions',
    content: 'Le module client nous a permis de fidéliser notre clientèle. Interface simple et efficace.',
    rating: 5,
  },
   {
    name: 'Myriam',
    role: 'propriétaire, Mylpo Market',
    content: 'Le module magasin nous a permis de faire les inventaires et contrôles même en distance. Interface simple et efficace.',
    rating: 5,
  },
];

const pricing = [
  { name: 'Starter', price: '0$', features: ['1 utilisateur', 'Jusqu\'à 100 produits', 'Support email'], popular: false },
  { name: 'Pro', price: '10$', features: ['5 utilisateurs', 'Produits illimités', 'Support prioritaire', 'Export CSV'], popular: true },
  { name: 'Enterprise', price: '30$', features: ['Utilisateurs illimités', 'API dédiée', 'Support 24/7', 'Domaine personnalisé'], popular: false },
];

const contacts = [
  { phone: '+243820695401', display: '+243 820 695 401' },
  { phone: '+243991470040', display: '+243 991 470 040' },
];

export default function LandingPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Mettre à jour le titre de la page
  useEffect(() => {
    document.title = 'MukApps | Solution de gestion d\'entreprise tout-en-un';
    
    // Meta description (optionnel)
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Gérez votre magasin, vos clients et vos utilisateurs depuis une seule plateforme. Interface moderne, rapide et sécurisée.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-secondary-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-9" />
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors px-4 py-2"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-primary-950 via-primary-900 to-secondary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #10b981 0%, transparent 40%)' }} />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Zap size={14} />
            Plateforme de gestion d'entreprise tout-en-un
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            Gérez votre entreprise <br />
            <span className="text-primary-400">simplement</span> avec Mukapps
          </h1>
          <p className="text-secondary-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Magasin, clients, utilisateurs — tout ce dont vous avez besoin pour piloter votre activité, réuni en un seul outil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-primary-500/25 hover:scale-105"
            >
              Commencer gratuitement
              <ArrowRight size={18} />
            </Link>
            <a
              href="#apercu"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/20"
            >
              Voir la démo
            </a>
          </div>
        </div>
      </section>

      {/* Apercu Dashboard - AVEC VIDÉO (taille réduite) */}
      <section id="apercu" className="py-20 px-6 bg-secondary-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">Aperçu du tableau de bord</h2>
            <p className="text-secondary-500 text-lg">Une interface moderne et claire pour tout piloter d'un coup d'oeil.</p>
          </div>
          
          {/* Toggle entre Image et Vidéo */}
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setIsVideoPlaying(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !isVideoPlaying 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-secondary-200 text-secondary-600 hover:bg-secondary-300'
              }`}
            >
              Aperçu
            </button>
            <button
              onClick={() => setIsVideoPlaying(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isVideoPlaying 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-secondary-200 text-secondary-600 hover:bg-secondary-300'
              }`}
            >
              <Play size={14} />
              Vidéo démo
            </button>
          </div>

          {/* Contenu : Image ou Vidéo - taille réduite */}
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-secondary-200 bg-white max-w-3xl mx-auto">
            <div className="bg-secondary-800 px-4 py-2 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-error-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-warning-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-accent-500" />
              <div className="flex-1 mx-3">
                <div className="bg-secondary-700 rounded-md px-3 py-0.5 text-xs text-secondary-400 max-w-xs text-center">
                  {isVideoPlaying ? 'app.mukapps.com/demo/video' : 'app.mukapps.com/dashboard'}
                </div>
              </div>
            </div>
            
            {!isVideoPlaying ? (
              <img
                src="/dasbord_mukapps.jpeg"
                alt="Aperçu du tableau de bord MukApps avec statistiques et graphiques"
                className="w-full max-h-[400px] object-cover object-top"
                loading="lazy"
              />
            ) : (
              <div className="relative aspect-video max-h-[400px] bg-secondary-900">
                <video
                  src="/dasbord_mukapps_video.mp4"
                  poster="/dasbord_mukapps.jpeg"
                  className="w-full h-full object-cover"
                  controls
                  autoPlay={false}
                  loop
                  playsInline
                >
                  <source src="/dasbord_mukapps_video.mp4" type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture de vidéo.
                </video>
              </div>
            )}
          </div>

          {/* Légende */}
          <p className="text-center text-secondary-400 text-sm mt-4">
            {!isVideoPlaying 
              ? "Interface principale du tableau de bord - Vue d'ensemble" 
              : "Vidéo démonstrative du tableau de bord - Découvrez toutes les fonctionnalités"}
          </p>
        </div>
      </section>

      {/* Modules */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">Nos modules</h2>
            <p className="text-secondary-500 text-lg">Des outils puissants adaptés à chaque aspect de votre activité.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="bg-secondary-50 rounded-2xl p-8 border border-secondary-100 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-5 border border-secondary-100">
                  {mod.icon}
                </div>
                <h3 className="text-xl font-bold text-secondary-900 mb-3">{mod.title}</h3>
                <p className="text-secondary-500 text-sm mb-5 leading-relaxed">{mod.description}</p>
                <ul className="space-y-2">
                  {mod.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-secondary-600">
                      <ChevronRight size={14} className="text-primary-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ca marche */}
      <section className="py-20 px-6 bg-secondary-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-primary-600/20 border border-primary-500/30 text-primary-300 text-sm font-medium px-4 py-2 rounded-full mb-4">
              <Zap size={14} />
              Simple et rapide
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Comment ca marche ?</h2>
            <p className="text-secondary-400 text-lg">Soyez operationnel en quelques minutes.</p>
          </div>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="flex items-start gap-6 bg-secondary-800/60 border border-secondary-700 rounded-2xl p-6 hover:bg-secondary-800 transition-colors"
              >
                <div className="flex-shrink-0 w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center font-bold text-white text-sm">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">{step.title}</h3>
                  <p className="text-secondary-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-shrink-0 self-center">
                    <ChevronRight size={20} className="text-secondary-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-20 px-6 bg-secondary-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">Ils nous font confiance</h2>
            <p className="text-secondary-500 text-lg">Rejoignez des centaines d'entreprises satisfaites</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-card border border-secondary-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-secondary-900">{t.name}</h4>
                    <p className="text-xs text-secondary-500">{t.role}</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={16} className="fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-secondary-600 text-sm leading-relaxed">"{t.content}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prix */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">Des offres pour tous les besoins</h2>
            <p className="text-secondary-500 text-lg">Choisissez le plan adapté à votre activité</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border-2 transition-all hover:-translate-y-1 hover:shadow-xl ${
                  plan.popular ? 'border-primary-500 shadow-lg bg-gradient-to-b from-white to-primary-50' : 'border-secondary-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Populaire
                  </div>
                )}
                <h3 className="text-xl font-bold text-secondary-900 mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-secondary-900 mb-4">
                  {plan.price}
                  {plan.price !== '0€' && <span className="text-sm font-normal text-secondary-500">/mois</span>}
                </p>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-secondary-600">
                      <CheckCircle size={14} className="text-accent-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`block text-center py-3 rounded-xl font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  Commencer
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">Pourquoi choisir MukApps ?</h2>
            <p className="text-secondary-500 text-lg">Concu pour les entreprises qui veulent aller vite et bien.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((adv) => (
              <div
                key={adv.title}
                className="text-center p-8 rounded-2xl bg-secondary-50 border border-secondary-100 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
              >
                <div className="flex justify-center mb-4">{adv.icon}</div>
                <h3 className="text-lg font-bold text-secondary-900 mb-2">{adv.title}</h3>
                <p className="text-secondary-500 text-sm leading-relaxed">{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact WhatsApp */}
      <section className="py-16 px-6 bg-accent-50 border-y border-accent-100">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <MessageCircle size={36} className="text-accent-600" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">Besoin d'aide ? Contactez-nous</h2>
          <p className="text-secondary-500 mb-8">Notre equipe est disponible sur WhatsApp pour repondre a vos questions.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {contacts.map((c) => (
              <a
                key={c.phone}
                href={`https://wa.me/${c.phone.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-accent-600 hover:bg-accent-700 text-white font-semibold px-7 py-4 rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-105"
              >
                <MessageCircle size={20} />
                {c.display}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary-900 to-secondary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #3b82f6 0%, transparent 60%)' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Pret a transformer votre <br />
            <span className="text-primary-400">gestion d'entreprise</span> ?
          </h2>
          <p className="text-secondary-300 text-lg mb-10">
            Rejoignez les entreprises qui font confiance a MukApps pour leur gestion quotidienne.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-primary-500 hover:bg-primary-400 text-white font-bold px-10 py-5 rounded-2xl transition-all shadow-xl hover:shadow-primary-500/30 hover:scale-105 text-lg"
          >
            Creer mon compte maintenant
            <ArrowRight size={22} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-950 py-8 px-6 text-center">
        <div className="flex items-center justify-center mb-3">
          <img src="/LOGO_Mukapps2.png" alt="MukApps" className="h-8 brightness-0 invert" />
        </div>
        <p className="text-secondary-500 text-sm">
          &copy; {new Date().getFullYear()} MukApps. Tous droits reserves.
        </p>
      </footer>
    </div>
  );
}