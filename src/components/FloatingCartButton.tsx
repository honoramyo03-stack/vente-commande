import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

const FloatingCartButton: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { getItemCount, getTotal } = useCart();

  const itemCount = getItemCount();
  const total = getTotal();

  const isSellerPage = location.pathname.startsWith('/seller');
  const isHiddenPage = location.pathname === '/' || isSellerPage;

  if (isHiddenPage || itemCount <= 0) return null;

  return (
    <button
      onClick={() => navigate('/cart')}
      className="fixed bottom-6 right-24 z-50 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all px-4 py-3 flex items-center gap-2"
      aria-label="Voir le panier"
      title="Suivre le processus de commande"
    >
      <ShoppingCart size={18} />
      <span className="text-sm font-semibold">{itemCount}</span>
      <span className="hidden sm:inline text-xs opacity-90">
        {new Intl.NumberFormat('fr-MG').format(total)} Ar
      </span>
    </button>
  );
};

export default FloatingCartButton;
