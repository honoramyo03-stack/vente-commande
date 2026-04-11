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
    try {
      const now = new Date().toISOString();

      const { data: rows, error: selectError } = await supabase
        .from('connected_clients')
        .select('*')
        .eq('table_number', tableNumber);

      if (selectError) {
        throw selectError;
      }

      const existing = (rows ?? []).reduce((latest: any, current: any) => {
        if (!latest) return current;
        const latestTs = new Date(latest.last_seen ?? latest.connected_at ?? 0).getTime();
        const currentTs = new Date(current.last_seen ?? current.connected_at ?? 0).getTime();
        return currentTs > latestTs ? current : latest;
      }, null);

      // Si des doublons existent (ancienne mauvaise config DB), on garde la plus recente.
      if (rows && rows.length > 1) {
        const duplicateIds = rows.slice(1).map((r: any) => r.id).filter(Boolean);
        if (duplicateIds.length) {
          await supabase.from('connected_clients').delete().in('id', duplicateIds);
        }
      }

      // Table deja occupee par un autre client: blocage strict
      if (existing && String(existing.name).toLowerCase() !== name.toLowerCase()) {
        throw new Error('TABLE_OCCUPIED');
      }

      if (existing) {
        let { error: updateError } = await supabase
          .from('connected_clients')
          .update({
            name,
            connected_at: now,
            last_seen: now,
          })
          .eq('table_number', tableNumber);

        // Compatibilite schema: certains environnements n'ont pas last_seen.
        if (updateError && String(updateError.message).toLowerCase().includes('last_seen')) {
          const retry = await supabase
            .from('connected_clients')
            .update({
              name,
              connected_at: now,
            })
            .eq('table_number', tableNumber);
          updateError = retry.error;
        }

        if (updateError) throw updateError;
      } else {
        let { error: insertError } = await supabase
          .from('connected_clients')
          .insert({
            name,
            table_number: tableNumber,
            connected_at: now,
            last_seen: now,
          });

        // Compatibilite schema: certains environnements n'ont pas last_seen.
        if (insertError && String(insertError.message).toLowerCase().includes('last_seen')) {
          const retry = await supabase
            .from('connected_clients')
            .insert({
              name,
              table_number: tableNumber,
              connected_at: now,
            });
          insertError = retry.error;
        }

        if (insertError) throw insertError;
      }
    } catch (e: any) {
      console.error('Erreur reservation table Supabase:', e);
      // Unique constraint sur table_number: traduire en erreur metier claire.
      if (e?.code === '23505') {
        throw new Error('TABLE_OCCUPIED');
      }
      throw e;
    }
  }, []);

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
              await reserveTableInSupabase(parsed.name, parsed.tableNumber);
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
  }, [loadConnectedClients, reserveTableInSupabase]);

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
      await reserveTableInSupabase(name, tableNumber);
    } catch (e: any) {
      throw e;
    }

    // Session persistante locale pour garder la connexion apres refresh/fermeture.
    setCustomer(session);
    setSessionRestored(false);
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));

    // Recharger la liste connectee
    await loadConnectedClients();
  }, [reserveTableInSupabase, loadConnectedClients]);

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
