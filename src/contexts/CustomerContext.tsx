import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface CustomerSession {
  name: string;
  tableNumber: number;
  connectedAt: string;
}

export interface ConnectedCustomer {
  id?: string;
  name: string;
  tableNumber: number;
  connectedAt: Date;
  lastActive: Date;
}

interface CustomerContextType {
  customer: CustomerSession | null;
  connectedCustomers: ConnectedCustomer[];
  login: (name: string, tableNumber: number) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
  isReady: boolean;
  updateActivity: () => void;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};

interface CustomerProviderProps {
  children: ReactNode;
}

const SESSION_KEY = 'quickorder_customer_session';
const HEARTBEAT_INTERVAL = 30000; // 30 secondes
const CLEANUP_THRESHOLD = 2 * 60 * 60 * 1000; // 2 heures

const safeGetItem = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const safeSetItem = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
};

const safeRemoveItem = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
};

export const CustomerProvider: React.FC<CustomerProviderProps> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [connectedCustomers, setConnectedCustomers] = useState<ConnectedCustomer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const customerRef = useRef<CustomerSession | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Garder la référence synchronisée
  useEffect(() => {
    customerRef.current = customer;
  }, [customer]);

  // ===== ENREGISTRER/METTRE À JOUR UN CLIENT DANS SUPABASE =====
  const upsertClientInSupabase = useCallback(async (name: string, tableNumber: number) => {
    if (!isSupabaseConfigured()) return;
    try {
      const now = new Date().toISOString();
      
      // Essayer de mettre à jour d'abord
      const { error: updateError } = await supabase
        .from('connected_clients')
        .update({
          name,
          connected_at: now,
          last_seen: now,
        })
        .eq('table_number', tableNumber);

      if (updateError) {
        console.error('Erreur update client:', updateError);
      }

      // Vérifier si la mise à jour a fonctionné
      const { data: checkData } = await supabase
        .from('connected_clients')
        .select('*')
        .eq('table_number', tableNumber)
        .single();

      if (!checkData) {
        // Insérer si pas trouvé
        const { error: insertError } = await supabase
          .from('connected_clients')
          .insert({
            name,
            table_number: tableNumber,
            connected_at: now,
            last_seen: now,
          });
        if (insertError) {
          console.error('Erreur insert client:', insertError);
        }
      }
    } catch (e) {
      console.error('Erreur upsert client Supabase:', e);
    }
  }, []);

  // ===== CHARGER LES CLIENTS CONNECTÉS =====
  const loadConnectedClients = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('connected_clients')
        .select('*')
        .order('connected_at', { ascending: false });

      if (!error && data) {
        const clients = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          tableNumber: c.table_number,
          connectedAt: new Date(c.connected_at),
          lastActive: new Date(c.last_seen),
        }));
        setConnectedCustomers(clients);
      }
    } catch (e) {
      console.error('Erreur chargement clients:', e);
    }
  }, []);

  // ===== INITIALISATION AU DÉMARRAGE =====
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Charger les clients connectés
      await loadConnectedClients();

      // 2. Restaurer la session sauvegardée dans localStorage
      const savedStr = safeGetItem(SESSION_KEY);
      if (savedStr) {
        try {
          const savedSession = JSON.parse(savedStr);
          if (savedSession && savedSession.name && savedSession.tableNumber) {
            if (!cancelled) {
              console.log('Restauration session:', savedSession.name, 'Table', savedSession.tableNumber);
              
              // Restaurer la session localement d'abord
              setCustomer(savedSession);
              
              // Puis ré-enregistrer dans Supabase
              await upsertClientInSupabase(savedSession.name, savedSession.tableNumber);
              
              // Recharger les clients
              await loadConnectedClients();
            }
          }
        } catch (e) {
          console.error('Erreur restauration session:', e);
          // Ne pas supprimer la session en cas d'erreur réseau
        }
      }

      if (!cancelled) {
        setIsReady(true);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // ===== SAUVEGARDE AUTOMATIQUE DE LA SESSION =====
  useEffect(() => {
    if (customer) {
      safeSetItem(SESSION_KEY, JSON.stringify(customer));
    }
  }, [customer]);

  // ===== SOUSCRIPTION TEMPS RÉEL =====
  useEffect(() => {
    if (!isSupabaseConfigured() || !isReady) return;

    const channel = supabase
      .channel('connected_clients_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connected_clients'
      }, async () => {
        await loadConnectedClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, loadConnectedClients]);

  // ===== HEARTBEAT - Garder le client en vie =====
  useEffect(() => {
    if (!customer || !isSupabaseConfigured()) return;

    const heartbeat = async () => {
      const current = customerRef.current;
      if (!current) return;
      try {
        await supabase
          .from('connected_clients')
          .update({ last_seen: new Date().toISOString() })
          .eq('table_number', current.tableNumber);
      } catch (e) {
        // Silencieux
      }
    };

    // Envoyer immédiatement
    heartbeat();

    // Puis toutes les 30 secondes
    heartbeatRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [customer]);

  // ===== NETTOYAGE DES CLIENTS INACTIFS =====
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const cleanup = async () => {
      const threshold = new Date(Date.now() - CLEANUP_THRESHOLD);
      try {
        await supabase
          .from('connected_clients')
          .delete()
          .lt('last_seen', threshold.toISOString());
      } catch (e) {
        // Silencieux
      }
    };

    // Nettoyer après 60 secondes (pas immédiatement)
    const timeout = setTimeout(cleanup, 60000);
    const interval = setInterval(cleanup, 5 * 60 * 1000);
    
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  // ===== ACTIVITÉ UTILISATEUR =====
  useEffect(() => {
    if (!customer || !isSupabaseConfigured()) return;

    let activityTimeout: NodeJS.Timeout;

    const onActivity = () => {
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(async () => {
        const current = customerRef.current;
        if (!current) return;
        try {
          await supabase
            .from('connected_clients')
            .update({ last_seen: new Date().toISOString() })
            .eq('table_number', current.tableNumber);
        } catch (e) {
          // Silencieux
        }
      }, 2000); // Debounce 2 secondes
    };

    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('scroll', onActivity);
    window.addEventListener('touchstart', onActivity);

    return () => {
      clearTimeout(activityTimeout);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, [customer]);

  // ===== LOGIN =====
  const login = useCallback(async (name: string, tableNumber: number) => {
    const session: CustomerSession = {
      name,
      tableNumber,
      connectedAt: new Date().toISOString(),
    };

    // Sauvegarder en localStorage immédiatement
    safeSetItem(SESSION_KEY, JSON.stringify(session));
    
    // Mettre à jour l'état
    setCustomer(session);
    
    // Enregistrer dans Supabase
    await upsertClientInSupabase(name, tableNumber);
    await loadConnectedClients();
  }, [upsertClientInSupabase, loadConnectedClients]);

  // ===== LOGOUT =====
  const logout = useCallback(async () => {
    const current = customerRef.current;
    if (current && isSupabaseConfigured()) {
      try {
        await supabase
          .from('connected_clients')
          .delete()
          .eq('table_number', current.tableNumber);
      } catch (e) {
        console.error('Erreur logout Supabase:', e);
      }
    }

    setCustomer(null);
    safeRemoveItem(SESSION_KEY);
    await loadConnectedClients();
  }, [loadConnectedClients]);

  // ===== UPDATE ACTIVITY =====
  const updateActivity = useCallback(async () => {
    const current = customerRef.current;
    if (!current) return;

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('connected_clients')
          .update({ last_seen: new Date().toISOString() })
          .eq('table_number', current.tableNumber);
      } catch (e) {
        // Silencieux
      }
    }
  }, []);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        connectedCustomers,
        login,
        logout,
        isLoggedIn: customer !== null,
        isReady,
        updateActivity,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export default CustomerProvider;
