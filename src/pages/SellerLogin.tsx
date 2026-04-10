import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, User, ShieldCheck } from 'lucide-react';
import { useOrders } from '../contexts/OrdersContext';
import { useNotification } from '../contexts/NotificationContext';

const SellerLogin: React.FC = () => {
  const navigate = useNavigate();
  const { sellerAccounts } = useOrders();
  const { notify } = useNotification();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Si déjà connecté, rediriger vers le dashboard
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('sellerLoggedIn');
    if (isLoggedIn === 'true') {
      navigate('/seller/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      notify('Veuillez remplir tous les champs', 'error');
      return;
    }

    setIsLoading(true);

    // Vérifier les identifiants contre les comptes enregistrés
    setTimeout(() => {
      const account = sellerAccounts.find(
        acc => acc.username === username && acc.password === password
      );

      if (account) {
        notify('Connexion réussie !', 'success');
        localStorage.setItem('sellerLoggedIn', 'true');
        localStorage.setItem('sellerUsername', username);
        localStorage.setItem('sellerRole', account.role);
        navigate('/seller/dashboard');
      } else {
        notify('Identifiants incorrects', 'error');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl mb-4 shadow-lg">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Espace Vendeur</h1>
            <p className="text-gray-500 mt-2 text-sm">Connectez-vous pour gérer les commandes</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                <User className="inline mr-2" size={16} />
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Entrez votre nom d'utilisateur"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm">
                <Lock className="inline mr-2" size={16} />
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-gray-600 text-sm">Se souvenir de moi</span>
              </label>
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                onClick={() => notify('Contactez l\'administrateur pour réinitialiser votre mot de passe', 'info')}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <h3 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">
              <Store size={16} className="text-indigo-600" />
              Identifiants de démonstration
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Utilisateur : <code className="bg-white px-2 py-0.5 rounded font-mono text-indigo-600">admin</code></p>
              <p>Mot de passe : <code className="bg-white px-2 py-0.5 rounded font-mono text-indigo-600">password</code></p>
            </div>
          </div>

          {/* Back to Customer */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              ← Retour à l'espace client
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
            <Lock size={12} />
            Accès sécurisé - Réservé au personnel autorisé
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerLogin;
