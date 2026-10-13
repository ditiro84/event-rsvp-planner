import { test, expect } from "@playwright/test";
import { createEvent, createGuest, registerPlanner } from "./helpers/seed";

// Covers two things fixed in the same pass: the "Not including yourself"
// hint being easy to miss, and guests declaring N additional guests but
// naming fewer than N of them (which left unseatable, unnamed "+N unnamed"
// entries on the planner's guest list -- see rsvp.service.ts's
// assertPartyNamesComplete and PublicRsvpPage.tsx's per-guest name fields).

test.describe("Public RSVP form", () => {
  test("the additional-guests hint is emphasized", async ({ page, request }) => {
    await registerPlanner(request);
    const event = await createEvent(request);

    await page.goto(`/rsvp/${event.rsvpToken}`);

    const hint = page.getByText("Not including yourself");
    await expect(hint).toBeVisible();
    await expect(hint.evaluate((el) => el.tagName.toLowerCase())).resolves.toBe("strong");
  });

  test("requires a name for every additional guest before it will submit", async ({ page, request }) => {
    await registerPlanner(request);
    const event = await createEvent(request);

    await page.goto(`/rsvp/${event.rsvpToken}`);

    await page.getByLabel("First name").fill("Priya");
    await page.getByLabel("Last name").fill("Patel");
    await page.getByLabel("Will you be attending?").selectOption("CONFIRMED");
    await page.getByLabel("Number of additional guests").fill("2");

    // Two required name fields should appear, tracking the count exactly.
    const nameInputs = page.getByPlaceholder(/Guest \d full name/);
    await expect(nameInputs).toHaveCount(2);

    // Leave the second one blank and try to submit -- should be blocked.
    await nameInputs.nth(0).fill("Amit Patel");
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page.getByText("Enter a name for every additional guest below.")).toBeVisible();
    await expect(page.getByText(/^Thank you,/)).toHaveCount(0);

    // Fill the second name in and it should go through.
    await nameInputs.nth(1).fill("Sana Patel");
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page.getByText("Thank you, Priya!")).toBeVisible();
  });

  test("lets a guest submit with zero additional guests", async ({ page, request }) => {
    await registerPlanner(request);
    const event = await createEvent(request);

    await page.goto(`/rsvp/${event.rsvpToken}`);

    await page.getByLabel("First name").fill("Jordan");
    await page.getByLabel("Last name").fill("Lee");
    await page.getByLabel("Will you be attending?").selectOption("CONFIRMED");
    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page.getByText("Thank you, Jordan!")).toBeVisible();
  });

  // Regression check for the invited-guest path (matching by an existing
  // Guest record rather than creating a new one), which goes through the
  // same assertPartyNamesComplete check server-side.
  test("also enforces matching names for an already-invited guest", async ({ page, request }) => {
    await registerPlanner(request);
    const event = await createEvent(request);
    const guest = await createGuest(request, event.id, { firstName: "Nina", lastName: "Osei" });

    await page.goto(`/rsvp/${event.rsvpToken}`);

    await page.getByLabel("First name").fill(guest.firstName);
    await page.getByLabel("Last name").fill(guest.lastName);
    await page.getByLabel("Will you be attending?").selectOption("CONFIRMED");
    await page.getByLabel("Number of additional guests").fill("1");

    await page.getByRole("button", { name: "Submit RSVP" }).click();

    await expect(page.getByText("Enter a name for every additional guest below.")).toBeVisible();
  });
});
