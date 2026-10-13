import type { APIRequestContext } from "@playwright/test";

// These all go through the running API using Playwright's request context
// tied to the test's BrowserContext (see fixtures.ts) -- that context
// shares its cookie jar with the browser, so the httpOnly session cookie
// set by /auth/register here is already attached when the test later calls
// page.goto(...), exactly as if a real user had just signed in. Requests
// are made against the same http://localhost:5173/api/... URL the browser
// itself uses (proxied to the API by Vite, see vite.config.ts) rather than
// hitting :4000 directly -- a direct call would set the cookie on the wrong
// origin and the browser would never send it back.

function unique() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface TestPlanner {
  id: string;
  name: string;
  email: string;
}

export async function registerPlanner(
  request: APIRequestContext,
  overrides: Partial<{ name: string; email: string; password: string }> = {}
): Promise<TestPlanner> {
  const payload = {
    name: overrides.name ?? "Test Planner",
    email: overrides.email ?? `planner-${unique()}@example.com`,
    password: overrides.password ?? "password123",
  };
  const res = await request.post("/api/auth/register", { data: payload });
  if (!res.ok()) {
    throw new Error(`registerPlanner failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.user as TestPlanner;
}

export interface TestEvent {
  id: string;
  name: string;
  rsvpToken: string;
}

export async function createEvent(
  request: APIRequestContext,
  overrides: Partial<{
    name: string;
    date: string;
    allowPlusOnes: boolean;
    allowPlusOneNames: boolean;
  }> = {}
): Promise<TestEvent> {
  const data: Record<string, unknown> = {
    name: overrides.name ?? `Test Event ${unique()}`,
    date: overrides.date ?? "2026-11-01",
  };
  if (overrides.allowPlusOnes !== undefined) data.allowPlusOnes = overrides.allowPlusOnes;
  if (overrides.allowPlusOneNames !== undefined) data.allowPlusOneNames = overrides.allowPlusOneNames;

  const res = await request.post("/api/events", { data });
  if (!res.ok()) {
    throw new Error(`createEvent failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.event as TestEvent;
}

export interface TestGuest {
  id: string;
  firstName: string;
  lastName: string;
}

export async function createGuest(
  request: APIRequestContext,
  eventId: string,
  overrides: Partial<{ firstName: string; lastName: string; email: string; phone: string }> = {}
): Promise<TestGuest> {
  const data: Record<string, unknown> = {
    firstName: overrides.firstName ?? "Guest",
    lastName: overrides.lastName ?? unique(),
  };
  if (overrides.email) data.email = overrides.email;
  if (overrides.phone) data.phone = overrides.phone;

  const res = await request.post(`/api/events/${eventId}/guests`, { data });
  if (!res.ok()) {
    throw new Error(`createGuest failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.guest as TestGuest;
}

// A tiny valid 1x1 transparent PNG, used to exercise the invitation-media
// upload/serve/view path without shipping a real binary fixture file.
const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export async function uploadInvitationImage(
  request: APIRequestContext,
  eventId: string,
  filename = `invite-${unique()}.png`
): Promise<{ id: string }> {
  const res = await request.post(`/api/events/${eventId}/invitation-media`, {
    multipart: {
      file: {
        name: filename,
        mimeType: "image/png",
        buffer: Buffer.from(TRANSPARENT_PNG_BASE64, "base64"),
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`uploadInvitationImage failed: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return body.data.item as { id: string };
}
