import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  // Extraire les catégories uniques des produits
  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtrer les produits actifs uniquement
  const activeProducts = products.filter(p => p.isActive);

  const filteredProducts =
    selectedCategory === 'Tous'
      ? activeProducts
      : activeProducts.filter((p) => p.category === selectedCategory);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
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

      {/* Categories / Navigation */}
      <div className="sticky top-[52px] bg-white z-20 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Banner / Info */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-indigo-800 text-sm mb-1">
            👋 Bienvenue {customer?.name} !
          </h2>
          <p className="text-indigo-600 text-xs">
            Sélectionnez vos produits et validez votre commande. Paiement rapide via Mobile Money.
          </p>
        </div>

        {/* Product Grid - Liste sur mobile, grille sur desktop */}
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm">
            Aucun produit disponible dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerHome;
