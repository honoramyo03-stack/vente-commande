import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, LogOut, User, Clock } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

const SellerHeader: React.FC = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [username, setUsername] = useState('Vendeur');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Récupérer le nom d'utilisateur
    const storedUsername = localStorage.getItem('sellerUsername');
    if (storedUsername) {
      setUsername(storedUsername);
    }

    return () => clearInterval(interval);
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-MG', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
    localStorage.removeItem('sellerLoggedIn');
    localStorage.removeItem('sellerUsername');
    notify('Déconnexion réussie', 'success');
    navigate('/seller/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      {/* Top bar avec date/heure */}
      <div className="bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2">
        <div className="container mx-auto flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Clock size={12} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{formatDate(currentTime)}</span>
            <span className="font-mono font-semibold">{formatTime(currentTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <User size={12} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Connecté: </span>
            <strong className="text-[9px] sm:text-xs">{username}</strong>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-indigo-600 text-white p-2 sm:p-2.5 rounded-xl shadow">
              <Store size={18} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">FastOrder & Pay</h1>
              <p className="text-xs sm:text-sm text-gray-500">Espace Vendeur</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 h-9 sm:h-10 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors text-xs sm:text-sm font-semibold"
          >
            <LogOut size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default SellerHeader;
