import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerLogin from './pages/CustomerLogin';
import CustomerHome from './pages/CustomerHome';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import OrderDetails from './pages/OrderDetails';
import ChatWidget from './components/ChatWidget';
import FloatingCartButton from './components/FloatingCartButton';
import DatabaseStatusBadge from './components/DatabaseStatusBadge';
import { CartProvider } from './contexts/CartContext';
import { ChatProvider } from './contexts/ChatContext';
import { OrdersProvider } from './contexts/OrdersContext';
import { CustomerProvider } from './contexts/CustomerContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <Router>
      <CustomerProvider>
        <ThemeProvider>
          <NotificationProvider>
            <OrdersProvider>
              <CartProvider>
                <ChatProvider>
                  <div id="customer-app" className="min-h-screen bg-gray-50">
                    <Routes>
                      {/* Customer Routes */}
                      <Route path="/" element={<CustomerLogin />} />
                      <Route path="/menu" element={<CustomerHome />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/payment" element={<Payment />} />
                      
                      {/* Seller Routes */}
                      <Route path="/seller/login" element={<SellerLogin />} />
                      <Route path="/seller/dashboard" element={<SellerDashboard />} />
                      <Route path="/seller/orders/:orderId" element={<OrderDetails />} />
                      
                      {/* Redirect to home */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                    
                    <FloatingCartButton />
                    <DatabaseStatusBadge />
                    {/* Chat Widget - visible on customer pages */}
                    <ChatWidget />
                  </div>
                </ChatProvider>
              </CartProvider>
            </OrdersProvider>
          </NotificationProvider>
        </ThemeProvider>
      </CustomerProvider>
    </Router>
  );
}

export default App;
