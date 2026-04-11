-- ============================================================
-- QUICKORDER - SCRIPT SQL COMPLET POUR SUPABASE
-- ============================================================
-- Ce script crée toutes les tables nécessaires au projet
-- Exécutez-le dans SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLE : products
-- Stocke les produits du menu
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  image VARCHAR(500),
  quantity INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. TABLE : connected_clients
-- Gère les clients actuellement connectés (tables occupées)
-- ============================================================
CREATE TABLE IF NOT EXISTS connected_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  table_number INTEGER NOT NULL,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. TABLE : orders
-- Stocke les commandes des clients
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL,
  client_name VARCHAR(255),
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 4. TABLE : messages
-- Stocke les messages du chat (client ↔ vendeur, client ↔ client)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_type VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255),
  sender_table INTEGER,
  recipient_type VARCHAR(50),
  recipient_table INTEGER,
  content TEXT NOT NULL,
  reply_to_id TEXT,
  reply_to_message TEXT,
  reply_to_sender TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. TABLE : seller_accounts
-- Comptes vendeurs pour accéder à l'espace vendeur
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. TABLE : payment_numbers
-- Numéros de paiement mobile (Orange Money, Mvola, Airtel Money)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_numbers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL UNIQUE,
  number VARCHAR(20) NOT NULL,
  merchant_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. DONNÉES INITIALES - Compte vendeur admin
-- Identifiants : admin / password
-- ============================================================
INSERT INTO seller_accounts (username, password, name) VALUES
('admin', 'password', 'Administrateur')
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- 8. DONNÉES INITIALES - Numéros de paiement
-- ============================================================
INSERT INTO payment_numbers (provider, number, merchant_name) VALUES
('orange', '0323943234', 'Honora'),
('mvola', '0345861363', 'Honora'),
('airtel', '0333943234', 'Honora')
ON CONFLICT (provider) DO NOTHING;

-- ============================================================
-- 9. DONNÉES INITIALES - Produits du menu
-- ============================================================
INSERT INTO products (name, description, price, category, image, quantity, is_active) VALUES
('Pizza Margherita', 'Tomate, mozzarella, basilic frais', 12000, 'Pizza', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', 15, true),
('Pizza Quatre Fromages', 'Mozzarella, gorgonzola, parmesan, chevre', 15000, 'Pizza', 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', NULL, true),
('Burger Classique', 'Steak, fromage, salade, tomate', 8000, 'Burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', 20, true),
('Coca-Cola', 'Boisson gazeuse 33cl', 2000, 'Boissons', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=300&fit=crop', 50, true),
('Fanta Orange', 'Boisson gazeuse a l orange 33cl', 2000, 'Boissons', 'https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=400&h=300&fit=crop', 30, true),
('Tiramisu', 'Dessert italien au cafe et mascarpone', 6000, 'Desserts', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop', 10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. ACTIVER LA SYNCHRONISATION TEMPS RÉEL
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE connected_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_numbers;

-- ============================================================
-- 11. POLITIQUES DE SÉCURITÉ (RLS - Row Level Security)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_numbers ENABLE ROW LEVEL SECURITY;

-- Produits : lecture, ajout, modification, suppression pour tous
CREATE POLICY "products_select" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "products_update" ON products FOR UPDATE USING (true);
CREATE POLICY "products_delete" ON products FOR DELETE USING (true);

-- Clients connectés : lecture, ajout, modification, suppression pour tous
CREATE POLICY "connected_clients_select" ON connected_clients FOR SELECT USING (true);
CREATE POLICY "connected_clients_insert" ON connected_clients FOR INSERT WITH CHECK (true);
CREATE POLICY "connected_clients_update" ON connected_clients FOR UPDATE USING (true);
CREATE POLICY "connected_clients_delete" ON connected_clients FOR DELETE USING (true);

-- Commandes : lecture, ajout, modification pour tous
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update" ON orders FOR UPDATE USING (true);

-- Messages : lecture et ajout pour tous
CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);

-- Comptes vendeurs : lecture et ajout pour tous
CREATE POLICY "seller_accounts_select" ON seller_accounts FOR SELECT USING (true);
CREATE POLICY "seller_accounts_insert" ON seller_accounts FOR INSERT WITH CHECK (true);

-- Numéros de paiement : lecture, ajout, modification pour tous
CREATE POLICY "payment_numbers_select" ON payment_numbers FOR SELECT USING (true);
CREATE POLICY "payment_numbers_insert" ON payment_numbers FOR INSERT WITH CHECK (true);
CREATE POLICY "payment_numbers_update" ON payment_numbers FOR UPDATE USING (true);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
