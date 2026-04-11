import React from 'react';
import { useLocation } from 'react-router-dom';
import { Database, DatabaseZap } from 'lucide-react';
import { useOrders } from '../contexts/OrdersContext';
import { useChat } from '../contexts/ChatContext';

const DatabaseStatusBadge: React.FC = () => {
  const location = useLocation();
  const { isOnline: ordersOnline } = useOrders();
  const { isOnline: chatOnline } = useChat();

  const isSellerPage = location.pathname.startsWith('/seller');
  const isLoginPage = location.pathname === '/';

  // On la cache sur la page d'accueil pour ne pas polluer le login.
  if (isLoginPage) return null;

  const isOnline = isSellerPage ? ordersOnline : ordersOnline && chatOnline;

  return (
    <div className="fixed top-20 right-3 z-50">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md border ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}
      >
        {isOnline ? <Database size={14} /> : <DatabaseZap size={14} />}
        {isOnline ? 'Connecte a la base' : 'Base indisponible'}
      </div>
    </div>
  );
};

export default DatabaseStatusBadge;
