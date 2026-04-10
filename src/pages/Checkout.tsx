import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Smartphone, Check, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useOrders, PaymentMethod } from '../contexts/OrdersContext';
import { useCustomer } from '../contexts/CustomerContext';
import Header from '../components/Header';
import { useNotification } from '../contexts/NotificationContext';

const Checkout: React.FC = () => {
  const { items, getTotal } = useCart();
  const { notify } = useNotification();
  const { addOrder, paymentNumbers, products } = useOrders();
  const { customer, isLoggedIn, isReady } = useCustomer();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('orange_money');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vérifier si le client est connecté
  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      navigate('/');
    }
  }, [isReady, isLoggedIn, navigate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      notify('Votre panier est vide', 'error');
      return;
    }

    if (!customer) {
      notify('Veuillez vous connecter', 'error');
      navigate('/');
      return;
    }

    const invalidItem = items.find((item) => {
      const currentProduct = products.find((product) => product.id === item.product.id);

      if (!currentProduct || !currentProduct.isActive) {
        return true;
      }

      return currentProduct.quantity !== undefined && item.quantity > currentProduct.quantity;
    });

    if (invalidItem) {
      const currentProduct = products.find((product) => product.id === invalidItem.product.id);
      notify(
        currentProduct?.quantity !== undefined
          ? `Stock insuffisant pour ${invalidItem.product.name} : ${currentProduct.quantity} disponible(s)`
          : `${invalidItem.product.name} n'est plus disponible`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await addOrder({
        tableNumber: customer.tableNumber,
        items,
        total: getTotal(),
        paymentMethod: selectedPayment,
        customerName: customer.name,
        notes: notes || undefined,
      });

      notify('Commande créée avec succès !', 'success');

      setTimeout(() => {
        navigate('/payment', { state: { order } });
        setIsSubmitting(false);
      }, 500);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Impossible de créer la commande', 'error');
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    {
      id: 'orange_money' as PaymentMethod,
      name: 'Orange Money',
      color: 'orange',
      bgClass: 'bg-orange-50 border-orange-200 hover:bg-orange-100',
      activeClass: 'bg-orange-100 border-orange-500 ring-2 ring-orange-500',
      textClass: 'text-orange-700',
      info: paymentNumbers.orange_money,
    },
    {
      id: 'mvola' as PaymentMethod,
      name: 'Mvola',
      color: 'green',
      bgClass: 'bg-green-50 border-green-200 hover:bg-green-100',
      activeClass: 'bg-green-100 border-green-500 ring-2 ring-green-500',
      textClass: 'text-green-700',
      info: paymentNumbers.mvola,
    },
    {
      id: 'airtel_money' as PaymentMethod,
      name: 'Airtel Money',
      color: 'red',
      bgClass: 'bg-red-50 border-red-200 hover:bg-red-100',
      activeClass: 'bg-red-100 border-red-500 ring-2 ring-red-500',
      textClass: 'text-red-700',
      info: paymentNumbers.airtel_money,
    },
  ];

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
            to="/cart"
            className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-800 text-sm"
          >
            <ArrowLeft size={18} />
            <span>Retour au panier</span>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Finaliser votre commande</h1>
            <p className="text-gray-600 text-sm">Vérifiez vos informations et choisissez votre mode de paiement</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colonne gauche - Infos client + Articles */}
              <div className="space-y-6">
                {/* Informations client */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="text-indigo-600" size={20} />
                    Informations client
                  </h2>
                  
                  {customer && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="block text-xs text-gray-500 mb-1">Nom</span>
                        <span className="font-semibold text-gray-900">{customer.name}</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="block text-xs text-gray-500 mb-1">Table</span>
                        <span className="font-semibold text-gray-900">N° {customer.tableNumber}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes pour la commande (optionnel)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      placeholder="Ex: Sans oignons, sauce à part..."
                    />
                  </div>
                </div>

                {/* Articles */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Check className="text-indigo-600" size={20} />
                    Articles ({items.length})
                  </h2>
                  
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{item.product.name}</p>
                          <p className="text-xs text-gray-500">{item.quantity}x {formatPrice(item.product.price)}</p>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-indigo-600">{formatPrice(getTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite - Mode de paiement */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="text-indigo-600" size={20} />
                    Mode de paiement
                  </h2>

                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPayment === method.id ? method.activeClass : method.bgClass
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPayment === method.id}
                          onChange={() => setSelectedPayment(method.id)}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <p className={`font-bold ${method.textClass}`}>{method.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {method.info.merchantName} • {method.info.number}
                          </p>
                        </div>
                        {selectedPayment === method.id && (
                          <Check className={method.textClass} size={20} />
                        )}
                      </label>
                    ))}
                  </div>

                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Smartphone className="text-blue-600 shrink-0" size={20} />
                      <div>
                        <h3 className="font-semibold text-blue-900 text-sm mb-1">Paiement Mobile</h3>
                        <p className="text-blue-800 text-xs">
                          Après validation, vous serez redirigé vers l'application de paiement pour finaliser.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bouton de validation */}
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {isSubmitting ? 'Traitement...' : `Payer ${formatPrice(getTotal())}`}
                </button>

                <p className="text-center text-xs text-gray-500">
                  En validant, vous acceptez nos conditions générales de vente.
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
