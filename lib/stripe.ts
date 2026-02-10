/**
 * Mock Payment Gateway - Free alternative for development/demo
 * Simulates payment processing without external service costs
 */

export interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  client_secret: string;
  created: number;
  metadata?: Record<string, string>;
}

/**
 * Create a Mock Payment Intent
 */
export async function createPaymentIntent(params: {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, string>;
}): Promise<MockPaymentIntent> {
  const { amount, currency = 'inr', metadata } = params;

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const paymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const clientSecret = `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`;

  const paymentIntent: MockPaymentIntent = {
    id: paymentIntentId,
    amount: Math.round(amount * 100), // Convert to smallest unit
    currency,
    status: 'pending',
    client_secret: clientSecret,
    created: Date.now(),
    metadata,
  };

  return paymentIntent;
}

/**
 * Retrieve a Mock Payment Intent
 */
export async function getPaymentIntent(paymentIntentId: string): Promise<MockPaymentIntent> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    id: paymentIntentId,
    amount: 0,
    currency: 'inr',
    status: 'succeeded',
    client_secret: `${paymentIntentId}_secret`,
    created: Date.now(),
  };
}

/**
 * Cancel a Mock Payment Intent
 */
export async function cancelPaymentIntent(paymentIntentId: string): Promise<MockPaymentIntent> {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    id: paymentIntentId,
    amount: 0,
    currency: 'inr',
    status: 'canceled',
    client_secret: `${paymentIntentId}_secret`,
    created: Date.now(),
  };
}

/**
 * Create a mock refund
 */
export async function createRefund(paymentIntentId: string, amount?: number) {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    id: `re_mock_${Date.now()}`,
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : 0,
    status: 'succeeded',
    created: Date.now(),
  };
}

/**
 * Mock Customer Creation
 */
export async function createStripeCustomer(params: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}) {
  await new Promise(resolve => setTimeout(resolve, 300));

  return {
    id: `cus_mock_${Date.now()}`,
    email: params.email,
    name: params.name,
    phone: params.phone,
    metadata: params.metadata,
    created: Date.now(),
  };
}
