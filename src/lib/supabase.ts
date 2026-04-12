import { createClient } from '@supabase/supabase-js'

// Source de verite: variables d'environnement Vercel/Vite.
// Fallback fourni pour eviter les erreurs en environnement sans .env local.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dcfzxnxolubxmmrczwlf.supabase.co'

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_BSC4b2gskRtng6L-NJNN0g_ODY5vF2G'

// Vérifier si Supabase est configuré
// Vérifier si Supabase est configuré (fonction runtime)
export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl.includes('supabase.co') && supabaseAnonKey.length > 50
}

// Créer le client Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

// Types pour les tables
export interface DbProduct {
  id: string
  name: string
  description: string | null
  price: number
  image: string | null
  category: string
  quantity: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbOrder {
  id: string
  table_number: number
  client_name: string | null
  items: Array<{
    productId: string
    name: string
    price: number
    quantity: number
  }>
  total: number
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  payment_method: string | null
  payment_status: 'pending' | 'paid' | 'failed'
  created_at: string
  updated_at: string
}

export interface DbChatMessage {
  id: string
  sender_type: 'client' | 'seller'
  sender_name: string | null
  table_number: number | null
  recipient_type: 'client' | 'seller' | null
  recipient_table_number: number | null
  message: string
  created_at: string
}

export interface DbConnectedClient {
  id: string
  name: string
  table_number: number
  connected_at: string
  last_seen: string
}

export interface DbSellerAccount {
  id: string
  username: string
  password: string
  created_at: string
}

export interface DbPaymentMethod {
  id: string
  type: 'orange' | 'mvola' | 'airtel'
  number: string
  merchant_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DbCategory {
  id: string
  name: string
  color: string
  created_at: string
}
