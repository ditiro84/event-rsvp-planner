import { Link } from "react-router-dom";
import {
  Armchair,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Mail,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Public marketing page at "/" -- the app used to redirect straight to
// /login here, which meant a visitor had nowhere to land except a bare sign-
// in form. Everything below describes features that actually exist in the
// product (guests, RSVP/invites, seating, check-in, vendors, merchandise +
// multi-currency payouts) -- no invented stats or testimonials, since we
// don't have real ones yet.

const FEATURES = [
  {
    icon: Users,
    title: "Guest management",
    description: "Import your guest list, track RSVPs, and manage plus-ones and named companions in one view.",
  },
  {
    icon: Mail,
    title: "RSVP & invitations",
    description: "Send personalized invites by email, WhatsApp, or QR code, and collect RSVPs on a branded page.",
  },
  {
    icon: Armchair,
    title: "Visual seating planner",
    description: "Design your own table layout and drag guests into seats -- no spreadsheet math required.",
  },
  {
    icon: ClipboardCheck,
    title: "Day-of check-in",
    description: "A kiosk-ready check-in view with live arrival stats, so your door team always knows who's in.",
  },
  {
    icon: Store,
    title: "Vendor tracking",
    description: "Keep every vendor's contact info, cost, and booking status in one place instead of scattered notes.",
  },
  {
    icon: CreditCard,
    title: "Merchandise & payments",
    description: "Sell tickets or merchandise at checkout, with payouts in USD, GBP, or NGN via Stripe, PayPal, or Paystack.",
  },
];

const STEPS = [
  {
    title: "Create your event",
    description: "Set the date, type, and details -- your event dashboard is ready in seconds.",
  },
  {
    title: "Invite your guests",
    description: "Share by email, WhatsApp, or a link, and watch RSVPs, plus-ones, and companions roll in.",
  },
  {
    title: "Run the day",
    description: "Check guests in, manage seating, and track vendors, all from the same dashboard.",
  },
];

export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const primaryHref = !isLoading && user ? "/events" : "/register";
  const primaryLabel = !isLoading && user ? "Go to my events" : "Get Started Free";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="font-display text-xl font-bold text-slate-950">EventFlow</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {!isLoading && user ? (
              <Link to="/events">
                <Button size="md">Go to my events</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="md">
                    Log In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="md">Get Started Free</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-24 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Everything for your event, in one place
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Plan events guests will remember
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Guest management, RSVP, seating, check-in, vendors, and payments -- all in one dashboard, so you spend
            less time on logistics and more time on the event itself.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={primaryHref}>
              <Button size="lg" className="w-full sm:w-auto">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            {(isLoading || !user) && (
              <Link to="/login">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </section>

        {/* Feature grid */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">
              All the tools event planners need
            </h2>
            <p className="mt-3 text-slate-600">No juggling five different apps to get one event out the door.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-950">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">How it works</h2>
              <p className="mt-3 text-slate-600">From first invite to the last guest checked in.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-display text-base font-bold text-white">
                    {index + 1}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payments callout */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Card className="grid grid-cols-1 gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <CreditCard className="h-3.5 w-3.5" />
                Built-in payments
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-slate-950 sm:text-3xl">
                Get paid in USD, GBP, or NGN
              </h2>
              <p className="mt-3 text-slate-600">
                Sell merchandise or collect payments straight from your event page. Connect Stripe, PayPal, or
                Paystack and payouts land in your own account -- we never hold your funds.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Guest checkout in their local currency",
                "Direct payouts via Stripe, Paystack, or PayPal",
                "Every payment attempt logged for your records",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* CTA banner */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="rounded-xl2 bg-brand-600 px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Ready to plan your next event?</h2>
            <p className="mx-auto mt-3 max-w-xl text-brand-100">
              Create your first event free -- no credit card required.
            </p>
            <Link to={primaryHref} className="mt-8 inline-block">
              <Button size="lg" className="bg-white text-brand-700 shadow-elevated hover:bg-brand-50">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="font-display text-sm font-bold text-slate-950">EventFlow</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link to="/login" className="hover:text-brand-600">
              Log In
            </Link>
            <Link to="/register" className="hover:text-brand-600">
              Sign Up
            </Link>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} EventFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
