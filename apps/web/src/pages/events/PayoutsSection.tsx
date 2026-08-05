import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, CreditCard, Landmark, Trash2, Wallet } from "lucide-react";
import {
  providerLabel,
  useConnectPaypal,
  useConnectPaystack,
  useConnectStripe,
  useDisconnectPayoutAccount,
  usePaystackBanks,
  usePayoutAccounts,
} from "@/hooks/usePayouts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api";
import { CURRENCIES } from "@/lib/format";
import type { CurrencyCode, PayoutAccountRecord, PayoutProvider } from "@/types";

// Which providers a given currency can route through -- mirrors
// STRIPE_COUNTRY_BY_CURRENCY in payouts.service.ts (Stripe Connect only
// covers USD/GBP; PayPal is offered everywhere).
const PROVIDERS_BY_CURRENCY: Record<CurrencyCode, PayoutProvider[]> = {
  USD: ["STRIPE_CONNECT", "PAYPAL"],
  GBP: ["STRIPE_CONNECT", "PAYPAL"],
  NGN: ["PAYSTACK", "PAYPAL"],
};

function providerIcon(provider: PayoutProvider) {
  if (provider === "STRIPE_CONNECT") return <CreditCard className="h-4 w-4" />;
  if (provider === "PAYSTACK") return <Landmark className="h-4 w-4" />;
  return <Wallet className="h-4 w-4" />;
}

function findAccount(accounts: PayoutAccountRecord[], currency: CurrencyCode, provider: PayoutProvider) {
  return accounts.find((a) => a.currency === currency && a.provider === provider);
}

export function PayoutsSection({ eventId }: { eventId: string }) {
  const { data: accounts, isLoading } = usePayoutAccounts(eventId);
  const disconnect = useDisconnectPayoutAccount(eventId);
  const connectStripe = useConnectStripe(eventId);
  const [paystackModal, setPaystackModal] = useState(false);
  const [paypalModal, setPaypalModal] = useState<CurrencyCode | null>(null);

  async function handleConnectStripe(currency: "USD" | "GBP") {
    try {
      const { onboardingUrl } = await connectStripe.mutateAsync(currency);
      // Full-page redirect: Stripe's own hosted onboarding page collects
      // bank details directly, we never see them (see payouts.service.ts).
      window.location.href = onboardingUrl;
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleDisconnect(account: PayoutAccountRecord) {
    if (!confirm(`Disconnect ${providerLabel(account.provider)} for ${account.currency}? Guests won't be able to check out in ${account.currency} through it anymore.`)) {
      return;
    }
    try {
      await disconnect.mutateAsync(account.id);
      toast.success("Payout account disconnected");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Payout Accounts</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Connect where guest merchandise payments should land, per currency. At least one provider must be connected
        for a currency before guests can check out in it.
      </p>

      {isLoading || !accounts ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {CURRENCIES.map((currency) => {
            const providers = PROVIDERS_BY_CURRENCY[currency.code];
            return (
              <div key={currency.code} className="rounded-xl border border-slate-100 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-900">
                  {currency.symbol} {currency.code} — {currency.label}
                </p>
                <div className="flex flex-wrap gap-3">
                  {providers.map((provider) => {
                    const account = findAccount(accounts, currency.code, provider);
                    const connected = account?.connected;
                    return (
                      <div
                        key={provider}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        {providerIcon(provider)}
                        <span className="font-medium text-slate-700">{providerLabel(provider)}</span>
                        {connected ? (
                          <>
                            <Badge variant="success">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Connected
                            </Badge>
                            {provider === "PAYSTACK" && account?.paystackBankName && (
                              <span className="text-xs text-slate-500">
                                {account.paystackBankName} ••••{account.paystackAccountLast4}
                              </span>
                            )}
                            {provider === "PAYPAL" && account?.paypalEmail && (
                              <span className="text-xs text-slate-500">{account.paypalEmail}</span>
                            )}
                            <button
                              onClick={() => handleDisconnect(account!)}
                              aria-label={`Disconnect ${providerLabel(provider)} for ${currency.code}`}
                              className="ml-1 rounded p-1 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : account && provider === "STRIPE_CONNECT" ? (
                          <>
                            <Badge variant="warning">Onboarding incomplete</Badge>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleConnectStripe(currency.code as "USD" | "GBP")}
                              isLoading={connectStripe.isPending}
                            >
                              Finish setup
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              if (provider === "STRIPE_CONNECT") handleConnectStripe(currency.code as "USD" | "GBP");
                              else if (provider === "PAYSTACK") setPaystackModal(true);
                              else setPaypalModal(currency.code);
                            }}
                            isLoading={provider === "STRIPE_CONNECT" && connectStripe.isPending}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PaystackConnectModal eventId={eventId} open={paystackModal} onClose={() => setPaystackModal(false)} />
      <PaypalConnectModal
        eventId={eventId}
        currency={paypalModal}
        onClose={() => setPaypalModal(null)}
      />
    </Card>
  );
}

const paystackSchema = z.object({
  bankCode: z.string().min(1, "Select a bank"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Nigerian account numbers are 10 digits"),
});
type PaystackFormValues = z.infer<typeof paystackSchema>;

function PaystackConnectModal({ eventId, open, onClose }: { eventId: string; open: boolean; onClose: () => void }) {
  const { data: banks, isLoading: banksLoading } = usePaystackBanks(eventId, open);
  const connectPaystack = useConnectPaystack(eventId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaystackFormValues>({ resolver: zodResolver(paystackSchema), defaultValues: { bankCode: "", accountNumber: "" } });

  async function onSubmit(values: PaystackFormValues) {
    try {
      const result = await connectPaystack.mutateAsync(values);
      toast.success(`Connected -- account holder: ${result.accountName}`);
      reset();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Connect a Naira payout account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-500">
          Guest payments in NGN will settle directly to this bank account via Paystack. We never store the raw
          account number.
        </p>
        <Field label="Bank" htmlFor="ps-bank" error={errors.bankCode?.message}>
          <Select id="ps-bank" {...register("bankCode")} disabled={banksLoading}>
            <option value="">{banksLoading ? "Loading banks…" : "Select a bank"}</option>
            {banks?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Account number" htmlFor="ps-account" error={errors.accountNumber?.message}>
          <Input id="ps-account" inputMode="numeric" maxLength={10} placeholder="0123456789" {...register("accountNumber")} error={!!errors.accountNumber} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Connect
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const paypalSchema = z.object({
  email: z.string().trim().email("Enter a valid PayPal email address"),
});
type PaypalFormValues = z.infer<typeof paypalSchema>;

function PaypalConnectModal({
  eventId,
  currency,
  onClose,
}: {
  eventId: string;
  currency: CurrencyCode | null;
  onClose: () => void;
}) {
  const connectPaypal = useConnectPaypal(eventId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaypalFormValues>({ resolver: zodResolver(paypalSchema), defaultValues: { email: "" } });

  async function onSubmit(values: PaypalFormValues) {
    if (!currency) return;
    try {
      await connectPaypal.mutateAsync({ currency, email: values.email });
      toast.success(`PayPal connected for ${currency}`);
      reset();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={!!currency} onClose={onClose} title={`Connect PayPal for ${currency ?? ""}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-slate-500">
          Guest payments in {currency} will route to this PayPal account. Our platform fee may not apply on PayPal
          orders until we've completed PayPal's partner enrollment -- the planner keeps 100% in the meantime.
        </p>
        <Field label="PayPal email" htmlFor="pp-email" error={errors.email?.message}>
          <Input id="pp-email" type="email" placeholder="you@example.com" {...register("email")} error={!!errors.email} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Connect
          </Button>
        </div>
      </form>
    </Modal>
  );
}
