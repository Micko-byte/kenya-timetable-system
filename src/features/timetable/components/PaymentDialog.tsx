import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { BILLING_PLANS } from "@/lib/billingPlans";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl gap-0 overflow-y-auto border-none bg-background p-0 shadow-2xl sm:rounded-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-8 pt-12 text-center sm:px-10">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-primary/50 to-primary" />
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-inner">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          <DialogTitle className="mb-3 text-3xl font-display font-black tracking-tight sm:text-4xl">
            Unlock the Full Power of <span className="text-primary">ElimuTime</span>
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-xl text-base text-muted-foreground">
            Exports unlock after your subscription is active. Review plans and manage billing from the billing page.
          </DialogDescription>
        </div>

        <div className="grid grid-cols-1 gap-6 bg-muted/30 p-6 sm:p-10 md:grid-cols-3">
          {Object.entries(BILLING_PLANS).map(([key, plan]) => (
            <div
              key={key}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all duration-300 ${
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
                <h3 className="mb-1 text-xl font-bold">{plan.name}</h3>
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
                onClick={() => {
                  onOpenChange(false);
                  navigate("/billing");
                }}
                className={`w-full rounded-xl py-6 text-sm font-bold transition-all duration-300 ${
                  plan.popular
                    ? 'bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90'
                    : 'border-2 border-primary/20 hover:border-primary hover:bg-primary/5'
                }`}
                variant={plan.popular ? "default" : "outline"}
              >
                Open Billing
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-border bg-background p-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Subscription Status Checked Before Export</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
