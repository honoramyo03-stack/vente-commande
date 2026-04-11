import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useOrders, Order } from '../contexts/OrdersContext';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  initiateMobileMoneyPayment,
  isPaymentApiConfigured,
} from '../lib/paymentApi';

const Payment: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { updateOrderStatus, paymentNumbers } = useOrders();
  const { clearCart } = useCart();
  const { notify } = useNotification();
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentLifecycle, setPaymentLifecycle] = useState<'idle' | 'pending' | 'paid' | 'failed'>('idle');
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.order) {
      setOrder(location.state.order);
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!order || !isPaymentApiConfigured()) return;

    let cancelled = false;
    const startPayment = async () => {
      try {
        const response = await initiateMobileMoneyPayment({
          orderId: order.id,
          provider: order.paymentMethod,
        });
        if (cancelled) return;
        setPaymentLifecycle('pending');
        setPaymentRef(response.externalReference || null);
      } catch (error) {
        if (cancelled) return;
        console.error('Init payment API error:', error);
        notify('API paiement non configuree. Mode validation manuelle actif.', 'warning');
      }
    };

    startPayment();
    return () => {
      cancelled = true;
    };
  }, [order, notify]);

  useEffect(() => {
    if (!order || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`payment-status-${order.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${order.id}` },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          if (row.payment_status === 'paid' || row.status === 'paid') {
            setPaymentLifecycle('paid');
          } else if (row.payment_status === 'failed') {
            setPaymentLifecycle('failed');
          } else {
            setPaymentLifecycle('pending');
          }
          if (row.payment_reference) {
            setPaymentRef(row.payment_reference);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order]);

  if (!order) return null;

  const handleConfirmPayment = () => {
    updateOrderStatus(order.id, 'paid');
    clearCart();
    notify('Paiement confirmé avec succès !', 'success');
    navigate('/menu', {
      replace: true,
      state: {
        stockUpdated: true,
        stockSummary: `${order.items.length} produit${order.items.length > 1 ? 's' : ''} mis a jour`,
      },
    });
  };

  const getPaymentDetails = () => {
    switch (order.paymentMethod) {
      case 'orange_money':
        return {
          name: 'Orange Money',
          info: paymentNumbers.orange_money,
          syntax: `*144*1*1*${paymentNumbers.orange_money.number}*${order.total}#`,
          ussd: `tel:*144*1*1*${paymentNumbers.orange_money.number}*${order.total}%23`,
          color: 'bg-orange-500',
          textColor: 'text-orange-600',
        };
      case 'mvola':
        return {
          name: 'Mvola',
          info: paymentNumbers.mvola,
          syntax: `*114*1*${paymentNumbers.mvola.number}*${order.total}#`,
          ussd: `tel:*114*1*${paymentNumbers.mvola.number}*${order.total}%23`,
          color: 'bg-green-600',
          textColor: 'text-green-600',
        };
      case 'airtel_money':
        return {
          name: 'Airtel Money',
          info: paymentNumbers.airtel_money,
          syntax: `*436*1*${paymentNumbers.airtel_money.number}*${order.total}#`,
          ussd: `tel:*436*1*${paymentNumbers.airtel_money.number}*${order.total}%23`,
          color: 'bg-red-600',
          textColor: 'text-red-600',
        };
      default:
        return {
          name: 'Paiement Mobile',
          info: { number: 'Inconnu', merchantName: '' },
          syntax: '*123#',
          ussd: 'tel:*123%23',
          color: 'bg-gray-600',
          textColor: 'text-gray-600',
        };
    }
  };

  const details = getPaymentDetails();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <div className="max-w-md mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className={`w-16 h-16 ${details.color} text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-md`}>
            {details.name[0]}
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-1">
            Paiement via {details.name}
          </h2>
          <p className="text-gray-500 text-sm mb-2">
            Table N° {order.tableNumber}
          </p>
          {order.customerName && (
            <p className="text-indigo-600 text-sm font-medium mb-4">
              Client : {order.customerName}
            </p>
          )}

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <span className="block text-xs text-gray-400 uppercase tracking-wider mb-1">
              Montant à payer
            </span>
            <span className="text-3xl font-black text-gray-800">
              {order.total.toLocaleString()} Ar
            </span>
          </div>

          <div className="mb-4 text-left">
            <span className="text-xs text-gray-500">Statut temps reel</span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  paymentLifecycle === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : paymentLifecycle === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {paymentLifecycle === 'paid'
                  ? 'Paye'
                  : paymentLifecycle === 'failed'
                    ? 'Echoue'
                    : paymentLifecycle === 'pending'
                      ? 'En attente'
                      : 'En attente'}
              </span>
              {paymentRef && <span className="text-xs text-gray-500">Ref: {paymentRef}</span>}
            </div>
          </div>

          {/* Infos du marchand */}
          <div className="bg-indigo-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-indigo-600 mb-1">Payer au compte :</p>
            <p className="font-bold text-indigo-800 text-lg">{details.info.merchantName}</p>
            <p className="font-mono text-indigo-700">{details.info.number}</p>
          </div>

          {/* Instructions USSD */}
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-left mb-6">
            <h3 className="font-semibold text-amber-900 text-sm mb-2">📱 Instructions de paiement</h3>
            <ol className="list-decimal pl-4 text-amber-800 text-xs space-y-2">
              <li>
                Cliquez sur le bouton ci-dessous pour ouvrir l'application de paiement.
              </li>
              <li>
                Ou composez manuellement : <strong className="select-all text-amber-900 bg-amber-100 px-1 py-0.5 rounded font-mono">{details.syntax}</strong>
              </li>
              <li>
                Effectuez un transfert de <strong>{order.total.toLocaleString()} Ar</strong> vers <strong>{details.info.number}</strong> ({details.info.merchantName})
              </li>
              <li>Une fois le SMS de confirmation reçu, revenez ici et validez le paiement.</li>
            </ol>
          </div>

          {/* Bouton USSD / Téléphone */}
          <a
            href={details.ussd}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-semibold shadow-md ${details.color} mb-4 transition-transform active:scale-95`}
          >
            <span>📱 Ouvrir {details.name}</span>
          </a>

          {/* Validation */}
          <button
            onClick={handleConfirmPayment}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-95 mb-3"
          >
            {paymentLifecycle === 'paid' ? '✅ Paiement confirme' : "✅ J'ai effectue le paiement"}
          </button>

          <p className="text-xs text-gray-400">
            En cas de problème, utilisez le chat pour contacter le vendeur.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;
