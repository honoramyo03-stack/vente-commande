import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutList, LayoutGrid } from 'lucide-react';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { useOrders } from '../contexts/OrdersContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useChat } from '../contexts/ChatContext';

const CustomerHome: React.FC = () => {
  const navigate = useNavigate();
  const { products } = useOrders();
  const { customer, isLoggedIn, isReady } = useCustomer();
  const { setCurrentTableNumber, setCurrentCustomerName } = useChat();
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('quickorder_viewmode');
    return (saved === 'grid' ? 'grid' : 'list') as 'list' | 'grid';
  });

  // Vérifier si le client est connecté
  useEffect(() => {
    if (!isReady) return;

    if (!isLoggedIn) {
      navigate('/', { replace: true });
    } else if (customer) {
      setCurrentTableNumber(customer.tableNumber);
      setCurrentCustomerName(customer.name);
    }
  }, [isReady, isLoggedIn, customer, navigate, setCurrentTableNumber, setCurrentCustomerName]);

  // Sauvegarder la préférence de vue
  useEffect(() => {
    localStorage.setItem('quickorder_viewmode', viewMode);
  }, [viewMode]);

  // Extraire les catégories uniques des produits
  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtrer les produits disponibles uniquement
  // Seul le bouton Actif/Inactif du vendeur contrôle l'affichage
  // La quantité est juste informative (stock disponible)
  const activeProducts = products.filter(p => p.isActive);

  const filteredProducts =
    selectedCategory === 'Tous'
      ? activeProducts
      : activeProducts.filter((p) => p.category === selectedCategory);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-base text-gray-500">
        Chargement de votre session...
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      {/* Categories + Toggle vue */}
      <div className="sticky top-[56px] bg-white z-20 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Catégories scrollables */}
          <div className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Bouton bascule liste/grille */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vue en liste"
            >
              <LayoutList size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Vue en grille"
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Banner / Info */}
      <div className="max-w-4xl mx-auto px-4 mt-5 sm:mt-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 sm:p-5 mb-5 sm:mb-6">
          <h2 className="font-semibold text-indigo-800 text-base sm:text-lg mb-1">
            👋 Bienvenue {customer?.name} !
          </h2>
          <p className="text-indigo-600 text-sm sm:text-base">
            Sélectionnez vos produits et validez votre commande. Paiement rapide via Mobile Money.
          </p>
        </div>

        {/* Nombre de produits */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-sm text-gray-500">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            {viewMode === 'list' ? (
              <><LayoutList size={14} /> Vue en liste</>
            ) : (
              <><LayoutGrid size={14} /> Vue en grille</>
            )}
          </p>
        </div>

        {/* Produits */}
        {viewMode === 'list' ? (
          // Vue en liste
          <div className="flex flex-col gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} viewMode="list" />
            ))}
          </div>
        ) : (
          // Vue en grille (colonnes)
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} viewMode="grid" />
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-base">
            Aucun produit disponible dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerHome;
