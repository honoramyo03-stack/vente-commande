import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Package, ImageOff, Check, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { Product } from '../contexts/OrdersContext';
import { useNotification } from '../contexts/NotificationContext';

interface ProductCardProps {
  product: Product;
  viewMode?: 'list' | 'grid';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode = 'list' }) => {
  const { addToCart, removeFromCart, updateQuantity, getProductQuantity } = useCart();
  const { notify } = useNotification();
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [animateSubtotal, setAnimateSubtotal] = useState(false);
  const prevQuantityRef = useRef(0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const cartQuantity = getProductQuantity(product.id);
  const isInCart = cartQuantity > 0;
  const reachedStockLimit = product.quantity !== undefined && cartQuantity >= product.quantity;

  // Animation du sous-total quand la quantité change
  useEffect(() => {
    if (prevQuantityRef.current !== cartQuantity && cartQuantity > 0) {
      setAnimateSubtotal(true);
      const timer = setTimeout(() => setAnimateSubtotal(false), 400);
      return () => clearTimeout(timer);
    }
    prevQuantityRef.current = cartQuantity;
  }, [cartQuantity]);

  const handleAddToCart = () => {
    if (product.quantity !== undefined && product.quantity <= 0) {
      notify('Produit épuisé', 'error');
      return;
    }
    if (reachedStockLimit) {
      notify('Stock maximum atteint', 'error');
      return;
    }
    setIsAdding(true);
    addToCart({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      quantity: product.quantity,
      isActive: product.isActive,
    });
    setTimeout(() => setIsAdding(false), 600);
  };

  const handleIncrease = () => {
    if (reachedStockLimit) {
      notify('Stock maximum atteint', 'error');
      return;
    }
    updateQuantity(product.id, cartQuantity + 1, product.quantity);
  };

  const handleDecrease = () => {
    if (cartQuantity <= 1) {
      removeFromCart(product.id);
    } else {
      updateQuantity(product.id, cartQuantity - 1);
    }
  };

  const isOutOfStock = product.quantity !== undefined && product.quantity <= 0;
  const isLowStock = product.quantity !== undefined && product.quantity > 0 && product.quantity <= 5;

  const categoryColors: Record<string, string> = {
    'Entrées': 'bg-emerald-100 text-emerald-700',
    'Plats': 'bg-orange-100 text-orange-700',
    'Desserts': 'bg-pink-100 text-pink-700',
    'Boissons': 'bg-blue-100 text-blue-700',
    'Snacks': 'bg-amber-100 text-amber-700',
    'Pizzas': 'bg-red-100 text-red-700',
    'Burgers': 'bg-yellow-100 text-yellow-700',
    'Salades': 'bg-green-100 text-green-700',
  };
  const categoryColor = categoryColors[product.category] || 'bg-gray-100 text-gray-700';

  const subtotal = product.price * cartQuantity;

  // ===== MODE GRILLE (COLONNE) =====
  if (viewMode === 'grid') {
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md flex flex-col ${
          isOutOfStock
            ? 'opacity-60 grayscale border-gray-200'
            : isInCart
              ? 'border-indigo-300 ring-2 ring-indigo-200'
              : 'border-gray-100'
        }`}
      >
        {/* Image */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
          {!imageError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
              <ImageOff size={32} className="text-indigo-300" />
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className={`${categoryColor} text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`}>
              {product.category}
            </span>
          </div>

          {product.quantity !== undefined && (
            <div
              className={`absolute top-2 right-2 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm ${
                isOutOfStock
                  ? 'bg-red-500 text-white'
                  : isLowStock
                    ? 'bg-amber-400 text-amber-900'
                    : 'bg-green-500 text-white'
              }`}
            >
              <Package size={10} />
              {product.quantity}
            </div>
          )}

          {isInCart && (
            <div className="absolute bottom-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
              🛒 ×{cartQuantity}
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-xs text-white font-bold bg-red-600 px-3 py-1 rounded">
                ÉPUISÉ
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-1.5 sm:gap-2">
          <div>
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-tight line-clamp-1">
              {product.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1 mt-0.5">
              {product.description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-col">
              <span className="font-extrabold text-indigo-600 text-xs sm:text-sm">
                {formatPrice(product.price)}
              </span>
              {isInCart && (
                <span className={`text-[8px] sm:text-[10px] text-indigo-400 font-semibold ${animateSubtotal ? 'animate-pulse' : ''}`}>
                  Total: {formatPrice(subtotal)}
                </span>
              )}
            </div>

            {!isOutOfStock && !isInCart && (
              <button
                onClick={handleAddToCart}
                disabled={isAdding || reachedStockLimit}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-[10px] sm:text-xs transition-all ${
                  isAdding
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-600 text-white active:bg-indigo-700 hover:bg-indigo-700'
                }`}
              >
                {isAdding ? (
                  <><Check size={12} className="animate-bounce" /><span>OK!</span></>
                ) : (
                  <><Plus size={12} /><span>Ajouter</span></>
                )}
              </button>
            )}

            {isInCart && !isOutOfStock && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDecrease}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-red-600 active:bg-red-200"
                >
                  <Minus size={12} />
                </button>
                <span className="text-xs font-extrabold text-indigo-700 min-w-[20px] text-center">
                  {cartQuantity}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={reachedStockLimit}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                    reachedStockLimit
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-100 text-green-600 active:bg-green-200'
                  }`}
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== MODE LISTE (défaut) =====
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
        isOutOfStock
          ? 'opacity-60 grayscale border-gray-200'
          : isInCart
            ? 'border-indigo-400 shadow-indigo-100'
            : 'border-gray-100 hover:shadow-md'
      }`}
    >
      {/* Ligne principale : image + infos */}
      <div className="flex items-stretch">
        {/* Image */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {!imageError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
              <ImageOff size={18} className="text-indigo-300" />
            </div>
          )}

          {product.quantity !== undefined && (
            <div
              className={`absolute top-0 right-0 text-[7px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg flex items-center gap-0.5 ${
                isOutOfStock
                  ? 'bg-red-500 text-white'
                  : isLowStock
                    ? 'bg-amber-400 text-amber-900'
                    : 'bg-green-500 text-white'
              }`}
            >
              <Package size={8} className="hidden sm:inline" />
              {product.quantity}
            </div>
          )}

          {/* Badge panier sur l'image */}
          {isInCart && (
            <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 text-white text-center">
              <span className="text-[8px] sm:text-[10px] font-bold flex items-center justify-center gap-0.5 py-0.5">
                <ShoppingCart size={9} />
                ×{cartQuantity}
              </span>
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-[7px] sm:text-[9px] text-white font-bold bg-red-600 px-2 py-1 rounded">
                ÉPUISÉ
              </span>
            </div>
          )}
        </div>

        {/* Infos produit */}
        <div className="flex-1 min-w-0 p-2 sm:p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 sm:gap-2">
              <h3 className="font-bold text-gray-900 text-[11px] sm:text-sm md:text-base leading-tight truncate flex-1">
                {product.name}
              </h3>
              <span
                className={`${categoryColor} text-[7px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0`}
              >
                {product.category}
              </span>
            </div>

            <p className="text-[9px] sm:text-xs md:text-sm text-gray-400 truncate mt-0.5">
              {product.description}
            </p>
          </div>

          {/* Prix + Bouton ajouter (si pas dans le panier) */}
          <div className="flex items-center justify-between mt-1.5 sm:mt-2">
            <span className="font-extrabold text-indigo-600 text-[12px] sm:text-sm md:text-base">
              {formatPrice(product.price)}
            </span>

            {!isOutOfStock && !isInCart && (
              <button
                onClick={handleAddToCart}
                disabled={isAdding || reachedStockLimit}
                className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg font-semibold text-[10px] sm:text-xs transition-all ${
                  isAdding
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-600 text-white active:bg-indigo-700 hover:bg-indigo-700'
                }`}
              >
                {isAdding ? (
                  <><Check size={12} className="animate-bounce" /><span>OK!</span></>
                ) : (
                  <><Plus size={12} /><span>Ajouter</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barre sous-total + contrôles (visible uniquement si dans le panier) */}
      {isInCart && !isOutOfStock && (
        <div className={`border-t border-indigo-100 bg-indigo-50/50 px-3 py-2 sm:px-4 sm:py-2.5 transition-all ${animateSubtotal ? 'bg-indigo-100/70' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            {/* Contrôles quantité */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleDecrease}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 active:bg-red-200 hover:bg-red-200 transition-colors"
              >
                <Minus size={13} />
              </button>
              <span className="text-[13px] sm:text-base font-extrabold text-indigo-700 min-w-[24px] text-center">
                {cartQuantity}
              </span>
              <button
                onClick={handleIncrease}
                disabled={reachedStockLimit}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg transition-colors ${
                  reachedStockLimit
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-100 text-green-600 active:bg-green-200 hover:bg-green-200'
                }`}
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Sous-total */}
            <div className={`flex items-center gap-1.5 transition-all ${animateSubtotal ? 'scale-105' : ''}`}>
              <span className="text-[9px] sm:text-[11px] text-gray-500">Sous-total:</span>
              <span className={`font-extrabold text-[13px] sm:text-base ${animateSubtotal ? 'text-green-600' : 'text-indigo-700'}`}>
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>

          {/* Détail du calcul (visible si quantité > 1) */}
          {cartQuantity > 1 && (
            <p className="text-[8px] sm:text-[10px] text-gray-400 mt-1 text-right">
              {cartQuantity} × {formatPrice(product.price)} = {formatPrice(subtotal)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
