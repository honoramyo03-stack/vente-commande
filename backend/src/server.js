import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const allowedOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS_NOT_ALLOWED'));
    },
  })
);
app.use(express.json({ limit: '1mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const providerAdapters = {
  orange_money: {
    async initiate({ amount, orderId, customerMsisdn }) {
      const ref = `OR-${orderId}-${Date.now()}`;
      return {
        externalReference: ref,
        checkoutUrl: null,
        ussdCode: `*144*1*1*0323943234*${Math.floor(amount)}#`,
        providerTransactionId: null,
        message: 'Initiated with Orange Money',
      };
    },
  },
  mvola: {
    async initiate({ amount, orderId }) {
      const ref = `MV-${orderId}-${Date.now()}`;
      return {
        externalReference: ref,
        checkoutUrl: null,
        ussdCode: `*114*1*0345861363*${Math.floor(amount)}#`,
        providerTransactionId: null,
        message: 'Initiated with MVola',
      };
    },
  },
  airtel_money: {
    async initiate({ amount, orderId }) {
      const ref = `AM-${orderId}-${Date.now()}`;
      return {
        externalReference: ref,
        checkoutUrl: null,
        ussdCode: `*436*1*0333943234*${Math.floor(amount)}#`,
        providerTransactionId: null,
        message: 'Initiated with Airtel Money',
      };
    },
  },
};

app.post('/api/payments/initiate', async (req, res) => {
  try {
    const { orderId, provider, customerMsisdn } = req.body;
    if (!orderId || !provider) {
      return res.status(400).json({ error: 'orderId and provider are required' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id,total,status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const adapter = providerAdapters[provider];
    if (!adapter) {
      return res.status(400).json({ error: 'Unsupported provider' });
    }

    const initiated = await adapter.initiate({ amount: order.total, orderId, customerMsisdn });

    const { data: tx, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        provider,
        amount: order.total,
        currency: 'MGA',
        status: 'pending',
        external_reference: initiated.externalReference,
        provider_transaction_id: initiated.providerTransactionId,
        provider_message: initiated.message,
        customer_msisdn: customerMsisdn || null,
        checkout_url: initiated.checkoutUrl,
        ussd_code: initiated.ussdCode,
      })
      .select('*')
      .single();

    if (txError) {
      return res.status(500).json({ error: 'Unable to create payment transaction', details: txError.message });
    }

    await supabase
      .from('orders')
      .update({
        payment_status: 'pending',
        payment_provider: provider,
        payment_reference: initiated.externalReference,
      })
      .eq('id', orderId);

    return res.json({
      transactionId: tx.id,
      orderId,
      paymentStatus: 'pending',
      ussdCode: initiated.ussdCode,
      checkoutUrl: initiated.checkoutUrl,
      externalReference: initiated.externalReference,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Payment initiation failed', details: error.message });
  }
});

app.get('/api/payments/:transactionId/status', async (req, res) => {
  const { transactionId } = req.params;
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('id,status,provider,provider_message,external_reference')
    .eq('id', transactionId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  return res.json(data);
});

async function handleWebhook(provider, req, res) {
  const payload = req.body;
  const signature = req.headers['x-signature'];

  // Placeholder signature validation. Replace with provider-specific algorithm.
  const validSignature = !!signature;

  await supabase.from('payment_webhooks_log').insert({
    provider,
    event_type: payload?.event || null,
    external_reference: payload?.externalReference || payload?.reference || null,
    payload,
    signature_valid: validSignature,
  });

  const externalReference = payload?.externalReference || payload?.reference;
  if (!externalReference) return res.status(400).json({ error: 'Missing external reference' });

  const normalizedStatus = String(payload?.status || '').toLowerCase();
  const mappedStatus = normalizedStatus === 'success' || normalizedStatus === 'paid' ? 'paid' : 'failed';

  const { data: tx } = await supabase
    .from('payment_transactions')
    .update({ status: mappedStatus, provider_message: payload?.message || null })
    .eq('external_reference', externalReference)
    .select('*')
    .single();

  if (tx?.order_id) {
    const orderStatus = mappedStatus === 'paid' ? 'paid' : 'pending';
    await supabase
      .from('orders')
      .update({
        status: orderStatus,
        payment_status: mappedStatus,
        payment_error: mappedStatus === 'failed' ? payload?.message || 'Payment failed' : null,
        paid_at: mappedStatus === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', tx.order_id);
  }

  return res.json({ ok: true });
}

app.post('/api/payments/webhooks/orange-money', (req, res) => handleWebhook('orange_money', req, res));
app.post('/api/payments/webhooks/mvola', (req, res) => handleWebhook('mvola', req, res));
app.post('/api/payments/webhooks/airtel-money', (req, res) => handleWebhook('airtel_money', req, res));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'mobile-money-api' }));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Mobile Money API listening on :${port}`);
});
