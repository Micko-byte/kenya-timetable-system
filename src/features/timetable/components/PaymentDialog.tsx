import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Sparkles, ShieldCheck, Zap, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PAYSTACK_PLANS,
  PaystackPlanType,
  isValidKenyanMobileMoneyPhone,
  normalizeKenyanPhoneNumber,
  paystackApi,
} from "@/lib/paystack";
import { useToast } from "@/hooks/use-toast";

const ACTIVE_PAYSTACK_PLAN_KEYS: PaystackPlanType[] = ["starter", "international"];

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId?: string;
  schoolName?: string;
  email?: string;
  /** Called after a payment is verified and the subscription is active. */
  onPaymentVerified?: () => void;
}

export default function PaymentDialog({ open, onOpenChange, schoolId, schoolName, email, onPaymentVerified }: PaymentDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  // Verify the payment server-side, then activate + close the dialog. Without
  // this the popup would close on success but the app would never know it.
  const finalizePayment = async (reference: string) => {
    if (!reference) {
      setLoading(null);
      toast({
        title: "Couldn't read payment reference",
        description: "If you were charged, open Billing to confirm your subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      const verification = await paystackApi.verifyPayment(reference);
      const activated =
        verification.subscription_status === "active" || verification.status === "success";

      if (!activated) {
        throw new Error("Payment is still processing. Your subscription will activate once confirmed.");
      }

      toast({
        title: "Subscription activated 🎉",
        description: "Payment verified — premium features are now unlocked.",
      });
      onPaymentVerified?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Verification issue",
        description: error.message || "We couldn't verify the payment yet.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planType: PaystackPlanType) => {
    if (!schoolId || !email) {
      toast({
        title: "Error",
        description: "Missing school or user information. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (phone && !isValidKenyanMobileMoneyPhone(phone)) {
      toast({
        title: "Invalid phone number",
        description: "Use 07XXXXXXXX or 2547XXXXXXXX for M-Pesa checkout support.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(planType);

      const initResult = await paystackApi.initializePayment({
        schoolId,
        schoolName: schoolName || "My School",
        email,
        callbackUrl: `${window.location.origin}${window.location.pathname}`,
        phone: phone ? normalizeKenyanPhoneNumber(phone) : undefined,
        planType,
        amount: PAYSTACK_PLANS[planType].amount,
        paymentChannel: phone ? "mobile_money" : "card",
      });

      if (!initResult.access_code) {
        throw new Error("Paystack did not return an access code.");
      }

      // The popup's callbacks fire asynchronously — keep the button in its
      // loading state until one of them resolves (do NOT clear it here).
      await paystackApi.openInlineCheckout(initResult.access_code, {
        onSuccess: (reference) => {
          void finalizePayment(reference || initResult.reference);
        },
        onCancel: () => {
          setLoading(null);
          toast({
            title: "Checkout closed",
            description: "No payment was made. You can subscribe whenever you're ready.",
          });
        },
        onError: (error) => {
          setLoading(null);
          toast({
            title: "Payment error",
            description: error.message || "Paystack checkout failed.",
            variant: "destructive",
          });
        },
      });
    } catch (error: any) {
      setLoading(null);
      console.error("Payment initialization error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl gap-0 overflow-y-auto border-none bg-background p-0 shadow-2xl sm:rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Upgrade your subscription</DialogTitle>
          <DialogDescription>Choose a plan and complete your Paystack checkout.</DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-8 pt-12 text-center sm:px-10">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-primary/50 to-primary" />
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl animate-pulse" />

          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
          </div>

          <DialogTitle className="mb-3 text-3xl font-display font-black tracking-tight sm:text-4xl">
            Unlock the Full Power of <span className="text-primary">ElimuTime</span>
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-xl text-base text-muted-foreground">
            Generate unlimited timetables, export to PDF and Excel, and manage your whole school with secure Paystack checkout.
          </DialogDescription>

          <div className="mx-auto mt-8 max-w-sm rounded-xl border border-primary/10 bg-primary/5 p-4">
            <Label htmlFor="phone" className="mb-2 block text-left text-xs font-bold uppercase tracking-wider text-primary">
              Phone Number (Optional - for M-Pesa)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="2547XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-primary/20 bg-background/50 pl-10 focus:border-primary"
              />
            </div>
            <p className="mt-2 text-left text-[10px] text-muted-foreground">
              Include country code for Kenya mobile money support.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 bg-muted/30 p-6 sm:p-10 md:grid-cols-3">
          {ACTIVE_PAYSTACK_PLAN_KEYS.map((key) => {
            const plan = PAYSTACK_PLANS[key];
            return (
            <div
              key={key}
              className={`group relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 ${
                plan.popular
                  ? 'z-10 scale-105 border-primary bg-background shadow-xl'
                  : 'border-border bg-background/50 hover:border-primary/30 hover:bg-background hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="mb-1 text-xl font-bold transition-colors group-hover:text-primary">{plan.name}</h3>
                <p className="h-8 text-xs leading-tight text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-muted-foreground">KES</span>
                  <span className="text-4xl font-black tracking-tighter">{(plan.amount / 100).toLocaleString()}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{plan.period}</span>
              </div>

              <div className="mb-8 flex-grow space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm">
                    <div className="mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <span className="leading-tight text-foreground/80">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => void handleSubscribe(key)}
                disabled={loading !== null}
                className={`w-full rounded-xl py-6 text-sm font-bold transition-all duration-300 ${
                  plan.popular
                    ? 'bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90'
                    : 'border-2 border-primary/20 hover:border-primary hover:bg-primary/5'
                }`}
                variant={plan.popular ? "default" : "outline"}
              >
                {loading === key ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </div>
          )})}
        </div>

        <div className="border-t border-border bg-background p-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Secure Payment via Paystack</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Instant Activation</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
