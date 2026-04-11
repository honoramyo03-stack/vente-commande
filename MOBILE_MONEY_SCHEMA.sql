-- Mobile Money integration schema (Orange Money, MVola, Airtel Money)
-- Run this in Supabase SQL Editor.

-- 1) Extend orders for payment lifecycle tracking
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120),
ADD COLUMN IF NOT EXISTS payment_error TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2) Payment transactions table (one order can have multiple attempts)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('orange_money','mvola','airtel_money')),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'MGA',
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled','expired')),
  external_reference VARCHAR(150),
  provider_transaction_id VARCHAR(150),
  provider_message TEXT,
  customer_msisdn VARCHAR(30),
  checkout_url TEXT,
  ussd_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_ref ON payment_transactions(external_reference);

-- 3) Optional audit trail for webhook payloads
CREATE TABLE IF NOT EXISTS payment_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(30) NOT NULL,
  event_type VARCHAR(80),
  external_reference VARCHAR(150),
  payload JSONB NOT NULL,
  signature_valid BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Keep updated_at fresh on write
CREATE OR REPLACE FUNCTION set_updated_at_now()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
BEFORE UPDATE ON payment_transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at_now();

-- 5) Realtime publications
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 6) RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'payment_tx_read_all'
  ) THEN
    CREATE POLICY payment_tx_read_all ON payment_transactions FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'payment_tx_insert_all'
  ) THEN
    CREATE POLICY payment_tx_insert_all ON payment_transactions FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_transactions' AND policyname = 'payment_tx_update_all'
  ) THEN
    CREATE POLICY payment_tx_update_all ON payment_transactions FOR UPDATE USING (true);
  END IF;
END $$;

-- 7) Optional helper view for current payment attempt per order
CREATE OR REPLACE VIEW v_order_last_payment AS
SELECT DISTINCT ON (pt.order_id)
  pt.order_id,
  pt.id AS payment_transaction_id,
  pt.provider,
  pt.status,
  pt.external_reference,
  pt.provider_transaction_id,
  pt.created_at,
  pt.updated_at
FROM payment_transactions pt
ORDER BY pt.order_id, pt.created_at DESC;