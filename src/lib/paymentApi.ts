export type MobileMoneyProvider = 'orange_money' | 'mvola' | 'airtel_money';

export interface InitiatePaymentPayload {
  orderId: string;
  provider: MobileMoneyProvider;
  customerMsisdn?: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  orderId: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  ussdCode?: string;
  checkoutUrl?: string | null;
  externalReference?: string;
}

const apiBase = import.meta.env.VITE_PAYMENT_API_URL as string | undefined;

export const isPaymentApiConfigured = () => Boolean(apiBase);

export async function initiateMobileMoneyPayment(
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResponse> {
  if (!apiBase) {
    throw new Error('PAYMENT_API_NOT_CONFIGURED');
  }

  const response = await fetch(`${apiBase}/api/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'PAYMENT_INIT_FAILED');
  }
  return json as InitiatePaymentResponse;
}
