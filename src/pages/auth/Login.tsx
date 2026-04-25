import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useModules } from '@/core/store';
import { authApi } from '@/core/api/authApi';
import { subscriptionApi } from '@/core/api/subscriptionApi';
import { ROUTES } from '@/shared/constants/routes';

// Validation simple des champs
const validateForm = (email: string, password: string): string | null => {
  if (!email.trim()) return 'L\'email est requis';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email invalide';
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

  // Charger l'email sauvegardé au chargement
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setForm(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation avant envoi
    const validationError = validateForm(form.email, form.password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      setAuth(res.user, res.token);
      
      // Sauvegarder l'email si "remember me" est coché
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', form.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Récupération des modules actifs
      try {
        const modules = await subscriptionApi.getModules();
        const activeNames = modules.filter((m) => m.isActive).map((m) => m.moduleName);
        setActiveModules(activeNames);
      } catch (error) {
        console.warn('Erreur chargement modules:', error);
        setActiveModules([]);
      }
      
      toast.success(`Bienvenue, ${res.user.firstName} !`);
      navigate(ROUTES.DASHBOARD);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Identifiants incorrects';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [form.email, form.password, rememberMe, setAuth, setActiveModules, navigate]);

  return (
    <div>
      <h2 className="text-xl font-bold text-secondary-900 mb-1">Connexion</h2>
      <p className="text-secondary-500 text-sm mb-6">Connectez-vous à votre espace</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label className="label">Adresse email</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type="email"
              className="input pl-9"
              placeholder="votre@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="form-group">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Mot de passe</label>
            
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="input pl-9 pr-9"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Option "Se souvenir de moi" */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            disabled={loading}
          />
          <label htmlFor="rememberMe" className="text-sm text-secondary-600 cursor-pointer">
            Se souvenir de moi
          </label>
        </div>

        <button 
          type="submit" 
          className="btn-primary w-full justify-center mt-2 flex items-center justify-center gap-2" 
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connexion...
            </>
          ) : (
            'Se connecter'
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-secondary-500">
        Pas encore de compte ?{' '}
        <Link to={ROUTES.REGISTER} className="text-primary-600 font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}