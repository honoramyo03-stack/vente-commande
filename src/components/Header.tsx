import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Store, User, LogOut, Clock, ShoppingCart, History, Calendar, Settings, Sun, Moon } from 'lucide-react';
import { useCustomer } from '../contexts/CustomerContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, logout, isLoggedIn } = useCustomer();
  const { items } = useCart();
  const { notify } = useNotification();
  const { toggleTheme, isDark } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mise à jour de l'heure chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-MG', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-MG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const handleLogout = () => {
    logout();
    notify('Déconnexion réussie', 'success');
    navigate('/');
  };

  const handleThemeToggle = () => {
    toggleTheme();
    notify(isDark ? 'Thème clair activé' : 'Thème sombre activé', 'info');
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Ne pas afficher le header sur la page de login
  if (location.pathname === '/') {
    return null;
  }

  return (
    <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-3 py-2.5">
        {/* Barre unique avec toutes les informations */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo + Nom de l'app */}
          <Link to="/menu" className="flex items-center gap-2 shrink-0">
            <div className="bg-white/20 backdrop-blur p-1.5 rounded-lg">
              <Store size={20} className="text-white" />
            </div>
            <span className="font-bold text-base hidden sm:block">FastOrder</span>
          </Link>

          {/* Info centrale: Client + Table + Heure */}
          {isLoggedIn && customer && (
            <div className="flex items-center gap-2 md:gap-3 text-sm flex-1 justify-center">
              {/* Nom du client */}
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                <User size={14} />
                <span className="font-medium truncate max-w-[80px] sm:max-w-none">{customer.name}</span>
              </div>
              
              {/* Numéro de table */}
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                <span className="text-white/80">Table</span>
                <span className="bg-white text-indigo-600 font-bold px-2 py-0.5 rounded-full text-xs">
                  {customer.tableNumber}
                </span>
              </div>

              {/* Date et Heure */}
              <div className="hidden md:flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                <Calendar size={14} />
                <span>{formatDate(currentTime)}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                <Clock size={14} />
                <span className="font-mono text-xs">{formatTime(currentTime)}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {/* Bouton thème */}
            <button
              onClick={handleThemeToggle}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 transition-colors border border-white/20"
              title={isDark ? 'Thème clair' : 'Thème sombre'}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link
              to="/menu"
              className="flex items-center gap-1.5 text-sm font-medium hover:bg-white/20 px-2.5 py-2 rounded-lg transition-colors"
              title="Menu"
            >
              <Home size={18} />
              <span className="hidden md:inline">Menu</span>
            </Link>

            <Link
              to="/cart"
              state={{ showHistory: true }}
              className="flex items-center gap-1.5 text-sm font-medium hover:bg-white/20 px-2.5 py-2 rounded-lg transition-colors"
              title="Historique"
            >
              <History size={18} />
              <span className="hidden md:inline">Historique</span>
            </Link>

            <Link
              to="/cart"
              className="relative flex items-center gap-1.5 text-sm font-medium bg-white/20 hover:bg-white/30 px-2.5 py-2 rounded-lg transition-colors"
              title="Panier"
            >
              <ShoppingCart size={18} />
              <span className="hidden md:inline">Panier</span>
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Lien vers espace vendeur */}
            <Link
              to="/seller/login"
              className="flex items-center gap-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 px-2.5 py-2 rounded-lg transition-colors border border-white/20"
              title="Espace Vendeur"
            >
              <Settings size={16} />
              <span className="hidden lg:inline">Vendeur</span>
            </Link>

            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm font-medium text-red-200 hover:text-white hover:bg-red-500/30 px-2.5 py-2 rounded-lg transition-colors"
                title="Quitter"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Quitter</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
