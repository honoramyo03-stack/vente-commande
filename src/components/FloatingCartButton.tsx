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
      className="fixed bottom-6 right-24 z-50 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all px-3.5 py-2.5 flex items-center gap-2 border border-slate-700"
      aria-label="Voir le panier"
      title="Suivre le processus de commande"
    >
      <ShoppingCart size={18} />
      <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded-full bg-amber-400 text-slate-900 text-xs font-extrabold px-1.5">
        {itemCount}
      </span>
      <span className="hidden sm:inline text-xs font-bold text-emerald-300">
        {new Intl.NumberFormat('fr-MG').format(total)} Ar
      </span>
    </button>
  );
};

export default FloatingCartButton;
