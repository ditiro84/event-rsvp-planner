import { createApp } from "../../src/app";
import { prisma } from "../../src/lib/prisma";

export function buildTestApp() {
  return createApp();
}

// Deletes all rows between tests, respecting FK order (children first).
export async function resetDatabase() {
  await prisma.checkIn.deleteMany();
  await prisma.seatingAssignment.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.table.deleteMany();
  await prisma.layoutObject.deleteMany();
  await prisma.venueLayout.deleteMany();
  await prisma.rSVPAnswer.deleteMany();
  await prisma.rSVPQuestion.deleteMany();
  await prisma.eventInvitation.deleteMany();
  await prisma.guestParty.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
}

export { prisma };
