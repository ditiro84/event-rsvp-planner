import { useEffect } from "react";

// Mirrors the tags baked into index.html -- kept here so any page that sets
// its own title/description can cleanly restore the site-wide defaults when
// the user navigates away. This is a client-rendered SPA with no SSR, so
// index.html's <head> only reflects whichever page loaded first; everything
// after that is managed here.
const SITE_URL = "https://www.gadaova.com";
export const DEFAULT_META = {
  title: "Gadaova - Event RSVP & Seating Planner",
  description:
    "Plan events guests will remember. Manage guest lists, RSVPs, seating, door check-in, vendors, and payments in one dashboard -- free to start, with support for USD, GBP, and NGN.",
  image: `${SITE_URL}/og-image.png`,
  url: `${SITE_URL}/`,
};

interface PageMetaInput {
  /** Document title and og:title/twitter:title. Pass undefined/null to leave the current tags alone (e.g. while async data is still loading). */
  title?: string | null;
  description?: string | null;
  /** Absolute URL of a page-specific social preview image. Falls back to the default OG image. */
  image?: string | null;
  /** Path such as "/articles/my-slug", used for canonical + og:url. Falls back to the current location. */
  path?: string | null;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function applyMeta(title: string, description: string, image: string, url: string) {
  document.title = title;
  upsertMeta("name", "description", description);
  upsertCanonical(url);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
}

/**
 * Sets document.title plus description/canonical/OG/Twitter meta tags for
 * the lifetime of the calling component, then restores the site-wide
 * defaults on unmount so the next page doesn't inherit stale tags.
 *
 * This is a small hand-rolled stand-in for a library like react-helmet, in
 * keeping with the rest of the app's hand-rolled UI (Tooltip, Avatar, etc.
 * are custom too, not npm packages). It helps crawlers that execute JS
 * (Googlebot does) but not raw social-share unfurlers that fetch the URL
 * without running JS -- those still see the index.html defaults, since this
 * app has no SSR/prerendering. That's a known limitation of the current
 * architecture, not something a hook can fix on its own.
 */
export function usePageMeta({ title, description, image, path }: PageMetaInput) {
  useEffect(() => {
    if (!title) return; // keep whatever's already there while data is still loading
    const url = path ? `${SITE_URL}${path}` : window.location.href;
    applyMeta(title, description || DEFAULT_META.description, image || DEFAULT_META.image, url);

    return () => {
      applyMeta(DEFAULT_META.title, DEFAULT_META.description, DEFAULT_META.image, DEFAULT_META.url);
    };
  }, [title, description, image, path]);
}
