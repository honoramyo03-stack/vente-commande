import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Package, DollarSign, User, Eye } from 'lucide-react';
import { Order, OrderStatus } from '../contexts/OrdersContext';

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
  isSeller?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdate, isSeller }) => {
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

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'paid': return <DollarSign size={14} />;
      case 'preparing': return <Package size={14} />;
      case 'ready': return <CheckCircle size={14} />;
      default: return <Package size={14} />;
    }
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'paid': return 'Payée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'orange_money': return '🟠 Orange';
      case 'mvola': return '🟢 Mvola';
      case 'airtel_money': return '🔴 Airtel';
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

  const getNextStatusText = (status: OrderStatus | null) => {
    switch (status) {
      case 'paid': return 'Marquer payée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête à servir';
      case 'completed': return 'Terminée';
      default: return '';
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
      order.status === 'pending' ? 'border-yellow-300' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">#{order.id.slice(0, 6)}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor(order.status)}`}>
              {getStatusIcon(order.status)}
              {getStatusText(order.status)}
            </span>
          </div>
          <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Client Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <User size={14} className="text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {order.customerName || 'Client'}
              </p>
              <p className="text-xs text-gray-500">Table {order.tableNumber}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-indigo-600">{formatPrice(order.total)}</p>
            <p className="text-xs text-gray-500">{getPaymentMethodText(order.paymentMethod)}</p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <div className="space-y-1">
            {order.items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="font-medium text-gray-800">
                  {formatPrice(item.product.price * item.quantity)}
                </span>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-xs text-gray-400">+{order.items.length - 3} autre(s) article(s)</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 mb-3">
            <p className="text-xs text-amber-800">
              <span className="font-semibold">Note:</span> {order.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        {isSeller && nextStatus && (
          <div className="flex gap-2">
            <button
              onClick={() => onStatusUpdate(order.id, nextStatus)}
              className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              {getNextStatusText(nextStatus)}
            </button>
            <Link
              to={`/seller/orders/${order.id}`}
              className="py-2 px-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eye size={16} />
            </Link>
          </div>
        )}

        {isSeller && !nextStatus && order.status === 'completed' && (
          <div className="text-center py-2 text-xs text-green-600 font-medium">
            ✓ Commande terminée
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCard;
