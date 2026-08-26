import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowRight, CheckCircle2, ChevronDown, CreditCard, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { HeroIllustration, PaymentsIllustration } from "@/components/marketing/HeroIllustration";
import { usePublicServices } from "@/hooks/useLandingServices";
import { publicArticleCoverImageUrl, usePublicArticles } from "@/hooks/useArticles";
import { formatDate } from "@/lib/format";

// Public marketing page at "/" -- the app used to redirect straight to
// /login here, which meant a visitor had nowhere to land except a bare sign-
// in form. The Services grid below is admin-editable (Admin > Services) so
// a new offering can be added without a code deploy; everything else
// describes features that actually exist in the product -- no invented
// stats or testimonials.

// Answers describe features that actually exist in the product today --
// same rule as the Services grid above, no invented pricing tiers or
// capabilities.
const FAQS = [
  {
    question: "Is EventFlow free to use?",
    answer:
      "Creating events, managing your guest list, sending RSVP invites, seating, and check-in are all free. We only take a small fee when you sell tickets or merchandise through the platform -- nothing upfront, no monthly subscription.",
  },
  {
    question: "Do my guests need to create an account?",
    answer:
      "No. Guests RSVP, buy tickets, or shop merchandise through a private link -- no sign-up or app download required on their end.",
  },
  {
    question: "What payment methods can I accept?",
    answer:
      "Connect Stripe, Paystack, or PayPal and accept payments in USD, GBP, or NGN. Payouts land directly in your own account -- EventFlow never holds your funds.",
  },
  {
    question: "Can I check guests in at the door?",
    answer:
      "Yes -- scan QR codes for both RSVP'd guests and paid ticket holders from any phone or tablet browser, with live check-in stats as people arrive.",
  },
  {
    question: "Does EventFlow help with seating?",
    answer:
      "Yes, there's a visual drag-and-drop seating planner where you assign confirmed guests (and their plus-ones) to tables and export a seating chart as a PDF.",
  },
  {
    question: "Can I sell things other than tickets?",
    answer:
      "Yes -- the Merchandise tab lets you list branded products (t-shirts, programs, etc.) for guests to buy alongside their RSVP or ticket.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "EventFlow works on any phone's browser, and you can install it to your home screen for an app-like experience with one tap -- no App Store download needed.",
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
  const { data: services, isLoading: servicesLoading } = usePublicServices();
  const { data: articles } = usePublicArticles(3);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:grid-cols-2 lg:gap-8 lg:px-8">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
              <Sparkles className="h-3.5 w-3.5" />
              Everything for your event, in one place
            </span>
            <h1 className="mx-auto mt-6 max-w-xl font-display text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:mx-0 lg:text-6xl">
              Plan events guests will remember
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 lg:mx-0">
              Guest management, RSVP, seating, check-in, vendors, and payments -- all in one dashboard, so you spend
              less time on logistics and more time on the event itself.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
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
          </div>
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <HeroIllustration />
          </div>
        </section>

        {/* Services grid -- admin-editable, see Admin > Services */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">
              All the tools event planners need
            </h2>
            <p className="mt-3 text-slate-600">No juggling five different apps to get one event out the door.</p>
          </div>
          {servicesLoading ? (
            <div className="mt-12 flex justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(services ?? []).map((service, serviceIndex) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const Icon = (Icons as any)[service.icon] ?? Icons.Sparkles;
                const tileClasses = serviceIndex % 2 === 0 ? "bg-brand-50 text-brand-600" : "bg-coral-50 text-coral-600";
                return (
                  <Card key={service.id} className="p-6">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tileClasses}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-slate-950">{service.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{service.description}</p>
                  </Card>
                );
              })}
            </div>
          )}
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
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold text-white ${
                      index % 2 === 0 ? "bg-brand-600" : "bg-coral-500"
                    }`}
                  >
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
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
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
              <ul className="flex-1 space-y-3">
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
              <div className="shrink-0">
                <PaymentsIllustration />
              </div>
            </div>
          </Card>
        </section>

        {/* Articles teaser */}
        {articles && articles.length > 0 && (
          <section className="border-y border-slate-100 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">From the blog</h2>
                  <p className="mt-3 text-slate-600">Updates and tips from the EventFlow team.</p>
                </div>
                <Link to="/articles" className="hidden shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700 sm:inline-block">
                  View all articles
                </Link>
              </div>
              <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {articles.map((article) => (
                  <Link key={article.id} to={`/articles/${article.slug}`}>
                    <Card className="h-full overflow-hidden transition-shadow hover:shadow-elevated">
                      {article.hasCoverImage && (
                        <img
                          src={publicArticleCoverImageUrl(article.slug)}
                          alt=""
                          className="h-40 w-full object-cover"
                        />
                      )}
                      <div className="p-5">
                        <h3 className="font-display text-lg font-semibold text-slate-950">{article.title}</h3>
                        <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{article.excerpt}</p>
                        {article.publishedAt && (
                          <p className="mt-3 text-xs text-slate-400">{formatDate(article.publishedAt)}</p>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-slate-950 sm:text-4xl">Frequently asked questions</h2>
            <p className="mt-3 text-slate-600">Everything you need to know before you start planning.</p>
          </div>
          <div className="mt-10 divide-y divide-slate-100 rounded-xl2 border border-slate-200/80 bg-white shadow-card">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group p-5 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA banner */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
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

      <SiteFooter />
    </div>
  );
}
