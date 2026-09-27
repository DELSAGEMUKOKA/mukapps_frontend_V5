import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, Eye, EyeOff, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, useModules } from '@/core/store';
import { authApi } from '@/core/api/authApi';
import { subscriptionApi } from '@/core/api/subscriptionApi';
import { ROUTES } from '@/shared/constants/routes';

// Validation des champs
const validateForm = (form: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
}): string | null => {
  if (!form.firstName.trim()) return 'Le prénom est requis';
  if (!form.lastName.trim()) return 'Le nom est requis';
  if (!form.companyName.trim()) return 'Le nom de l\'entreprise est requis';
  if (!form.email.trim()) return 'L\'email est requis';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email invalide';
  if (!form.password) return 'Le mot de passe est requis';
  if (form.password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
  return null;
};

export default function Register() {
  const { setAuth } = useAuth();
  const { setActiveModules } = useModules();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    companyName: false,
  });
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    companyName: '',
    phone: '',
  });

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleBlur = (key: keyof typeof touched) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const getFieldError = (key: keyof typeof form): string | null => {
    if (!touched[key]) return null;
    switch (key) {
      case 'firstName':
        return !form.firstName.trim() ? 'Prénom requis' : null;
      case 'lastName':
        return !form.lastName.trim() ? 'Nom requis' : null;
      case 'companyName':
        return !form.companyName.trim() ? 'Nom de l\'entreprise requis' : null;
      case 'email':
        if (!form.email.trim()) return 'Email requis';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email invalide';
        return null;
      case 'password':
        if (!form.password) return 'Mot de passe requis';
        if (form.password.length < 6) return 'Minimum 6 caractères';
        return null;
      default:
        return null;
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Marquer tous les champs comme touchés
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      companyName: true,
    });
    
    // Validation avant envoi
    const validationError = validateForm(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register(form);
      
      // Stocker le refresh token si présent
      if (res.refreshToken) {
        localStorage.setItem('refresh_token', res.refreshToken);
      }
      
      setAuth(res.user, res.token);
      
      // ✅ VÉRIFICATION DES MODULES ACTIFS APRÈS INSCRIPTION
      try {
        const modules = await subscriptionApi.getModules();
        const activeModules = modules.filter((m) => m.isActive);
        const activeModuleNames = activeModules.map((m) => m.moduleName);
        
        setActiveModules(activeModuleNames);
        
        // ✅ Vérifier si l'utilisateur est ADMIN ou SUPER_ADMIN
        const isAdmin = res.user.role === 'ADMIN' || res.user.role === 'SUPER_ADMIN';
        
        // ✅ Si aucun module n'est actif et que l'utilisateur est admin
        if (activeModules.length === 0 && isAdmin) {
          toast.success(`Bienvenue ${res.user.firstName} ! Veuillez activer vos modules pour continuer.`);
          navigate('/dashboard'); // ← Redirection vers la page de configuration des modules
          return;
        }
        
        // ✅ Si aucun module n'est actif mais l'utilisateur n'est pas admin
        if (activeModules.length === 0 && !isAdmin) {
          toast.error('Aucun module n\'est actif. Veuillez contacter votre administrateur.');
          // Déconnexion car l'utilisateur ne peut rien faire
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          setLoading(false);
          return;
        }
        
        toast.success('Compte créé avec succès !');
        navigate(ROUTES.DASHBOARD);
        
      } catch (error) {
        console.warn('Erreur chargement modules:', error);
        setActiveModules([]);
        
        const isAdmin = res.user.role === 'ADMIN' || res.user.role === 'SUPER_ADMIN';
        if (isAdmin) {
          navigate('/dashboard');
        } else {
          toast.error('Erreur de configuration. Veuillez contacter votre administrateur.');
        }
      }
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [form, setAuth, setActiveModules, navigate]);

  const isFormValid = () => {
    return form.firstName.trim() && 
           form.lastName.trim() && 
           form.companyName.trim() && 
           form.email.trim() && 
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && 
           form.password.length >= 6;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-secondary-900 mb-1">Créer un compte</h2>
      <p className="text-secondary-500 text-sm mb-6">Rejoignez MukApps aujourd'hui</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="form-group">
            <label className="label">Prénom *</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
              <input 
                className={`input pl-9 ${getFieldError('firstName') ? 'border-red-500 focus:ring-red-500' : ''}`} 
                placeholder="Prénom" 
                value={form.firstName} 
                onChange={setField('firstName')}
                onBlur={handleBlur('firstName')}
                required 
                disabled={loading}
                autoComplete="given-name"
              />
            </div>
            {getFieldError('firstName') && (
              <p className="text-xs text-red-500 mt-1">{getFieldError('firstName')}</p>
            )}
          </div>
          <div className="form-group">
            <label className="label">Nom *</label>
            <input 
              className={`input ${getFieldError('lastName') ? 'border-red-500 focus:ring-red-500' : ''}`} 
              placeholder="Nom" 
              value={form.lastName} 
              onChange={setField('lastName')}
              onBlur={handleBlur('lastName')}
              required 
              disabled={loading}
              autoComplete="family-name"
            />
            {getFieldError('lastName') && (
              <p className="text-xs text-red-500 mt-1">{getFieldError('lastName')}</p>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="label">Entreprise *</label>
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              className={`input pl-9 ${getFieldError('companyName') ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Nom de votre entreprise"
              value={form.companyName}
              onChange={setField('companyName')}
              onBlur={handleBlur('companyName')}
              required
              disabled={loading}
              autoComplete="organization"
            />
          </div>
          {getFieldError('companyName') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('companyName')}</p>
          )}
        </div>

        <div className="form-group">
          <label className="label">Téléphone <span className="text-secondary-400 font-normal">(optionnel)</span></label>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type="tel"
              className="input pl-9"
              placeholder="+243 000 000 000"
              value={form.phone}
              onChange={setField('phone')}
              disabled={loading}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Email *</label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input 
              type="email" 
              className={`input pl-9 ${getFieldError('email') ? 'border-red-500 focus:ring-red-500' : ''}`} 
              placeholder="votre@email.com" 
              value={form.email} 
              onChange={setField('email')}
              onBlur={handleBlur('email')}
              required 
              disabled={loading}
              autoComplete="email"
            />
          </div>
          {getFieldError('email') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('email')}</p>
          )}
        </div>

        <div className="form-group">
          <label className="label">Mot de passe *</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              className={`input pl-9 pr-9 ${getFieldError('password') ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Min. 6 caractères"
              value={form.password}
              onChange={setField('password')}
              onBlur={handleBlur('password')}
              required
              minLength={6}
              disabled={loading}
              autoComplete="new-password"
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
          {getFieldError('password') && (
            <p className="text-xs text-red-500 mt-1">{getFieldError('password')}</p>
          )}
          {!getFieldError('password') && form.password.length > 0 && (
            <p className="text-xs text-green-500 mt-1">✓ Mot de passe valide</p>
          )}
        </div>

        <button 
          type="submit" 
          className="btn-primary w-full justify-center mt-2 flex items-center justify-center gap-2" 
          disabled={loading || !isFormValid()}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Création...
            </>
          ) : (
            'Créer mon compte'
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-secondary-500">
        Déjà un compte ?{' '}
        <Link to={ROUTES.LOGIN} className="text-primary-600 font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}