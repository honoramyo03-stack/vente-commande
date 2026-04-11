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
  sessionRestored: boolean;
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

const HEARTBEAT_INTERVAL = 30000; // 30 secondes
const CUSTOMER_SESSION_KEY = 'customer_session';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (error: unknown) => {
  const message = String((error as any)?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout')
  );
};

export const CustomerProvider: React.FC<CustomerProviderProps> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [connectedCustomers, setConnectedCustomers] = useState<ConnectedCustomer[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const customerRef = useRef<CustomerSession | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Garder la référence synchronisée
  useEffect(() => {
    customerRef.current = customer;
  }, [customer]);

  // ===== RÉSERVER UNE TABLE (AVEC VERROUILLAGE MÉTIER) =====
  const reserveTableInSupabase = useCallback(async (name: string, tableNumber: number) => {
    if (!isSupabaseConfigured()) return;

    const now = new Date().toISOString();

    try {
      // 1) Tentative rapide d'insert (1 seul appel réseau)
      let { error: insertError } = await supabase
        .from('connected_clients')
        .insert({
          name,
          table_number: tableNumber,
          connected_at: now,
          last_seen: now,
        });

      // Compatibilite schema: colonne last_seen absente
      if (insertError && String(insertError.message).toLowerCase().includes('last_seen')) {
        const retryInsert = await supabase
          .from('connected_clients')
          .insert({
            name,
            table_number: tableNumber,
            connected_at: now,
          });
        insertError = retryInsert.error;
      }

      // Insert OK: table reservee
      if (!insertError) return;

      // 2) Conflit de table: verifier le proprietaire actuel
      if (insertError.code === '23505') {
        const { data: row, error: readError } = await supabase
          .from('connected_clients')
          .select('*')
          .eq('table_number', tableNumber)
          .single();

        if (readError) throw readError;

        const owner = String(row?.name || '').toLowerCase();
        if (owner && owner !== name.toLowerCase()) {
          throw new Error('TABLE_OCCUPIED');
        }

        // 3) Meme client -> reconnexion / heartbeat update
        let { error: updateError } = await supabase
          .from('connected_clients')
          .update({
            name,
            connected_at: now,
            last_seen: now,
          })
          .eq('table_number', tableNumber);

        if (updateError && String(updateError.message).toLowerCase().includes('last_seen')) {
          const retryUpdate = await supabase
            .from('connected_clients')
            .update({
              name,
              connected_at: now,
            })
            .eq('table_number', tableNumber);
          updateError = retryUpdate.error;
        }

        if (updateError) throw updateError;
        return;
      }

      throw insertError;
    } catch (e: any) {
      console.error('Erreur reservation table Supabase:', e);
      if (e?.code === '23505') {
        throw new Error('TABLE_OCCUPIED');
      }
      throw e;
    }
  }, []);

  const reserveTableWithRetry = useCallback(async (name: string, tableNumber: number) => {
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await reserveTableInSupabase(name, tableNumber);
        return;
      } catch (error: any) {
        if (error?.message === 'TABLE_OCCUPIED') {
          throw error;
        }

        const shouldRetry = isNetworkError(error) && attempt < maxAttempts;
        if (!shouldRetry) {
          if (isNetworkError(error)) {
            throw new Error('DB_UNREACHABLE');
          }
          throw error;
        }

        await sleep(400 * attempt);
      }
    }
  }, [reserveTableInSupabase]);

  // ===== CHARGER LES CLIENTS CONNECTÉS =====
  const loadConnectedClients = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('connected_clients')
        .select('*');

      if (!error && data) {
        const clients = data
          .map((c: any) => ({
          id: c.id,
          name: c.name,
          tableNumber: c.table_number,
          connectedAt: new Date(c.connected_at ?? new Date().toISOString()),
          lastActive: new Date(c.last_seen ?? c.connected_at ?? new Date().toISOString()),
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
      // 1. Restaurer la session locale (connexion persistante)
      const stored = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as CustomerSession;
          if (parsed?.name && parsed?.tableNumber) {
            try {
              // Re-enregistrer la presence cote serveur si necessaire.
               await reserveTableWithRetry(parsed.name, parsed.tableNumber);
              setCustomer(parsed);
              setSessionRestored(true);
            } catch {
              // Si la table a ete reprise par un autre client/proprietaire, vider la session locale.
              localStorage.removeItem(CUSTOMER_SESSION_KEY);
              setCustomer(null);
              setSessionRestored(false);
            }
          }
        } catch {
          localStorage.removeItem(CUSTOMER_SESSION_KEY);
          setSessionRestored(false);
        }
      }

      // 2. Charger les clients connectés
      await loadConnectedClients();

      if (!cancelled) {
        setIsReady(true);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [loadConnectedClients, reserveTableWithRetry]);

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

  // Polling de secours multi-appareils (si Realtime est indisponible)
  useEffect(() => {
    if (!isSupabaseConfigured() || !isReady) return;

    const interval = setInterval(() => {
      loadConnectedClients();
    }, 5000);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadConnectedClients();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
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

    // Reservation strictement serveur (pas de mode local).
    if (!isSupabaseConfigured()) {
      throw new Error('Base de donnees indisponible');
    }

    try {
      await reserveTableWithRetry(name, tableNumber);
    } catch (e: any) {
      throw e;
    }

    // Session persistante locale pour garder la connexion apres refresh/fermeture.
    setCustomer(session);
    setSessionRestored(false);
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));

    // Recharger la liste connectee
    await loadConnectedClients();
  }, [reserveTableWithRetry, loadConnectedClients]);

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
    setSessionRestored(false);
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
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
        sessionRestored,
        updateActivity,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export default CustomerProvider;
