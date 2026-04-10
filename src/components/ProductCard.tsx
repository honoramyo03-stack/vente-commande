import React, { useState } from 'react';
import { Plus, Minus, Package, ImageOff, Check, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { Product } from '../contexts/OrdersContext';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, removeFromCart, updateQuantity, getProductQuantity } = useCart();
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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

  const handleAddToCart = () => {
    if (product.quantity !== undefined && product.quantity <= 0) {
      toast.error('Produit épuisé');
      return;
    }
    if (reachedStockLimit) {
      toast.error('Stock maximum atteint');
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
      toast.error('Stock maximum atteint');
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

  return (
    <>
      {/* ===== MOBILE: Liste horizontale avec contrôles panier ===== */}
      <div className={`sm:hidden flex items-stretch bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isOutOfStock ? 'opacity-60 grayscale' : ''} ${isInCart ? 'border-indigo-300 bg-indigo-50/30' : ''}`}>
        {/* Image miniature */}
        <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {!imageError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
              <ImageOff size={16} className="text-indigo-300" />
            </div>
          )}
          {/* Badge stock */}
          {product.quantity !== undefined && (
            <div className={`absolute top-0 right-0 text-[7px] font-bold w-4 h-4 flex items-center justify-center rounded-bl-lg ${
              isOutOfStock
                ? 'bg-red-500 text-white'
                : isLowStock
                  ? 'bg-amber-400 text-amber-900'
                  : 'bg-green-500 text-white'
            }`}>
              {product.quantity}
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-[6px] text-white font-bold">ÉPUISÉ</span>
            </div>
          )}
        </div>

        {/* Infos produit */}
        <div className="flex-1 min-w-0 p-2 flex flex-col justify-between">
          {/* Nom et catégorie */}
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-gray-900 text-[11px] leading-tight truncate flex-1">
                {product.name}
              </h3>
              <span className={`${categoryColor} text-[7px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0`}>
                {product.category}
              </span>
            </div>
            <p className="text-[9px] text-gray-400 truncate mt-0.5">
              {product.description}
            </p>
            {/* Stock dispo */}
            {product.quantity !== undefined && !isOutOfStock && (
              <p className="text-[8px] text-gray-400 mt-0.5">
                Stock: <span className="font-semibold text-gray-500">{product.quantity}</span>
              </p>
            )}
          </div>

          {/* Prix + Contrôle panier */}
          <div className="flex items-center justify-between mt-1">
            {/* Prix unitaire */}
            <div className="flex flex-col">
              <span className="font-extrabold text-indigo-600 text-[11px]">
                {formatPrice(product.price)}
              </span>
              {isInCart && (
                <span className="text-[8px] text-indigo-400 font-semibold">
                  Total: {formatPrice(subtotal)}
                </span>
              )}
            </div>

            {/* Contrôle panier */}
            {!isOutOfStock && !isInCart && (
              <button
                onClick={handleAddToCart}
                disabled={isAdding || reachedStockLimit}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-lg font-semibold text-[9px] transition-all ${
                  isAdding
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-600 text-white active:bg-indigo-700'
                }`}
              >
                {isAdding ? (
                  <>
                    <Check size={10} className="animate-bounce" />
                    <span>OK!</span>
                  </>
                ) : (
                  <>
                    <Plus size={10} />
                    <span>Ajouter</span>
                  </>
                )}
              </button>
            )}

            {isInCart && !isOutOfStock && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDecrease}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-100 text-red-600 active:bg-red-200 transition-colors"
                >
                  <Minus size={10} />
                </button>
                <div className="flex flex-col items-center min-w-[24px]">
                  <span className="text-[11px] font-extrabold text-indigo-700">{cartQuantity}</span>
                </div>
                <button
                  onClick={handleIncrease}
                  disabled={reachedStockLimit}
                  className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                    reachedStockLimit
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-100 text-green-600 active:bg-green-200'
                  }`}
                >
                  <Plus size={10} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== DESKTOP: Carte verticale avec contrôles panier ===== */}
      <div className={`hidden sm:block bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${isOutOfStock ? 'opacity-60 grayscale' : ''} ${isInCart ? 'border-indigo-300 ring-2 ring-indigo-100' : ''}`}>
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {!imageError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100">
              <div className="bg-white/80 backdrop-blur p-4 rounded-2xl shadow-sm">
                <ImageOff size={32} className="text-indigo-300" />
              </div>
              <span className="text-xs text-indigo-400 mt-2 font-medium">{product.category}</span>
            </div>
          )}

          {/* Badge Catégorie */}
          <div className={`absolute top-3 left-3 ${categoryColor} backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full shadow-sm`}>
            {product.category}
          </div>

          {/* Badge Stock */}
          {product.quantity !== undefined && (
            <div className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm ${
              isOutOfStock
                ? 'bg-red-500 text-white'
                : isLowStock
                  ? 'bg-amber-400 text-amber-900'
                  : 'bg-green-500 text-white'
            }`}>
              <Package size={12} />
              {isOutOfStock ? 'Épuisé' : `${product.quantity} dispo`}
            </div>
          )}

          {/* Badge dans le panier */}
          {isInCart && (
            <div className="absolute bottom-3 right-3 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <ShoppingCart size={12} />
              ×{cartQuantity}
            </div>
          )}

          {/* Overlay pour produit épuisé */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg transform -rotate-12 shadow-lg">
                ÉPUISÉ
              </span>
            </div>
          )}
        </div>

        {/* Content Desktop */}
        <div className="p-4">
          <h3 className="font-bold text-gray-900 text-base mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 mb-3 line-clamp-2 min-h-[2.5rem]">
            {product.description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-extrabold text-indigo-600 text-lg">
                {formatPrice(product.price)}
              </span>
              {isInCart && (
                <span className="text-[11px] text-indigo-400 font-semibold">
                  Sous-total: {formatPrice(subtotal)}
                </span>
              )}
              {product.quantity !== undefined && !isOutOfStock && !isInCart && (
                <span className="text-[10px] text-gray-400">
                  Stock: {product.quantity}
                </span>
              )}
            </div>

            {/* Bouton Ajouter ou Contrôles +/- */}
            {!isInCart ? (
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAdding || reachedStockLimit}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all transform active:scale-95 ${
                  isOutOfStock || reachedStockLimit
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isAdding
                      ? 'bg-green-500 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isAdding ? (
                  <>
                    <Check size={16} className="animate-bounce" />
                    <span>Ajouté!</span>
                  </>
                ) : reachedStockLimit ? (
                  <>
                    <Package size={16} />
                    <span>Max</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Ajouter</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDecrease}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors active:scale-90"
                >
                  <Minus size={16} />
                </button>
                <span className="text-lg font-extrabold text-indigo-700 min-w-[28px] text-center">
                  {cartQuantity}
                </span>
                <button
                  onClick={handleIncrease}
                  disabled={reachedStockLimit}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors active:scale-90 ${
                    reachedStockLimit
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductCard;
