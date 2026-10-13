import { test, expect } from "@playwright/test";
import { createEvent, registerPlanner, uploadInvitationImage } from "./helpers/seed";

// Covers today's "restore new-tab behavior" fix: the invitation link should
// always open a *separate* tab that Claude controls (not an in-page modal),
// and that tab should be our own app page (with a real title/URL we set),
// not a bare link straight to the raw file -- see PublicRsvpPage.tsx and
// InvitationMediaPage.tsx.

test.describe("Invitation media viewer", () => {
  test("a single invitation image opens our gallery page, not the raw file, in a new tab", async ({
    page,
    context,
    request,
  }) => {
    await registerPlanner(request);
    const event = await createEvent(request);
    await uploadInvitationImage(request, event.id);

    await page.goto(`/rsvp/${event.rsvpToken}`);

    const trigger = page.getByRole("link", { name: "View invitation card" });
    await expect(trigger).toBeVisible();

    const [popup] = await Promise.all([context.waitForEvent("page"), trigger.click()]);
    await popup.waitForLoadState();

    // A raw-file link would leave the browser to set the tab title (e.g.
    // the image's own dimensions) and the URL would be the API's file
    // endpoint -- both of which we deliberately moved away from.
    await expect(popup).toHaveTitle(`Invitation - ${event.name}`);
    expect(popup.url()).toContain("/invitation-media");
    expect(popup.url()).not.toContain("/file");
  });

  test("multiple invitation items open a standalone page with prev/next navigation", async ({
    page,
    context,
    request,
  }) => {
    await registerPlanner(request);
    const event = await createEvent(request);
    await uploadInvitationImage(request, event.id, "first.png");
    await uploadInvitationImage(request, event.id, "second.png");

    await page.goto(`/rsvp/${event.rsvpToken}`);

    const trigger = page.getByRole("link", { name: "View invitation" });
    await expect(trigger).toBeVisible();

    const [popup] = await Promise.all([context.waitForEvent("page"), trigger.click()]);
    await popup.waitForLoadState();

    await expect(popup).toHaveTitle(`Invitation - ${event.name}`);

    const image = popup.locator("img");
    await expect(image).toBeVisible();
    const firstSrc = await image.getAttribute("src");

    await popup.getByRole("button", { name: "Next" }).click();
    await expect(image).not.toHaveAttribute("src", firstSrc ?? "");
  });
});
