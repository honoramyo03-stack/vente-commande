import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, History, Package } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrdersContext';
import { useCustomer } from '../contexts/CustomerContext';
import Header from '../components/Header';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const { orders, products } = useOrders();
  const { customer, isLoggedIn, isReady } = useCustomer();
  const [activeTab, setActiveTab] = useState<'cart' | 'history'>('cart');

  // Vérifier si le client est connecté
  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [isReady, isLoggedIn, navigate]);

  // Gérer l'affichage de l'historique via le state
  useEffect(() => {
    if (location.state?.showHistory) {
      setActiveTab('history');
    }
  }, [location.state]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-MG', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; class: string }> = {
      pending: { text: 'En attente', class: 'bg-yellow-100 text-yellow-800' },
      paid: { text: 'Payée', class: 'bg-blue-100 text-blue-800' },
      preparing: { text: 'En préparation', class: 'bg-purple-100 text-purple-800' },
      ready: { text: 'Prête', class: 'bg-green-100 text-green-800' },
      completed: { text: 'Terminée', class: 'bg-gray-100 text-gray-800' },
      cancelled: { text: 'Annulée', class: 'bg-red-100 text-red-800' },
    };
    return labels[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
  };

  const getAvailableStock = (productId: string) => {
    return products.find((product) => product.id === productId)?.quantity;
  };

  // Obtenir UNIQUEMENT les commandes de ce client (nom + table)
  const allMyOrders = customer 
    ? orders
        .filter(o => o.customerName === customer.name && o.tableNumber === customer.tableNumber)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <Link
            to="/menu"
            className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-sm"
          >
            <ArrowLeft size={18} />
            <span>Retour au menu</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'cart'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ShoppingBag size={16} />
            Panier ({items.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <History size={16} />
            Historique ({allMyOrders.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche - Panier ou Historique */}
          <div>
            {activeTab === 'cart' ? (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag className="text-indigo-600" size={24} />
                  Votre panier
                </h1>

                {items.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Panier vide</h2>
                    <p className="text-gray-500 text-sm mb-4">
                      Ajoutez des produits depuis le menu pour commencer.
                    </p>
                    <Link
                      to="/menu"
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      Voir le menu
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const availableStock = getAvailableStock(item.product.id);
                      const hasStockLimit = availableStock !== undefined;
                      const maxReached = hasStockLimit && item.quantity >= availableStock;
                      const stockExceeded = hasStockLimit && item.quantity > availableStock;

                      return (
                        <div
                          key={item.product.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4"
                        >
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm">{item.product.name}</h3>
                            <p className="text-xs text-gray-500 mb-1">{item.product.description}</p>
                            {hasStockLimit && (
                              <p className={`text-xs mb-2 ${stockExceeded ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                                Disponible : {availableStock}
                                {stockExceeded ? ' • quantité panier supérieure au stock' : ''}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-600 text-sm">
                                {formatPrice(item.product.price * item.quantity)}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1, availableStock)}
                                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="font-semibold text-gray-900 w-6 text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1, availableStock)}
                                  disabled={!!maxReached}
                                  className={`p-1.5 rounded-lg ${maxReached ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                                >
                                  <Plus size={14} />
                                </button>
                                <button
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 ml-2"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={clearCart}
                      className="w-full py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Vider le panier
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="text-indigo-600" size={24} />
                  Historique des commandes
                </h1>

                {allMyOrders.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucune commande</h2>
                    <p className="text-gray-500 text-sm">
                      Vous n'avez pas encore passé de commande.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allMyOrders.map((order) => {
                      const status = getStatusLabel(order.status);
                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">#{order.id.slice(0, 6)}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>
                                {status.text}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  {item.quantity}x {item.product.name}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {formatPrice(item.product.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                            <span className="font-semibold text-gray-900">Total</span>
                            <span className="font-bold text-indigo-600">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Colonne droite - Résumé */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Informations</h2>
              
              {/* Info client */}
              {customer && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-indigo-800">
                    <span className="font-semibold">Client :</span> {customer.name}
                  </p>
                  <p className="text-sm text-indigo-800">
                    <span className="font-semibold">Table :</span> N° {customer.tableNumber}
                  </p>
                </div>
              )}

              {items.length > 0 && activeTab === 'cart' && (
                <>
                  <div className="space-y-2 mb-4">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.quantity}x {item.product.name}
                        </span>
                        <span className="font-medium">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-indigo-600">{formatPrice(getTotal())}</span>
                    </div>
                  </div>

                  <Link
                    to="/checkout"
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-bold text-center block"
                  >
                    Commander ({formatPrice(getTotal())})
                  </Link>
                </>
              )}

              {items.length === 0 && activeTab === 'cart' && (
                <p className="text-gray-500 text-sm text-center py-4">
                  Votre panier est vide
                </p>
              )}

              {activeTab === 'history' && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-4">
                    {allMyOrders.length} commande(s) passée(s)
                  </p>
                  <Link
                    to="/menu"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Nouvelle commande
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cart;
