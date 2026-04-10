import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Hook générique pour les données Supabase avec fallback localStorage
export function useSupabaseTable<T>(
  tableName: string,
  localStorageKey: string,
  defaultData: T[],
  transform?: (data: any) => T
) {
  const [data, setData] = useState<T[]>(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return defaultData;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  // Charger les données depuis Supabase
  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setIsOnline(false);
      return;
    }

    try {
      const { data: result, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const transformedData = transform 
        ? result?.map(transform) || []
        : result || [];
      
      setData(transformedData);
      setIsOnline(true);
      setError(null);
      
      // Sauvegarder en localStorage comme cache
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(transformedData));
      } catch (e) {
        console.error('Erreur sauvegarde cache:', e);
      }
    } catch (e: any) {
      console.error(`Erreur chargement ${tableName}:`, e);
      setError(e.message);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [tableName, localStorageKey, transform]);

  // Écouter les changements en temps réel
  useEffect(() => {
    fetchData();

    let channel: RealtimeChannel | null = null;

    if (isSupabaseConfigured()) {
      channel = supabase
        .channel(`${tableName}_changes`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          () => {
            fetchData();
          }
        )
        .subscribe();
    }

    // Fallback: écouter les changements localStorage (pour mode hors ligne)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === localStorageKey && e.newValue) {
        try {
          setData(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchData, tableName, localStorageKey]);

  // Sauvegarder localement quand les données changent (mode hors ligne)
  useEffect(() => {
    if (!isOnline) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
    }
  }, [data, isOnline, localStorageKey]);

  return { data, setData, loading, error, isOnline, refetch: fetchData };
}

// Fonctions CRUD génériques
export async function insertRow(tableName: string, data: Record<string, any>): Promise<any | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: result, error } = await supabase
    .from(tableName)
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error(`Erreur insertion ${tableName}:`, error);
    throw error;
  }

  return result;
}

export async function updateRow(
  tableName: string,
  id: string,
  updates: Record<string, any>
): Promise<any | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: result, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Erreur mise à jour ${tableName}:`, error);
    throw error;
  }

  return result;
}

export async function deleteRow(tableName: string, id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Erreur suppression ${tableName}:`, error);
    throw error;
  }

  return true;
}

export async function upsertRow(
  tableName: string,
  data: Record<string, any>,
  conflictColumn: string
): Promise<any | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: result, error } = await supabase
    .from(tableName)
    .upsert(data, { onConflict: conflictColumn })
    .select()
    .single();

  if (error) {
    console.error(`Erreur upsert ${tableName}:`, error);
    throw error;
  }

  return result;
}
