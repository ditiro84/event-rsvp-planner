import { test, expect } from "@playwright/test";
import { createEvent, createGuest, registerPlanner } from "./helpers/seed";

// Regression test for the Seating tab's "Unassigned Guests" panel, which
// used to have a max-height on its ancestor instead of a real height --
// enough guests would silently get clipped by overflow-hidden with no way
// to scroll to them (see SeatingTab.tsx / GuestSidebar.tsx). A shortish
// viewport plus a generous guest count makes the overflow happen reliably
// regardless of how tall any one row renders.

test.describe("Seating planner", () => {
  test.use({ viewport: { width: 1280, height: 650 } });

  test("the unassigned guests list scrolls instead of clipping when it overflows", async ({ page, request }) => {
    const planner = await registerPlanner(request);
    const event = await createEvent(request);

    const guestCount = 25;
    let lastGuest: Awaited<ReturnType<typeof createGuest>> | undefined;
    for (let i = 0; i < guestCount; i++) {
      lastGuest = await createGuest(request, event.id, {
        firstName: "Guest",
        lastName: `Number${String(i).padStart(2, "0")}-${planner.id.slice(0, 4)}`,
      });
    }

    await page.goto(`/events/${event.id}/seating`);

    const list = page.getByTestId("unassigned-guests-list");
    await expect(list).toBeVisible();
    // Wait for the seeded guests to actually be rendered before measuring.
    await expect(list.getByText(`${lastGuest!.firstName} ${lastGuest!.lastName}`)).toBeAttached();

    const { scrollHeight, clientHeight } = await list.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    // The last guest shouldn't be visible yet (it's below the fold)...
    const lastGuestName = `${lastGuest!.firstName} ${lastGuest!.lastName}`;
    await expect(page.getByText(lastGuestName)).not.toBeInViewport();

    // ...but scrolling the panel (not the page) should bring it into view.
    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByText(lastGuestName)).toBeInViewport();
  });
});
