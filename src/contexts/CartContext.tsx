import React, { createContext, useContext, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  quantity?: number;
  isActive?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, maxQuantity?: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  getProductQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const getProductQuantity = (productId: string) => {
    return items.find((item) => item.product.id === productId)?.quantity || 0;
  };

  const addToCart = (product: Product) => {
    const currentQuantity = getProductQuantity(product.id);

    if (product.quantity !== undefined && currentQuantity >= product.quantity) {
      toast.error(`Stock maximum atteint pour ${product.name}`);
      return;
    }

    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product.id === product.id);

      if (existingItem) {
        return prevItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, product: { ...item.product, quantity: product.quantity, isActive: product.isActive } }
            : item
        );
      }

      return [...prevItems, { product, quantity: 1 }];
    });

    toast.success(`${product.name} ajouté au panier`);
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
    toast.success('Produit retiré du panier');
  };

  const updateQuantity = (productId: string, quantity: number, maxQuantity?: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    const safeQuantity = maxQuantity !== undefined ? Math.min(quantity, maxQuantity) : quantity;

    if (maxQuantity !== undefined && quantity > maxQuantity) {
      toast.error('La quantité demandée dépasse le stock disponible');
    }

    if (safeQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity: safeQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotal = () => {
    return items.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
        getProductQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};