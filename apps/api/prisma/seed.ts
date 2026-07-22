import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists, skipping seed.");
    return;
  }

  const passwordHash = await hashPassword("password123");
  const user = await prisma.user.create({
    data: { name: "Demo Planner", email, passwordHash },
  });

  const event = await prisma.event.create({
    data: {
      userId: user.id,
      name: "Demo Wedding Reception",
      type: "WEDDING",
      description: "A sample event to explore the app.",
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      startTime: "17:00",
      endTime: "23:00",
      venueName: "The Grand Hall",
      venueAddress: "123 Main Street",
      capacity: 100,
      rsvpDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      customMessage: "We can't wait to celebrate with you!",
    },
  });

  await prisma.guest.createMany({
    data: [
      { eventId: event.id, firstName: "Sarah", lastName: "Johnson", email: "sarah@example.com", rsvpStatus: "CONFIRMED", isVip: true },
      { eventId: event.id, firstName: "Michael", lastName: "Smith", email: "michael@example.com", rsvpStatus: "PENDING" },
      { eventId: event.id, firstName: "Priya", lastName: "Patel", email: "priya@example.com", rsvpStatus: "DECLINED" },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Login: ${email} / password123`);
  console.log(`  RSVP link: /rsvp/${event.rsvpToken}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
