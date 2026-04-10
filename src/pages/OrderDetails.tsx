import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, MessageSquare, Clock, CheckCircle, User, DollarSign, Package } from 'lucide-react';
import { useOrders, OrderStatus } from '../contexts/OrdersContext';
import SellerHeader from '../components/SellerHeader';
import { useNotification } from '../contexts/NotificationContext';

const OrderDetails: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getOrderById, updateOrderStatus } = useOrders();
  const { notify } = useNotification();
  
  const order = orderId ? getOrderById(orderId) : null;

  useEffect(() => {
    // Check if seller is logged in
    const isLoggedIn = localStorage.getItem('sellerLoggedIn');
    if (!isLoggedIn) {
      navigate('/seller/login');
    }
  }, [navigate]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SellerHeader />
        <main className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Commande non trouvée</h2>
          <p className="text-gray-600 mb-6">La commande que vous recherchez n'existe pas</p>
          <button
            onClick={() => navigate('/seller/dashboard')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour au tableau de bord
          </button>
        </main>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-MG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-purple-100 text-purple-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'En attente de paiement';
      case 'paid': return 'Payée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête à servir';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'orange_money': return 'Orange Money';
      case 'mvola': return 'Mvola';
      case 'airtel_money': return 'Airtel Money';
      default: return method;
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'pending': return 'paid';
      case 'paid': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'completed';
      default: return null;
    }
  };

  const nextStatus = getNextStatus(order.status);

  const handleStatusUpdate = () => {
    if (nextStatus) {
      updateOrderStatus(order.id, nextStatus);
      notify(`Commande ${nextStatus === 'ready' ? 'marquée comme prête' : 'validée'}`, 'success');
    }
  };

  const handlePrint = () => {
    window.print();
    notify('Impression lancée', 'success');
  };

  const handleContact = () => {
    notify('Utilisez le chat pour communiquer avec le client', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerHeader />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/seller/dashboard')}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Commande #{order.id.slice(-6)}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              {getStatusText(order.status)}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Printer size={20} />
              <span>Imprimer</span>
            </button>
            <button
              onClick={handleContact}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <MessageSquare size={20} />
              <span>Contacter</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Articles commandés</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div>
                        <h3 className="font-bold text-gray-900">{item.product.name}</h3>
                        <p className="text-gray-600 text-sm">{item.product.description}</p>
                        <p className="text-gray-500 text-sm">{item.product.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {item.quantity} × {formatPrice(item.product.price)}
                      </div>
                      <div className="font-bold text-blue-600">
                        {formatPrice(item.product.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {order.notes && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Notes du client</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{order.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Info & Actions */}
          <div className="space-y-6">
            {/* Order Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Informations</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Table</p>
                    <p className="font-bold text-gray-900">Table {order.tableNumber}</p>
                    {order.customerName && (
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Date & heure</p>
                    <p className="font-bold text-gray-900">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <DollarSign className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Paiement</p>
                    <p className="font-bold text-gray-900">{getPaymentMethodText(order.paymentMethod)}</p>
                    {order.paidAt && (
                      <p className="text-sm text-gray-600">Payé à {formatDateTime(order.paidAt)}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Package className="text-gray-400" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">Statut</p>
                    <p className="font-bold text-gray-900">{getStatusText(order.status)}</p>
                    {order.validatedAt && (
                      <p className="text-sm text-gray-600">Validé à {formatDateTime(order.validatedAt)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
              
              <div className="space-y-3">
                {nextStatus && (
                  <button
                    onClick={handleStatusUpdate}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold flex items-center justify-center space-x-2"
                  >
                    <CheckCircle size={20} />
                    <span>
                      {nextStatus === 'paid' && 'Marquer comme payée'}
                      {nextStatus === 'preparing' && 'Commencer la préparation'}
                      {nextStatus === 'ready' && 'Marquer comme prête'}
                      {nextStatus === 'completed' && 'Marquer comme terminée'}
                    </span>
                  </button>
                )}
                
                <button
                  onClick={handleContact}
                  className="w-full px-4 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold flex items-center justify-center space-x-2"
                >
                  <MessageSquare size={20} />
                  <span>Contacter le client</span>
                </button>
                
                {order.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateOrderStatus(order.id, 'cancelled');
                      notify('Commande annulée', 'success');
                    }}
                    className="w-full px-4 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-bold"
                  >
                    Annuler la commande
                  </button>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Historique</h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-gray-900">Commande créée</p>
                    <p className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</p>
                  </div>
                </div>
                
                {order.paidAt && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Paiement effectué</p>
                      <p className="text-sm text-gray-600">{formatDateTime(order.paidAt)}</p>
                    </div>
                  </div>
                )}
                
                {order.validatedAt && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-gray-900">Commande validée</p>
                      <p className="text-sm text-gray-600">{formatDateTime(order.validatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderDetails;