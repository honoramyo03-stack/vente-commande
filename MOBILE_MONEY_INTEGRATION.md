# Integration Mobile Money (3 Blocs)

Ce document prepare une integration complete pour Orange Money, MVola et Airtel Money.

## Bloc 1: Schema DB des transactions

1. Executer `MOBILE_MONEY_SCHEMA.sql` dans Supabase SQL Editor.
2. Verifier que ces objets existent:
- table `payment_transactions`
- table `payment_webhooks_log`
- colonnes `payment_status`, `payment_provider`, `payment_reference` dans `orders`

## Bloc 2: Endpoints backend securises

Le backend de reference est dans `backend/src/server.js`.

Endpoints:
- `POST /api/payments/initiate` -> cree transaction + met `orders.payment_status=pending`
- `GET /api/payments/:transactionId/status` -> statut transaction
- `POST /api/payments/webhooks/orange-money`
- `POST /api/payments/webhooks/mvola`
- `POST /api/payments/webhooks/airtel-money`

Ce backend doit etre deploye separement (server, serverless, edge).

Variables d'environnement minimales:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- credentials provider Orange/MVola/Airtel (selon docs officielles)

## Bloc 3: Integration front + temps reel

### Front deja prepare
- `src/lib/paymentApi.ts`
  - `initiateMobileMoneyPayment(...)`
  - activable via `VITE_PAYMENT_API_URL`
- `src/pages/Payment.tsx`
  - demarre la transaction via backend (si URL API configuree)
  - ecoute en temps reel `orders` via Supabase Realtime
  - affiche les statuts: `En attente`, `Paye`, `Echoue`

### Variables front

Ajouter dans votre environnement Vite:

```env
VITE_PAYMENT_API_URL=https://votre-api-mobile-money.example.com
```

Si `VITE_PAYMENT_API_URL` est absent, le front bascule en mode manuel (pas d'appel API).

## Cycle complet paiement

1. Client cree la commande.
2. Front appelle `POST /api/payments/initiate`.
3. Backend cree une ligne dans `payment_transactions` (`pending`).
4. Provider envoie webhook au backend.
5. Backend met a jour `payment_transactions.status` + `orders.payment_status`.
6. Front recoit instantanement la mise a jour via Realtime et rafraichit le statut.

## Recommandations de production

- Toujours verifier signature webhook (provider-specific).
- Ajouter idempotency key par `external_reference`.
- Journaliser tous les payloads webhook (table `payment_webhooks_log`).
- Restreindre RLS/roles selon votre politique securite.
- Ne jamais exposer clefs provider ou service role dans le front.
