declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (response: unknown) => void) => void };
  }
}

const SCRIPT_ID = 'razorpay-checkout-js';
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayCheckout(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay checkout is only available in the browser.'));
  }
  if (window.Razorpay) {
    return Promise.resolve();
  }
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay.'));
    document.body.appendChild(script);
  });
}

export interface RazorpayOpenParams {
  publicKeyId: string;
  providerOrderId: string;
  amountMinor: number;
  currencyCode: string;
  name: string;
  description: string;
  prefillEmail?: string;
  onSuccess: (paymentId: string, signature: string) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(params: RazorpayOpenParams): Promise<void> {
  await loadRazorpayCheckout();
  if (!window.Razorpay) {
    throw new Error('Razorpay is not available.');
  }
  const options: Record<string, unknown> = {
    key: params.publicKeyId,
    amount: params.amountMinor,
    currency: params.currencyCode,
    name: params.name,
    description: params.description,
    order_id: params.providerOrderId,
    prefill: params.prefillEmail ? { email: params.prefillEmail } : undefined,
    handler: (response: { razorpay_payment_id: string; razorpay_signature: string }) => {
      params.onSuccess(response.razorpay_payment_id, response.razorpay_signature);
    },
    modal: {
      ondismiss: () => params.onDismiss?.(),
    },
  };
  const instance = new window.Razorpay(options);
  instance.open();
}
