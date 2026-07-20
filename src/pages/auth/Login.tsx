import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useModules } from '@/core/store';
import { authApi } from '@/core/api/authApi';
import { subscriptionApi } from '@/core/api/subscriptionApi';
import { ROUTES } from '@/shared/constants/routes';
import { getDefaultRoute } from '@/lib/utils';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const validateForm = (email: string, password: string): string | null => {
  if (!email.trim()) return 'L\'email est requis';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Email invalide';
  if (!password) return 'Le mot de passe est requis';
  if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
  return null;
};


export default function Login() {
  const { setAuth } = useAuth();
  const { setActiveModules } = useModules();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const attemptCount = useRef(0);
  const lockedUntil = useRef<number | null>(null);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setForm(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Brute force protection
    if (lockedUntil.current && Date.now() < lockedUntil.current) {
      const remainingSeconds = Math.ceil((lockedUntil.current - Date.now()) / 1000);
      toast.error(`Trop de tentatives. Réessayez dans ${remainingSeconds}s.`);
      return;
    }

    const validationError = validateForm(form.email, form.password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);

      attemptCount.current = 0;
      lockedUntil.current = null;

      setAuth(res.user, res.token);

      if (rememberMe) {
        sessionStorage.setItem('rememberedEmail', form.email);
      } else {
        sessionStorage.removeItem('rememberedEmail');
      }

      const isAdmin = res.user.role === 'ADMIN' || res.user.role === 'SUPER_ADMIN';

      try {
        const modules = await subscriptionApi.getModules();
        const activeModules = modules.filter((m) => m.isActive);
        const activeModuleNames = activeModules.map((m) => m.moduleName);

        setActiveModules(activeModuleNames);

        if (activeModules.length === 0 && isAdmin) {
          toast.success(`Bienvenue ${res.user.firstName} !`);
          navigate('/dashboard');
          return;
        }

        if (activeModules.length === 0 && !isAdmin) {
          toast.error('Aucun module n\'est actif. Veuillez contacter votre administrateur.');
          setLoading(false);
          return;
        }

        toast.success(`Bienvenue, ${res.user.firstName} !`);
        navigate(getDefaultRoute(res.user.role));

      } catch (subErr) {
        setActiveModules([]);
        const errMsg = subErr instanceof Error ? subErr.message.toLowerCase() : '';
        const isSubscriptionError =
          errMsg.includes('expiré') ||
          errMsg.includes('expired') ||
          errMsg.includes('abonnement') ||
          errMsg.includes('subscription') ||
          errMsg.includes('actif');

        if (isSubscriptionError) {
          if (isAdmin) {
            toast.error('Votre abonnement est expiré. Veuillez le renouveler.');
            navigate('/subscription/renew');
          } else {
            navigate('/subscription-required');
          }
          return;
        }

        if (isAdmin) {
          navigate('/dashboard');
        } else {
          toast.error('Erreur de configuration. Veuillez contacter votre administrateur.');
        }
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message.toLowerCase() : '';
      const isSubscriptionError =
        errMsg.includes('expired') ||
        errMsg.includes('expiré') ||
        errMsg.includes('abonnement') ||
        errMsg.includes('subscription');

      if (isSubscriptionError) {
        // Try to re-use any existing stored session token so the admin can reach the renew page.
        // /auth/me is auth-only and should not be blocked by subscription status.
        try {
          const me = await authApi.me();
          const existingToken = localStorage.getItem('token') || '';
          setAuth(me, existingToken);
          const isAdmin = me.role === 'ADMIN' || me.role === 'SUPER_ADMIN';
          if (isAdmin) {
            toast.error('Votre abonnement est expiré. Veuillez le renouveler.');
            navigate('/subscription/renew');
          } else {
            navigate('/subscription-required');
          }
        } catch {
          // No valid session — navigate with default admin assumption so admin can renew
          navigate('/subscription-required', { state: { isAdmin: true } });
        }
        setLoading(false);
        return;
      }

      attemptCount.current += 1;
      if (attemptCount.current >= MAX_ATTEMPTS) {
        lockedUntil.current = Date.now() + LOCKOUT_DURATION_MS;
        attemptCount.current = 0;
        toast.error('Compte temporairement verrouillé. Réessayez dans 5 minutes.');
      } else {
        const remaining = MAX_ATTEMPTS - attemptCount.current;
        const errorMessage = err instanceof Error ? err.message : 'Identifiants incorrects';
        toast.error(`${errorMessage} (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`);
      }
    } finally {
      setLoading(false);
    }
  }, [form.email, form.password, rememberMe, setAuth, setActiveModules, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex">
      
      {/* Section gauche - Formulaire */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-sky-500 rounded-2xl shadow-lg mb-4">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              MukApps
            </h1>
            <p className="text-gray-500 text-sm mt-1">Solution de gestion d'entreprise</p>
          </div>


          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">
                Adresse email
              </label>
              <div className={`relative transition-all duration-200 ${
                focusedField === 'email' ? 'transform scale-[1.02]' : ''
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className={`transition-colors duration-200 ${
                    focusedField === 'email' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  type="email"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    focusedField === 'email'
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="votre@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 block">
                Mot de passe
              </label>
              <div className={`relative transition-all duration-200 ${
                focusedField === 'password' ? 'transform scale-[1.02]' : ''
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className={`transition-colors duration-200 ${
                    focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    focusedField === 'password'
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                  disabled={loading}
                />
                <span className="text-sm text-gray-600 select-none">
                  Se souvenir de moi
                </span>
              </label>
              
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Bouton de connexion */}
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Lien d'inscription */}
          <p className="mt-8 text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link 
              to={ROUTES.REGISTER} 
              className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
            >
              Créer un compte gratuitement
            </Link>
          </p>

      
        </div>
      </div>

      {/* Section droite - Hero / Branding */}
  

  
    </div>
  );
}