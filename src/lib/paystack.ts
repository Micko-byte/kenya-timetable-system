export type PaystackPlanType = "starter" | "growth" | "international";
export type PaymentChannel = "card" | "mobile_money";

export interface PaystackPlan {
  name: string;
  amount: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PAYSTACK_PLANS: Record<PaystackPlanType, PaystackPlan> = {
  starter: {
    name: "Starter",
    amount: 350000,
    period: "per term",
    description: "For small private primary schools",
    features: ["Up to 20 classes", "1 admin user", "PDF export", "Email support"],
  },
  growth: {
    name: "Growth",
    amount: 750000,
    period: "per term",
    description: "For mid-size CBC private schools",
    features: ["Up to 50 classes", "3 admin users", "WhatsApp support", "Onboarding call"],
    popular: true,
  },
  international: {
    name: "International",
    amount: 1800000,
    period: "per term",
    description: "For international schools",
    features: ["Unlimited classes", "Unlimited users", "Priority support", "Custom onboarding"],
  },
};

type FunctionResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_FUNCTIONS_URL =
  import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : "");

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_FUNCTIONS_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase functions are not configured.");
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as FunctionResponse<T>;
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Failed to call ${name}`);
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return (payload.data ?? (payload as unknown as T)) as T;
}

declare global {
  interface Window {
    PaystackPop?: new () => {
      checkout: (options: {
        key: string;
        email: string;
        amount: number;
        reference: string;
        currency?: string;
        channels?: PaymentChannel[];
        metadata?: Record<string, unknown>;
        onSuccess?: (transaction: { reference: string; [key: string]: unknown }) => void;
        onCancel?: () => void;
        onError?: (error: Error) => void;
        onLoad?: () => void;
      }) => void;
    };
  }
}

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export interface PaystackInitInput {
  schoolId: string;
  schoolName: string;
  email: string;
  planType: PaystackPlanType;
  paymentChannel: PaymentChannel;
  phone?: string;
}

export interface PaystackInitResult {
  reference: string;
  amount: number;
  currency: string;
}

export interface PaystackVerifyResult {
  reference: string;
  status: string;
  plan_type: PaystackPlanType;
  amount: number;
  currency: string;
  expires_at: string | null;
  subscription_status: string;
}

export const paystackApi = {
  initializePayment: (input: PaystackInitInput) =>
    callFunction<PaystackInitResult>("paystack-init", input),
  verifyPayment: (reference: string) =>
    callFunction<PaystackVerifyResult>("paystack-verify", { reference }),
  openInlineCheckout: async (options: {
    reference: string;
    email: string;
    amount: number;
    currency?: string;
    channels?: PaymentChannel[];
    metadata?: Record<string, unknown>;
    onSuccess: (transaction: { reference: string; [key: string]: unknown }) => void;
    onCancel?: () => void;
    onError?: (error: Error) => void;
    onLoad?: () => void;
  }) => {
    if (!PAYSTACK_PUBLIC_KEY) {
      throw new Error("Missing Paystack public key.");
    }

    if (!window.PaystackPop) {
      await loadPaystackInlineScript();
    }

    if (!window.PaystackPop) {
      throw new Error("Paystack checkout script failed to load.");
    }

    const popup = new window.PaystackPop();
    popup.checkout({
      key: PAYSTACK_PUBLIC_KEY,
      email: options.email,
      amount: options.amount,
      reference: options.reference,
      currency: options.currency || "KES",
      channels: options.channels,
      metadata: options.metadata,
      onSuccess: options.onSuccess,
      onCancel: options.onCancel,
      onError: options.onError,
      onLoad: options.onLoad,
    });
  },
};

function loadPaystackInlineScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-paystack-inline="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack checkout script.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.async = true;
    script.dataset.paystackInline = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Paystack checkout script."));
    document.head.appendChild(script);
  });
}
