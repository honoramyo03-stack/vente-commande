import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import CustomerLogin from './pages/CustomerLogin';
import CustomerHome from './pages/CustomerHome';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import OrderDetails from './pages/OrderDetails';
import ChatWidget from './components/ChatWidget';
import { CartProvider } from './contexts/CartContext';
import { ChatProvider } from './contexts/ChatContext';
import { OrdersProvider } from './contexts/OrdersContext';
import { CustomerProvider } from './contexts/CustomerContext';

function App() {
  return (
    <Router>
      <CustomerProvider>
        <CartProvider>
          <OrdersProvider>
            <ChatProvider>
              <div className="min-h-screen bg-gray-50">
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
                
                {/* Chat Widget - visible on customer pages */}
                <ChatWidget />
                
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </div>
            </ChatProvider>
          </OrdersProvider>
        </CartProvider>
      </CustomerProvider>
    </Router>
  );
}

export default App;
