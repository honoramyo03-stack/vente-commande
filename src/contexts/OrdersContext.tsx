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
  estimatedMinutes?: number;
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

export interface Category {
  id: string;
  name: string;
  icon?: string;
  order: number;
}

export interface RestaurantSettings {
  name: string;
  tableCount: number;
  logo: string;
  vatRate: number;
  defaultPrepTime: number;
  currency: string;
  phone: string;
  address: string;
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
  decreaseProductStock: (productId: string, quantity: number, productName?: string) => Promise<void>;

  paymentNumbers: PaymentNumbers;
  updatePaymentNumber: (method: keyof PaymentNumbers, info: PaymentInfo) => void;

  sellerAccounts: SellerAccount[];
  addSellerAccount: (account: SellerAccount) => void;
  deleteSellerAccount: (username: string) => void;

  categories: Category[];
  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  restaurantSettings: RestaurantSettings;
  updateRestaurantSettings: (settings: Partial<RestaurantSettings>) => void;

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

const defaultPaymentNumbers: PaymentNumbers = {
  orange_money: { number: '0323943234', merchantName: 'Honora' },
  mvola: { number: '0345861363', merchantName: 'Honora' },
  airtel_money: { number: '0333943234', merchantName: 'Honora' },
};

const defaultSellers: SellerAccount[] = [
  { username: 'admin', password: 'password', role: 'admin' },
];

const defaultCategories: Category[] = [
  { id: 'cat1', name: 'Pizza', icon: '🍕', order: 1 },
  { id: 'cat2', name: 'Burgers', icon: '🍔', order: 2 },
  { id: 'cat3', name: 'Boissons', icon: '🥤', order: 3 },
  { id: 'cat4', name: 'Desserts', icon: '🍰', order: 4 },
  { id: 'cat5', name: 'Salades', icon: '🥗', order: 5 },
];

const defaultSettings: RestaurantSettings = {
  name: 'QuickOrder',
  tableCount: 20,
  logo: '',
  vatRate: 20,
  defaultPrepTime: 20,
  currency: 'Ar',
  phone: '',
  address: '',
};

interface OrdersProviderProps {
  children: ReactNode;
}

// Mode strict multi-utilisateur: ne pas persister les donnees partagees en localStorage.
const safeSetItem = (_key: string, _value: string) => { /* no-op */ };

export const OrdersProvider: React.FC<OrdersProviderProps> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentNumbers, setPaymentNumbers] = useState<PaymentNumbers>(defaultPaymentNumbers);
  const [sellerAccounts, setSellerAccounts] = useState<SellerAccount[]>(defaultSellers);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings>(defaultSettings);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const transformed: Order[] = (data || []).map((o: any) => ({
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
        estimatedMinutes: o.estimated_minutes,
      }));
      setOrders(transformed);
      safeSetItem('orders_state', JSON.stringify(transformed));
    } catch (e) { console.error('Erreur commandes:', e); }
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const transformed: Product[] = (data || []).map((p: any) => ({
        id: p.id, name: p.name, description: p.description || '', price: p.price,
        category: p.category, image: p.image || '', quantity: p.quantity, isActive: p.is_active,
      }));
      setProducts(transformed);
      safeSetItem('products_state', JSON.stringify(transformed));
    } catch (e) { console.error('Erreur produits:', e); }
  }, []);

  const fetchPaymentNumbers = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('payment_numbers').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        const payments: PaymentNumbers = { ...defaultPaymentNumbers };
        data.forEach((p: any) => {
          const key = p.provider === 'orange' ? 'orange_money' : p.provider === 'mvola' ? 'mvola' : 'airtel_money';
          payments[key] = { number: p.number, merchantName: p.merchant_name || 'Honora' };
        });
        setPaymentNumbers(payments);
        safeSetItem('payment_numbers_state', JSON.stringify(payments));
      }
    } catch (e) { console.error('Erreur paiements:', e); }
  }, []);

  const fetchSellerAccounts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase.from('seller_accounts').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        const accounts: SellerAccount[] = data.map((a: any) => ({
          id: a.id, username: a.username, password: a.password,
          role: a.username === 'admin' ? 'admin' : 'seller',
        }));
        setSellerAccounts(accounts);
        safeSetItem('seller_accounts_state', JSON.stringify(accounts));
      }
    } catch (e) { console.error('Erreur comptes:', e); }
  }, []);

  // Initialisation
  useEffect(() => {
    const init = async () => {
      if (isSupabaseConfigured()) {
        setIsOnline(true);
        await Promise.all([fetchOrders(), fetchProducts(), fetchPaymentNumbers(), fetchSellerAccounts()]);
      } else {
        // Source de verite unique = base de donnees
        setOrders([]);
        setProducts([]);
        setIsOnline(false);
      }

      // Donnees locales non partagees
      setCategories(defaultCategories);
      setRestaurantSettings(defaultSettings);
      setLoading(false);
    };
    init();
  }, [fetchOrders, fetchProducts, fetchPaymentNumbers, fetchSellerAccounts]);

  // Temps réel
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const ordersCh = supabase.channel('orders_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { fetchOrders(); }).subscribe();
    const productsCh = supabase.channel('products_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { fetchProducts(); }).subscribe();
    const paymentsCh = supabase.channel('payments_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'payment_numbers' }, () => { fetchPaymentNumbers(); }).subscribe();
    return () => { supabase.removeChannel(ordersCh); supabase.removeChannel(productsCh); supabase.removeChannel(paymentsCh); };
  }, [fetchOrders, fetchProducts, fetchPaymentNumbers]);

  // Polling de secours pour garantir la synchro multi-appareils
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const syncAll = async () => {
      await Promise.all([fetchOrders(), fetchProducts()]);
    };

    const interval = setInterval(syncAll, 5000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncAll();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchOrders, fetchProducts]);

  // Ajouter commande
  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
    if (!isSupabaseConfigured()) {
      throw new Error('Base de donnees indisponible');
    }

    const newOrder: Order = {
      ...orderData,
      id: `order_${Date.now()}`,
      status: 'pending',
      createdAt: new Date(),
      estimatedMinutes: restaurantSettings?.defaultPrepTime ?? defaultSettings.defaultPrepTime,
    };
    try {
      // Insert minimal payload first for broad schema compatibility.
      const { data, error } = await supabase
        .from('orders')
        .insert({
          table_number: newOrder.tableNumber,
          client_name: newOrder.customerName,
          items: newOrder.items,
          total: newOrder.total,
          status: 'pending',
          payment_method: newOrder.paymentMethod,
        })
        .select()
        .single();

      if (error) throw error;
      newOrder.id = data.id;
      if (data.created_at) {
        newOrder.createdAt = new Date(data.created_at);
      }

      // Best-effort optional fields update (ignore if column missing).
      try {
        await supabase
          .from('orders')
          .update({
            payment_status: 'pending',
            estimated_minutes: newOrder.estimatedMinutes,
            notes: newOrder.notes || null,
          })
          .eq('id', newOrder.id);
      } catch (optionalError) {
        console.warn('Colonnes optionnelles non disponibles sur orders:', optionalError);
      }
    } catch (e) {
      console.error('Erreur création commande:', e);
      throw new Error('Creation commande impossible (base de donnees)');
    }
    setOrders(prev => { const u = [newOrder, ...prev]; safeSetItem('orders_state', JSON.stringify(u)); return u; });

    // Mise à jour locale immédiate du stock pour un retour visuel instantané côté client.
    setProducts(prev => {
      const updated = prev.map((p) => {
        const item = newOrder.items.find((i) => i.product.id === p.id || i.product.name === p.name);
        if (!item || p.quantity === undefined) return p;
        return { ...p, quantity: Math.max(0, p.quantity - item.quantity) };
      });
      safeSetItem('products_state', JSON.stringify(updated));
      return updated;
    });

    try {
      for (const item of newOrder.items) {
        await decreaseProductStock(item.product.id, item.quantity, item.product.name);
      }
    } catch (e) {
      console.error('Commande creee mais sync stock partielle:', e);
      // Re-sync defensif pour limiter les ecarts de stock locaux.
      await fetchProducts();
    }
    return newOrder;
  };

  // Mettre à jour statut commande
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (isSupabaseConfigured()) {
      try {
        const updates: any = { status };
        if (status === 'paid') { updates.payment_status = 'paid'; updates.paid_at = new Date().toISOString(); }
        if (status === 'completed') { updates.validated_at = new Date().toISOString(); }
        await supabase.from('orders').update(updates).eq('id', orderId);
      } catch (e) { console.error('Erreur maj commande:', e); }
    }
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? {
        ...o, status,
        paidAt: status === 'paid' ? new Date() : o.paidAt,
        validatedAt: status === 'completed' ? new Date() : o.validatedAt,
      } : o);
      safeSetItem('orders_state', JSON.stringify(updated));
      return updated;
    });
  };

  const getOrdersByTable = (t: number) => orders.filter(o => o.tableNumber === t);
  const getOrderById = (id: string) => orders.find(o => o.id === id);
  const getOrdersByCustomer = (n: string) => orders.filter(o => o.customerName === n);

  // Produits
  const addProduct = async (d: Omit<Product, 'id' | 'isActive'>) => {
    const p: Product = { ...d, id: `prod_${Date.now()}`, isActive: true };
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('products').insert({
          name: p.name, description: p.description, price: p.price,
          category: p.category, image: p.image, quantity: p.quantity, is_active: true,
        }).select().single();
        if (error) throw error;
        p.id = data.id;
      } catch (e) { console.error('Erreur création produit:', e); }
    }
    setProducts(prev => { const u = [p, ...prev]; safeSetItem('products_state', JSON.stringify(u)); return u; });
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (isSupabaseConfigured()) {
      try {
        const db: any = {};
        if (updates.name !== undefined) db.name = updates.name;
        if (updates.description !== undefined) db.description = updates.description;
        if (updates.price !== undefined) db.price = updates.price;
        if (updates.category !== undefined) db.category = updates.category;
        if (updates.image !== undefined) db.image = updates.image;
        if (updates.quantity !== undefined) db.quantity = updates.quantity;
        if (updates.isActive !== undefined) db.is_active = updates.isActive;
        await supabase.from('products').update(db).eq('id', id);
      } catch (e) { console.error('Erreur maj produit:', e); }
    }
    setProducts(prev => { const u = prev.map(p => p.id === id ? { ...p, ...updates } : p); safeSetItem('products_state', JSON.stringify(u)); return u; });
  };

  const deleteProduct = async (id: string) => {
    if (isSupabaseConfigured()) { try { await supabase.from('products').delete().eq('id', id); } catch (e) { console.error(e); } }
    setProducts(prev => { const u = prev.filter(p => p.id !== id); safeSetItem('products_state', JSON.stringify(u)); return u; });
  };

  const decreaseProductStock = async (productId: string, quantity: number, productName?: string) => {
    let currentQuantity: number | undefined;
    let resolvedProductId = productId;
    if (isSupabaseConfigured()) {
      try {
        let { data, error } = await supabase.from('products').select('id, quantity').eq('id', productId).single();

        // Fallback utile si le panier contient un ancien id local: on tente par nom.
        if ((error || !data) && productName) {
          const byName = await supabase
            .from('products')
            .select('id, quantity')
            .eq('name', productName)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          data = byName.data as any;
          error = byName.error as any;
        }

        if (error) throw error;
        resolvedProductId = data?.id || productId;
        currentQuantity = data?.quantity;
      } catch (e) {
        console.error('Erreur lecture stock:', e);
        throw new Error('Lecture stock impossible');
      }
    }
    if (currentQuantity === undefined) {
      throw new Error('Produit introuvable pour mise a jour de stock');
    }
    const newQuantity = Math.max(0, currentQuantity - quantity);
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('products')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', resolvedProductId);
        if (error) throw error;
        // Recharger depuis la source centrale pour garantir la synchro inter-appareils.
        await fetchProducts();
        return;
      } catch (e) {
        console.error('Erreur mise a jour stock:', e);
        throw new Error('Mise a jour stock impossible');
      }
    }
    throw new Error('Base de donnees indisponible pour mise a jour stock');
  };

  // Paiements
  const updatePaymentNumber = async (method: keyof PaymentNumbers, info: PaymentInfo) => {
    if (isSupabaseConfigured()) {
      try {
        const provider = method === 'orange_money' ? 'orange' : method === 'mvola' ? 'mvola' : 'airtel';
        await supabase.from('payment_numbers').upsert({ provider, number: info.number, merchant_name: info.merchantName, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'provider' });
      } catch (e) { console.error(e); }
    }
    setPaymentNumbers(prev => { const u = { ...prev, [method]: info }; safeSetItem('payment_numbers_state', JSON.stringify(u)); return u; });
  };

  // Comptes vendeurs
  const addSellerAccount = async (account: SellerAccount) => {
    if (isSupabaseConfigured()) { try { await supabase.from('seller_accounts').insert({ username: account.username, password: account.password, name: account.username }); } catch (e) { console.error(e); } }
    setSellerAccounts(prev => { const u = [...prev, account]; safeSetItem('seller_accounts_state', JSON.stringify(u)); return u; });
  };

  const deleteSellerAccount = async (username: string) => {
    if (username === 'admin') return;
    if (isSupabaseConfigured()) { try { await supabase.from('seller_accounts').delete().eq('username', username); } catch (e) { console.error(e); } }
    setSellerAccounts(prev => { const u = prev.filter(a => a.username !== username); safeSetItem('seller_accounts_state', JSON.stringify(u)); return u; });
  };

  // Catégories
  const addCategory = (cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: `cat_${Date.now()}` };
    setCategories(prev => { const u = [...prev, newCat]; safeSetItem('categories_state', JSON.stringify(u)); return u; });
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev => { const u = prev.map(c => c.id === id ? { ...c, ...updates } : c); safeSetItem('categories_state', JSON.stringify(u)); return u; });
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => { const u = prev.filter(c => c.id !== id); safeSetItem('categories_state', JSON.stringify(u)); return u; });
  };

  // Paramètres restaurant
  const updateRestaurantSettings = (settings: Partial<RestaurantSettings>) => {
    setRestaurantSettings(prev => {
      const u = { ...prev, ...settings };
      safeSetItem('restaurant_settings', JSON.stringify(u));
      return u;
    });
  };

  return (
    <OrdersContext.Provider value={{
      orders, addOrder, updateOrderStatus, getOrdersByTable, getOrderById, getOrdersByCustomer,
      products, addProduct, updateProduct, deleteProduct, decreaseProductStock,
      paymentNumbers, updatePaymentNumber,
      sellerAccounts, addSellerAccount, deleteSellerAccount,
      categories, addCategory, updateCategory, deleteCategory,
      restaurantSettings, updateRestaurantSettings,
      isOnline, loading,
    }}>
      {children}
    </OrdersContext.Provider>
  );
};
