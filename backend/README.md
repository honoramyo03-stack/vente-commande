## Mobile Money Backend (Secure Endpoints)

This backend is the secure layer for Orange Money / MVola / Airtel Money.
Never expose provider credentials in React.

## Endpoints

- `POST /api/payments/initiate`
- `GET /api/payments/:transactionId/status`
- `POST /api/payments/webhooks/orange-money`
- `POST /api/payments/webhooks/mvola`
- `POST /api/payments/webhooks/airtel-money`
- `GET /health`

## Local start

1. Copy `.env.example` to `.env`.
2. Fill values.
3. Install and run:

```bash
cd backend
npm install
npm run dev
```

## Render deployment (exact)

1. Push project to GitHub.
2. On Render: New + > Web Service.
3. Select repo.
4. Configure:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`
5. Add environment variables (from `.env.example`).
6. Deploy.

## Railway deployment (exact)

1. New Project > Deploy from GitHub.
2. Select repo.
3. Set Root Directory to `backend`.
4. Railway reads `backend/railway.json`.
5. Add environment variables (from `.env.example`).
6. Deploy.

## Copy/paste .env (template)

```env
PORT=4000

SUPABASE_URL=https://dcfzxnxolubxmmrczwlf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY

CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:5173

ORANGE_API_BASE=https://api.orange.example
ORANGE_CLIENT_ID=REPLACE_ORANGE_CLIENT_ID
ORANGE_CLIENT_SECRET=REPLACE_ORANGE_CLIENT_SECRET
ORANGE_WEBHOOK_SECRET=REPLACE_ORANGE_WEBHOOK_SECRET

MVOLA_API_BASE=https://api.mvola.example
MVOLA_API_KEY=REPLACE_MVOLA_API_KEY
MVOLA_WEBHOOK_SECRET=REPLACE_MVOLA_WEBHOOK_SECRET

AIRTEL_API_BASE=https://api.airtel.example
AIRTEL_CLIENT_ID=REPLACE_AIRTEL_CLIENT_ID
AIRTEL_CLIENT_SECRET=REPLACE_AIRTEL_CLIENT_SECRET
AIRTEL_WEBHOOK_SECRET=REPLACE_AIRTEL_WEBHOOK_SECRET
```

## Frontend config after backend deploy

Set in frontend env:

```env
VITE_PAYMENT_API_URL=https://your-backend-domain.onrender.com
```

Then redeploy frontend.

## Security reminders

- Validate webhook signatures per provider.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in backend.
- Restrict CORS to your real frontend domains.