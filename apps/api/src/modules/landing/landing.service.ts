import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { CreateServiceInput, ReorderServicesInput, UpdateServiceInput } from "./landing.schema";

// --- Admin -----------------------------------------------------------------

export async function listAllServices() {
  return prisma.landingService.findMany({ orderBy: { sortOrder: "asc" } });
}

async function getServiceOrThrow(serviceId: string) {
  const service = await prisma.landingService.findUnique({ where: { id: serviceId } });
  if (!service) throw new NotFoundError("Service not found");
  return service;
}

export async function createService(input: CreateServiceInput) {
  // New cards go to the end of the list by default.
  const last = await prisma.landingService.findFirst({ orderBy: { sortOrder: "desc" } });
  return prisma.landingService.create({
    data: {
      title: input.title,
      description: input.description,
      icon: input.icon,
      isActive: input.isActive ?? true,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export async function updateService(serviceId: string, input: UpdateServiceInput) {
  await getServiceOrThrow(serviceId);
  return prisma.landingService.update({ where: { id: serviceId }, data: input });
}

export async function deleteService(serviceId: string) {
  await getServiceOrThrow(serviceId);
  await prisma.landingService.delete({ where: { id: serviceId } });
}

export async function reorderServices(input: ReorderServicesInput) {
  await prisma.$transaction(
    input.orderedIds.map((id, index) => prisma.landingService.update({ where: { id }, data: { sortOrder: index } }))
  );
  return listAllServices();
}

// --- Public ------------------------------------------------------------

export async function listActiveServices() {
  return prisma.landingService.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}
