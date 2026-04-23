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
import { PAYSTACK_PLANS, PaystackPlanType, paystackApi } from "@/lib/paystack";
import { useToast } from "@/hooks/use-toast";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId?: string;
  schoolName?: string;
  email?: string;
}

export default function PaymentDialog({ open, onOpenChange, schoolId, schoolName, email }: PaymentDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const handleSubscribe = async (planType: PaystackPlanType) => {
    if (!schoolId || !email) {
      toast({
        title: "Error",
        description: "Missing school or user information. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(planType);
      
      // Initialize payment on backend
      const initResult = await paystackApi.initializePayment({
        schoolId,
        schoolName: schoolName || "My School",
        email,
        callbackUrl: `${window.location.origin}${window.location.pathname}`,
        phone: phone || undefined,
        planType,
        paymentChannel: "card", // Base tracking channel
      });

      if (!initResult.access_code) {
        throw new Error("Paystack did not return an access code.");
      }

      await paystackApi.openInlineCheckout(initResult.access_code);
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none bg-background sm:rounded-2xl shadow-2xl">
        <div className="relative overflow-hidden pt-12 pb-8 px-6 sm:px-10 text-center bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-primary" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 border border-primary/20 shadow-inner">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          
          <DialogTitle className="text-3xl sm:text-4xl font-display font-black tracking-tight mb-3">
            Unlock the Full Power of <span className="text-primary">SchootTime AI</span>
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground max-w-xl mx-auto">
            Generate unlimited timetables, export to PDF/Excel, and manage your entire school with teacher-specific views.
          </DialogDescription>

          <div className="mt-8 max-w-sm mx-auto p-4 bg-primary/5 rounded-xl border border-primary/10">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block text-left">
              Phone Number (Optional - for M-Pesa)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="2547XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10 bg-background/50 border-primary/20 focus:border-primary"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-left">
              Include country code (e.g., 254 for Kenya)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-10 bg-muted/30">
          {(Object.entries(PAYSTACK_PLANS) as [PaystackPlanType, typeof PAYSTACK_PLANS.starter][]).map(([key, plan]) => (
            <div 
              key={key} 
              className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-300 group ${
                plan.popular 
                  ? 'border-primary bg-background shadow-xl scale-105 z-10' 
                  : 'border-border bg-background/50 hover:border-primary/30 hover:bg-background hover:shadow-lg'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-[10px] font-black text-primary-foreground uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{plan.name}</h3>
                <p className="text-xs text-muted-foreground leading-tight h-8">{plan.description}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-muted-foreground">KES</span>
                  <span className="text-4xl font-black tracking-tighter">{(plan.amount / 100).toLocaleString()}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{plan.period}</span>
              </div>
              
              <div className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-foreground/80 leading-tight">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={() => handleSubscribe(key)}
                disabled={loading !== null}
                className={`w-full py-6 rounded-xl font-bold text-sm transition-all duration-300 ${
                  plan.popular 
                    ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20' 
                    : 'variant-outline border-2 border-primary/20 hover:border-primary hover:bg-primary/5'
                }`}
              >
                {loading === key ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Subscribe Now
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-background border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Secure Payment via Paystack</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Instant Activation</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
