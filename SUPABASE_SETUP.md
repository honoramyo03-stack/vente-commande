# Configuration Supabase pour la plateforme de commande

## 1. Créer un compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte gratuit (avec GitHub ou email)
3. Créez un nouveau projet avec un nom comme "resto-commande"
4. Notez le mot de passe de la base de données
5. Attendez que le projet soit créé (2-3 minutes)

## 2. Récupérer les clés API

1. Dans votre projet Supabase, allez dans **Settings** (icône engrenage)
2. Cliquez sur **API** dans le menu gauche
3. Vous verrez :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public** : Une longue clé commençant par `eyJ...`

## 3. Configurer l'application

Ouvrez le fichier `src/lib/supabase.ts` et remplacez les valeurs :

```typescript
const supabaseUrl = 'https://VOTRE_PROJECT_ID.supabase.co'
const supabaseAnonKey = 'VOTRE_CLE_ANON_ICI'
```

## 4. Créer les tables dans Supabase

Allez dans **SQL Editor** dans Supabase et exécutez ce SQL :

```sql
-- =============================================
-- TABLES POUR LA PLATEFORME DE COMMANDE
-- =============================================

-- Table des comptes vendeurs
CREATE TABLE IF NOT EXISTS seller_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compte admin par défaut (mot de passe: password)
INSERT INTO seller_accounts (username, password) 
VALUES ('admin', 'password')
ON CONFLICT (username) DO NOTHING;

-- Table des catégories de produits
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT 'gray',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Catégories par défaut
INSERT INTO categories (name, color) VALUES 
  ('Plats', 'orange'),
  ('Boissons', 'blue'),
  ('Desserts', 'pink'),
  ('Entrées', 'green'),
  ('Snacks', 'yellow')
ON CONFLICT DO NOTHING;

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image VARCHAR(500),
  category VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produits par défaut
INSERT INTO products (name, description, price, category, quantity, is_active) VALUES 
  ('Riz cantonais', 'Riz sauté aux légumes et œufs', 8000, 'Plats', 50, true),
  ('Poulet braisé', 'Poulet grillé avec sauce spéciale', 15000, 'Plats', 30, true),
  ('Brochettes de bœuf', 'Brochettes de viande grillée', 12000, 'Plats', 40, true),
  ('Salade composée', 'Salade fraîche de saison', 5000, 'Entrées', 25, true),
  ('Coca-Cola', 'Boisson gazeuse 33cl', 2500, 'Boissons', 100, true),
  ('Jus de mangue', 'Jus de fruit naturel', 3000, 'Boissons', 50, true),
  ('Eau minérale', 'Bouteille 50cl', 1500, 'Boissons', 200, true),
  ('Gâteau chocolat', 'Part de gâteau maison', 4000, 'Desserts', 20, true),
  ('Glace vanille', 'Coupe de glace artisanale', 3500, 'Desserts', 30, true),
  ('Samosa', 'Beignet farci à la viande', 1000, 'Snacks', 60, true)
ON CONFLICT DO NOTHING;

-- Table des clients connectés
CREATE TABLE IF NOT EXISTS connected_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  table_number INTEGER NOT NULL UNIQUE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_number INTEGER NOT NULL,
  client_name VARCHAR(255),
  items JSONB NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des messages du chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_type VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255),
  table_number INTEGER,
  recipient_type VARCHAR(50),
  recipient_table_number INTEGER,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des moyens de paiement
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) UNIQUE NOT NULL,
  number VARCHAR(50) NOT NULL,
  merchant_name VARCHAR(255) DEFAULT 'Honora',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moyens de paiement par défaut
INSERT INTO payment_methods (type, number, merchant_name, is_active) VALUES 
  ('orange', '0323943234', 'Honora', true),
  ('mvola', '0345861363', 'Honora', true),
  ('airtel', '0333943234', 'Honora', true)
ON CONFLICT (type) DO NOTHING;

-- =============================================
-- ACTIVER LA SYNCHRONISATION EN TEMPS RÉEL
-- =============================================

-- Activer Realtime pour les tables importantes
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE connected_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- =============================================
-- POLITIQUES DE SÉCURITÉ (RLS)
-- =============================================

-- Activer RLS sur toutes les tables
ALTER TABLE seller_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Politiques pour permettre l'accès public (pour la démo)
-- En production, vous devriez restreindre ces accès

CREATE POLICY "Accès public lecture seller_accounts" ON seller_accounts FOR SELECT USING (true);
CREATE POLICY "Accès public insertion seller_accounts" ON seller_accounts FOR INSERT WITH CHECK (true);

CREATE POLICY "Accès public lecture products" ON products FOR SELECT USING (true);
CREATE POLICY "Accès public modification products" ON products FOR ALL USING (true);

CREATE POLICY "Accès public lecture categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Accès public modification categories" ON categories FOR ALL USING (true);

CREATE POLICY "Accès public lecture orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Accès public modification orders" ON orders FOR ALL USING (true);

CREATE POLICY "Accès public lecture chat_messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Accès public modification chat_messages" ON chat_messages FOR ALL USING (true);

CREATE POLICY "Accès public lecture connected_clients" ON connected_clients FOR SELECT USING (true);
CREATE POLICY "Accès public modification connected_clients" ON connected_clients FOR ALL USING (true);

CREATE POLICY "Accès public lecture payment_methods" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Accès public modification payment_methods" ON payment_methods FOR ALL USING (true);
```

## 5. Tester l'application multi-utilisateur

### Test 1 : Deux clients sur des appareils différents
1. Ouvrez l'application sur votre téléphone
2. Ouvrez l'application sur un autre téléphone ou ordinateur
3. Connectez-vous avec des tables différentes (ex: Table 1 et Table 5)
4. Vérifiez que les deux voient les mêmes produits
5. Passez une commande depuis un appareil
6. Vérifiez que la commande apparaît dans l'espace vendeur sur l'autre appareil

### Test 2 : Chat en temps réel
1. Client 1 : Envoyez un message au vendeur
2. Vendeur : Vérifiez que le message apparaît instantanément
3. Vendeur : Répondez au client
4. Client 1 : Vérifiez que la réponse apparaît instantanément

### Test 3 : Tables occupées
1. Client 1 : Connectez-vous à la Table 3
2. Client 2 : Essayez de vous connecter à la Table 3
3. Vérifiez que la Table 3 est marquée comme occupée et non sélectionnable

### Test 4 : Gestion des stocks
1. Vendeur : Définissez un produit avec quantité = 5
2. Client : Ajoutez ce produit au panier (quantité 3)
3. Client : Passez la commande
4. Vérifiez que le stock passe à 2
5. Autre client : Vérifiez qu'il ne peut pas commander plus de 2

## 6. Vérifier dans Supabase

Dans le tableau de bord Supabase :
1. Allez dans **Table Editor**
2. Vous verrez toutes vos tables avec les données
3. Chaque nouvelle commande, message ou client apparaît ici

## 7. Dépannage

### Les données ne se synchronisent pas
- Vérifiez que les clés API sont correctes dans `src/lib/supabase.ts`
- Vérifiez que Realtime est activé (le SQL ci-dessus le fait)
- Ouvrez la console du navigateur (F12) pour voir les erreurs

### Erreur "relation does not exist"
- Le SQL n'a pas été exécuté correctement
- Réexécutez le SQL dans l'éditeur Supabase

### Les politiques RLS bloquent l'accès
- Assurez-vous d'avoir exécuté toutes les politiques CREATE POLICY
