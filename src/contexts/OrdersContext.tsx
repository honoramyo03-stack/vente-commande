import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CartItem } from './CartContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'orange_money' | 'mvola' | 'airtel_money';

export interface Order {
  id: string;
  tableNumber: number;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  paidAt?: Date;
  validatedAt?: Date;
  customerName?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  quantity?: number;
  isActive: boolean;
}

export interface PaymentInfo {
  number: string;
  merchantName: string;
}

export interface PaymentNumbers {
  orange_money: PaymentInfo;
  mvola: PaymentInfo;
  airtel_money: PaymentInfo;
}

export interface SellerAccount {
  id?: string;
  username: string;
  password?: string;
  role: 'admin' | 'seller';
}

interface OrdersContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getOrdersByTable: (tableNumber: number) => Order[];
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByCustomer: (customerName: string) => Order[];

  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'isActive'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  decreaseProductStock: (productId: string, quantity: number) => void;

  paymentNumbers: PaymentNumbers;
  updatePaymentNumber: (method: keyof PaymentNumbers, info: PaymentInfo) => void;

  sellerAccounts: SellerAccount[];
  addSellerAccount: (account: SellerAccount) => void;
  deleteSellerAccount: (username: string) => void;

  isOnline: boolean;
  loading: boolean;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const useOrders = () => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'Pizza Margherita',
    description: 'Tomate, mozzarella, basilic',
    price: 12000,
    category: 'Pizza',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
    quantity: 15,
    isActive: true,
  },
  {
    id: '2',
    name: 'Coca-Cola',
    description: 'Boisson gazeuse 33cl',
    price: 2000,
    category: 'Boissons',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop',
    quantity: 50,
    isActive: true,
  },
  {
    id: '3',
    name: 'Burger Classique',
    description: 'Steak, fromage, salade, tomate',
    price: 8000,
    category: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    quantity: 20,
    isActive: true,
  },
  {
    id: '4',
    name: 'Fanta Orange',
    description: "Boisson gazeuse à l'orange 33cl",
    price: 2000,
    category: 'Boissons',
    image: 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=300&fit=crop',
    quantity: 30,
    isActive: true,
  },
  {
    id: '5',
    name: 'Pizza Quatre Fromages',
    description: 'Mozzarella, gorgonzola, parmesan, chèvre',
    price: 15000,
    category: 'Pizza',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
    isActive: true,
  },
  {
    id: '6',
    name: 'Tiramisu',
    description: 'Dessert italien au café et mascarpone',
    price: 6000,
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
    quantity: 10,
    isActive: true,
  },
];

const defaultPaymentNumbers: PaymentNumbers = {
  orange_money: { number: '0323943234', merchantName: 'Honora' },
  mvola: { number: '0345861363', merchantName: 'Honora' },
  airtel_money: { number: '0333943234', merchantName: 'Honora' },
};

const defaultSellers: SellerAccount[] = [
  { username: 'admin', password: 'password', role: 'admin' },
];

interface OrdersProviderProps {
  children: ReactNode;
}

// Helpers pour localStorage sécurisé
const safeGetItem = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error(e);
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(e);
  }
};

const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = safeGetItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return fallback;
};

export const OrdersProvider: React.FC<OrdersProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentNumbers, setPaymentNumbers] = useState<PaymentNumbers>(defaultPaymentNumbers);
  const [sellerAccounts, setSellerAccounts] = useState<SellerAccount[]>(defaultSellers);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les commandes depuis Supabase
  const fetchOrders = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedOrders: Order[] = (data || []).map((o: any) => ({
        id: o.id,
        tableNumber: o.table_number,
        items: o.items || [],
        total: o.total,
        status: o.status,
        paymentMethod: o.payment_method,
        createdAt: new Date(o.created_at),
        paidAt: o.paid_at ? new Date(o.paid_at) : undefined,
        validatedAt: o.validated_at ? new Date(o.validated_at) : undefined,
        customerName: o.client_name,
        notes: o.notes,
      }));

      setOrders(transformedOrders);
      safeSetItem('orders_state', JSON.stringify(transformedOrders));
    } catch (e) {
      console.error('Erreur chargement commandes:', e);
    }
  }, []);

  // Charger les produits depuis Supabase
  const fetchProducts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProducts: Product[] = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        category: p.category,
        image: p.image || '',
        quantity: p.quantity,
        isActive: p.is_active,
      }));

      setProducts(transformedProducts);
      safeSetItem('products_state', JSON.stringify(transformedProducts));
    } catch (e) {
      console.error('Erreur chargement produits:', e);
    }
  }, []);

  // Charger les numéros de paiement depuis Supabase
  const fetchPaymentNumbers = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('payment_numbers')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const payments: PaymentNumbers = { ...defaultPaymentNumbers };
        data.forEach((p: any) => {
          const key = p.provider === 'orange' ? 'orange_money' : 
                      p.provider === 'mvola' ? 'mvola' : 'airtel_money';
          payments[key] = {
            number: p.number,
            merchantName: p.merchant_name || 'Honora',
          };
        });
        setPaymentNumbers(payments);
        safeSetItem('payment_numbers_state', JSON.stringify(payments));
      }
    } catch (e) {
      console.error('Erreur chargement paiements:', e);
    }
  }, []);

  // Charger les comptes vendeurs depuis Supabase
  const fetchSellerAccounts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('seller_accounts')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const accounts: SellerAccount[] = data.map((a: any) => ({
          id: a.id,
          username: a.username,
          password: a.password,
          role: a.username === 'admin' ? 'admin' : 'seller',
        }));
        setSellerAccounts(accounts);
        safeSetItem('seller_accounts_state', JSON.stringify(accounts));
      }
    } catch (e) {
      console.error('Erreur chargement comptes:', e);
    }
  }, []);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      // Charger depuis localStorage d'abord (cache)
      const cachedOrders = loadState<any[]>('orders_state', []);
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders.map(o => ({
          ...o,
          createdAt: new Date(o.createdAt),
          paidAt: o.paidAt ? new Date(o.paidAt) : undefined,
          validatedAt: o.validatedAt ? new Date(o.validatedAt) : undefined,
        })));
      }

      setProducts(loadState('products_state', defaultProducts));
      setPaymentNumbers(loadState('payment_numbers_state', defaultPaymentNumbers));
      setSellerAccounts(loadState('seller_accounts_state', defaultSellers));

      // Si Supabase est configuré, charger depuis la BD
      if (isSupabaseConfigured()) {
        setIsOnline(true);
        await Promise.all([
          fetchOrders(),
          fetchProducts(),
          fetchPaymentNumbers(),
          fetchSellerAccounts(),
        ]);
      }

      setLoading(false);
    };

    init();
  }, [fetchOrders, fetchProducts, fetchPaymentNumbers, fetchSellerAccounts]);

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const ordersChannel = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    const productsChannel = supabase
      .channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    const paymentsChannel = supabase
      .channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_numbers' }, () => {
        fetchPaymentNumbers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [fetchOrders, fetchProducts, fetchPaymentNumbers]);

  // Synchronisation localStorage (fallback)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'orders_state' && e.newValue) {
        const parsed = JSON.parse(e.newValue);
        setOrders(parsed.map((o: any) => ({
          ...o,
          createdAt: new Date(o.createdAt),
          paidAt: o.paidAt ? new Date(o.paidAt) : undefined,
          validatedAt: o.validatedAt ? new Date(o.validatedAt) : undefined,
        })));
      }
      if (e.key === 'products_state' && e.newValue) {
        setProducts(JSON.parse(e.newValue));
      }
      if (e.key === 'payment_numbers_state' && e.newValue) {
        setPaymentNumbers(JSON.parse(e.newValue));
      }
      if (e.key === 'seller_accounts_state' && e.newValue) {
        setSellerAccounts(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Ajouter une commande
  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
    const newOrder: Order = {
      ...orderData,
      id: `order_${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .insert({
            table_number: newOrder.tableNumber,
            client_name: newOrder.customerName,
            items: newOrder.items,
            total: newOrder.total,
            status: 'pending',
            payment_method: newOrder.paymentMethod,
            payment_status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        newOrder.id = data.id;
      } catch (e) {
        console.error('Erreur création commande:', e);
      }
    }

    setOrders(prev => {
      const updated = [newOrder, ...prev];
      safeSetItem('orders_state', JSON.stringify(updated));
      return updated;
    });

    // ✅ Diminuer le stock pour chaque article de la commande
    for (const item of newOrder.items) {
      await decreaseProductStock(item.product.id, item.quantity);
    }

    return newOrder;
  };

  // Mettre à jour le statut d'une commande
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (isSupabaseConfigured()) {
      try {
        const updates: any = { status };
        if (status === 'paid') {
          updates.payment_status = 'paid';
          updates.paid_at = new Date().toISOString();
        }
        if (status === 'completed') {
          updates.validated_at = new Date().toISOString();
        }

        await supabase
          .from('orders')
          .update(updates)
          .eq('id', orderId);
      } catch (e) {
        console.error('Erreur mise à jour commande:', e);
      }
    }

    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            status,
            paidAt: status === 'paid' ? new Date() : o.paidAt,
            validatedAt: status === 'completed' ? new Date() : o.validatedAt,
          };
        }
        return o;
      });
      safeSetItem('orders_state', JSON.stringify(updated));
      return updated;
    });
  };

  const getOrdersByTable = (tableNumber: number) => 
    orders.filter(o => o.tableNumber === tableNumber);

  const getOrderById = (orderId: string) => 
    orders.find(o => o.id === orderId);

  const getOrdersByCustomer = (customerName: string) => 
    orders.filter(o => o.customerName === customerName);

  // Ajouter un produit
  const addProduct = async (productData: Omit<Product, 'id' | 'isActive'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod_${Date.now()}`,
      isActive: true,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: newProduct.name,
            description: newProduct.description,
            price: newProduct.price,
            category: newProduct.category,
            image: newProduct.image,
            quantity: newProduct.quantity,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        newProduct.id = data.id;
      } catch (e) {
        console.error('Erreur création produit:', e);
      }
    }

    setProducts(prev => {
      const updated = [newProduct, ...prev];
      safeSetItem('products_state', JSON.stringify(updated));
      return updated;
    });
  };

  // Mettre à jour un produit
  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (isSupabaseConfigured()) {
      try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.image !== undefined) dbUpdates.image = updates.image;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        await supabase
          .from('products')
          .update(dbUpdates)
          .eq('id', id);
      } catch (e) {
        console.error('Erreur mise à jour produit:', e);
      }
    }

    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      safeSetItem('products_state', JSON.stringify(updated));
      return updated;
    });
  };

  // Supprimer un produit
  const deleteProduct = async (id: string) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('products')
          .delete()
          .eq('id', id);
      } catch (e) {
        console.error('Erreur suppression produit:', e);
      }
    }

    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      safeSetItem('products_state', JSON.stringify(updated));
      return updated;
    });
  };

  // Diminuer le stock d'un produit
  const decreaseProductStock = async (productId: string, quantity: number) => {
    // Récupérer le stock actuel depuis Supabase pour éviter les erreurs
    let currentQuantity: number | undefined;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', productId)
          .single();

        if (error) throw error;
        currentQuantity = data?.quantity;
      } catch (e) {
        console.error('Erreur lecture stock:', e);
      }
    }

    // Fallback : utiliser le stock local si Supabase échoue
    if (currentQuantity === undefined) {
      const product = products.find(p => p.id === productId);
      if (!product || product.quantity === undefined) return;
      currentQuantity = product.quantity;
    }

    const newQuantity = Math.max(0, currentQuantity - quantity);
    // On ne change PAS isActive automatiquement
    // Seul le vendeur contrôle l'état actif/inactif via le bouton
    const product = products.find(p => p.id === productId);
    const currentIsActive = product?.isActive ?? true;

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('products')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', productId);
      } catch (e) {
        console.error('Erreur mise à jour stock:', e);
      }
    }

    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === productId && p.quantity !== undefined) {
          return { ...p, quantity: newQuantity, isActive: currentIsActive };
        }
        return p;
      });
      safeSetItem('products_state', JSON.stringify(updated));
      return updated;
    });
  };

  // Mettre à jour un numéro de paiement
  const updatePaymentNumber = async (method: keyof PaymentNumbers, info: PaymentInfo) => {
    if (isSupabaseConfigured()) {
      try {
        const provider = method === 'orange_money' ? 'orange' : 
                     method === 'mvola' ? 'mvola' : 'airtel';

        await supabase
          .from('payment_numbers')
          .upsert({
            provider,
            number: info.number,
            merchant_name: info.merchantName,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'provider' });
      } catch (e) {
        console.error('Erreur mise à jour paiement:', e);
      }
    }

    setPaymentNumbers(prev => {
      const updated = { ...prev, [method]: info };
      safeSetItem('payment_numbers_state', JSON.stringify(updated));
      return updated;
    });
  };

  // Ajouter un compte vendeur
  const addSellerAccount = async (account: SellerAccount) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('seller_accounts')
          .insert({
            username: account.username,
            password: account.password,
            name: account.username,
          });
      } catch (e) {
        console.error('Erreur création compte:', e);
      }
    }

    setSellerAccounts(prev => {
      const updated = [...prev, account];
      safeSetItem('seller_accounts_state', JSON.stringify(updated));
      return updated;
    });
  };

  // Supprimer un compte vendeur
  const deleteSellerAccount = async (username: string) => {
    if (username === 'admin') return; // Ne pas supprimer admin

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('seller_accounts')
          .delete()
          .eq('username', username);
      } catch (e) {
        console.error('Erreur suppression compte:', e);
      }
    }

    setSellerAccounts(prev => {
      const updated = prev.filter(a => a.username !== username);
      safeSetItem('seller_accounts_state', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        addOrder,
        updateOrderStatus,
        getOrdersByTable,
        getOrderById,
        getOrdersByCustomer,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        decreaseProductStock,
        paymentNumbers,
        updatePaymentNumber,
        sellerAccounts,
        addSellerAccount,
        deleteSellerAccount,
        isOnline,
        loading,
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};
