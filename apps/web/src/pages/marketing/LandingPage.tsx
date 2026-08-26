import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowRight, CheckCircle2, ChevronDown, CreditCard, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { HeroIllustration } from "@/components/marketing/HeroIllustration";
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
    question: "Is Gadaova free to use?",
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
      "Connect Stripe, Paystack, or PayPal and accept payments in USD, GBP, or NGN. Payouts land directly in your own account -- Gadaova never holds your funds.",
  },
  {
    question: "Can I check guests in at the door?",
    answer:
      "Yes -- scan QR codes for both RSVP'd guests and paid ticket holders from any phone or tablet browser, with live check-in stats as people arrive.",
  },
  {
    question: "Does Gadaova help with seating?",
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
      "Gadaova works on any phone's browser, and you can install it to your home screen for an app-like experience with one tap -- no App Store download needed.",
  },
];

const STEPS = [
  {
    title: "Create your event",
    description: "Set the date, type, and details -- your event dashboard is ready in seconds.",
    image: "https://images.unsplash.com/photo-1754039984995-a91721ce1870?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Invite your guests",
    description: "Share by email, WhatsApp, or a link, and watch RSVPs, plus-ones, and companions roll in.",
    image: "https://images.unsplash.com/photo-1757062768062-ad29deec7df4?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Run the day",
    description: "Check guests in, manage seating, and track vendors, all from the same dashboard.",
    image: "https://images.unsplash.com/photo-1687757660317-63fb2621b197?auto=format&fit=crop&w=800&q=80",
  },
];

// Real photography for the Services grid below, matched to each service by
// keyword so admin-added services (Admin > Services) still get a sensible
// photo instead of a blank tile. All Unsplash License (free, no attribution
// required).
const SERVICE_PHOTOS = [
  { match: /guest/i, url: "https://images.unsplash.com/photo-1757062768062-ad29deec7df4?auto=format&fit=crop&w=800&q=80" },
  { match: /rsvp|invit/i, url: "https://images.unsplash.com/photo-1754039984995-a91721ce1870?auto=format&fit=crop&w=800&q=80" },
  { match: /seat/i, url: "https://images.unsplash.com/photo-1746933195672-34075502e5bb?auto=format&fit=crop&w=800&q=80" },
  { match: /check-?in/i, url: "https://images.unsplash.com/photo-1687757660317-63fb2621b197?auto=format&fit=crop&w=800&q=80" },
  { match: /vendor/i, url: "https://images.unsplash.com/photo-1672826979217-7156a305acf5?auto=format&fit=crop&w=800&q=80" },
  { match: /merch|payment/i, url: "https://images.unsplash.com/photo-1742836531239-1fe146bf7e3f?auto=format&fit=crop&w=800&q=80" },
];

function serviceImage(title: string, index: number) {
  return (SERVICE_PHOTOS.find((p) => p.match.test(title)) ?? SERVICE_PHOTOS[index % SERVICE_PHOTOS.length]).url;
}

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
        <section className="mx-auto grid max-w-[90rem] grid-cols-1 items-center gap-12 px-4 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28 lg:grid-cols-2 lg:gap-12 lg:px-12 xl:px-16">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-sm font-semibold text-coral-700">
              <Sparkles className="h-4 w-4" />
              Everything for your event, in one place
            </span>
            <h1 className="mx-auto mt-7 max-w-2xl font-display text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:mx-0 lg:text-7xl">
              Plan events guests will remember
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600 lg:mx-0">
              Guest management, RSVP, seating, check-in, vendors, and payments -- all in one dashboard, so you spend
              less time on logistics and more time on the event itself.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link to={primaryHref}>
                <Button size="lg" className="w-full px-8 py-4 text-lg sm:w-auto">
                  {primaryLabel}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              {(isLoading || !user) && (
                <Link to="/login">
                  <Button variant="secondary" size="lg" className="w-full px-8 py-4 text-lg sm:w-auto">
                    Log In
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
            <HeroIllustration />
          </div>
        </section>

        {/* Services grid -- admin-editable, see Admin > Services */}
        <section className="mx-auto max-w-[90rem] px-4 pb-20 sm:px-8 sm:pb-28 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold text-slate-950 sm:text-5xl">
              All the tools event planners need
            </h2>
            <p className="mt-4 text-lg text-slate-600">No juggling five different apps to get one event out the door.</p>
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
                  <Card key={service.id} className="overflow-hidden">
                    <img
                      src={serviceImage(service.title, serviceIndex)}
                      alt=""
                      className="h-32 w-full object-cover"
                    />
                    <div className="p-6">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tileClasses}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold text-slate-950">{service.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{service.description}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="border-y border-slate-100 bg-white">
          <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-4xl font-bold text-slate-950 sm:text-5xl">How it works</h2>
              <p className="mt-4 text-lg text-slate-600">From first invite to the last guest checked in.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                  <img
                    src={step.image}
                    alt=""
                    className="h-36 w-full rounded-xl2 object-cover shadow-card"
                  />
                  <span
                    className={`-mt-5 flex h-10 w-10 items-center justify-center rounded-full font-display text-base font-bold text-white shadow-card ${
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

        {/* Photo showcase -- real photography, unlike the icon-based Services
            grid above, to give visitors a feel for what an event on Gadaova
            actually looks like. */}
        <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold text-slate-950 sm:text-5xl">Built for real events</h2>
            <p className="mt-4 text-lg text-slate-600">From the first invite to the last guest checked in.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                image: "https://images.unsplash.com/photo-1757062768062-ad29deec7df4?auto=format&fit=crop&w=800&q=80",
                title: "RSVPs & Guest Lists",
                description: "Send invites by email, WhatsApp, or link, and watch RSVPs and plus-ones roll in.",
              },
              {
                image: "https://images.unsplash.com/photo-1746933195672-34075502e5bb?auto=format&fit=crop&w=800&q=80",
                title: "Seating & Tables",
                description: "Drag and drop guests onto a visual floor plan and export a printable seating chart.",
              },
              {
                image: "https://images.unsplash.com/photo-1687757660317-63fb2621b197?auto=format&fit=crop&w=800&q=80",
                title: "Door Check-in & Tickets",
                description: "Scan QR wristbands and tickets at the door, with live check-in stats as guests arrive.",
              },
              {
                image: "https://images.unsplash.com/photo-1742836531239-1fe146bf7e3f?auto=format&fit=crop&w=800&q=80",
                title: "Payments & Merchandise",
                description: "Sell tickets and merchandise with checkout in your guest's local currency.",
              },
            ].map((item) => (
              <Card key={item.title} className="h-full overflow-hidden">
                <img src={item.image} alt="" className="h-40 w-full object-cover" />
                <div className="p-5">
                  <h3 className="font-display text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Payments callout */}
        <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
          <Card className="grid grid-cols-1 gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
                <CreditCard className="h-3.5 w-3.5" />
                Built-in payments
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-slate-950 sm:text-4xl">
                Get paid in USD, GBP, or NGN
              </h2>
              <p className="mt-4 text-lg text-slate-600">
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
              <div className="w-full shrink-0 sm:w-56 lg:w-full xl:w-56">
                <img
                  src="https://images.unsplash.com/photo-1742836531239-1fe146bf7e3f?auto=format&fit=crop&w=600&q=80"
                  alt=""
                  className="h-48 w-full rounded-xl2 object-cover shadow-card sm:h-56"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* Articles teaser */}
        {articles && articles.length > 0 && (
          <section className="border-y border-slate-100 bg-white">
            <div className="mx-auto max-w-[90rem] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="font-display text-4xl font-bold text-slate-950 sm:text-5xl">From the blog</h2>
                  <p className="mt-4 text-lg text-slate-600">Updates and tips from the Gadaova team.</p>
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
        <section className="mx-auto max-w-4xl px-4 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
          <div className="text-center">
            <h2 className="font-display text-4xl font-bold text-slate-950 sm:text-5xl">Frequently asked questions</h2>
            <p className="mt-4 text-lg text-slate-600">Everything you need to know before you start planning.</p>
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
        <section className="mx-auto max-w-[90rem] px-4 pb-24 pt-20 sm:px-8 lg:px-12 xl:px-16">
          <div className="rounded-xl2 bg-brand-600 px-6 py-16 text-center sm:px-12 sm:py-20">
            <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">Ready to plan your next event?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-100">
              Create your first event free -- no credit card required.
            </p>
            <Link to={primaryHref} className="mt-10 inline-block">
              <Button size="lg" className="bg-white px-8 py-4 text-lg text-brand-700 shadow-elevated hover:bg-brand-50">
                {primaryLabel}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
