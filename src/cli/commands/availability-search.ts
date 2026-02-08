import type { AppContext } from "../../app/context";
import { z } from "zod";

export const AvailabilitySearchInputSchema = z.object({
  name: z.string().trim().min(1).optional(),
  near: z.string().trim().min(1).optional(),
  tenantId: z.string().trim().min(1).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD")
    .optional(),
  radiusMeters: z.coerce.number().int().positive().max(250_000).optional(),
  maxTenants: z.coerce.number().int().positive().max(500).optional(),
}).refine((value) => Boolean(value.name || value.near), {
  message: "Provide --name <venue> or --near <location>",
  path: ["name"],
});

export type AvailabilitySearchInput = z.input<typeof AvailabilitySearchInputSchema>;

export async function runAvailabilitySearchCommand(
  app: AppContext,
  input: AvailabilitySearchInput,
): Promise<void> {
  const parsed = AvailabilitySearchInputSchema.parse(input);

  const results = await app.authService.runWithValidSession((session) =>
    app.availabilityService.search(session, {
      query: parsed.name,
      near: parsed.near,
      tenantId: parsed.tenantId,
      date: parsed.date,
      radiusMeters: parsed.radiusMeters,
      maxTenants: parsed.maxTenants,
    }),
  );

  if (results.length === 0) {
    const label = parsed.near ? `near '${parsed.near}'` : `named '${parsed.name}'`;
    console.log(`No tenants found for ${label}.`);
    return;
  }

  for (const item of results) {
    const slotCount = item.resources.reduce(
      (acc, resource) => acc + resource.slots.length,
      0,
    );

    console.log(
      `\n${item.tenant.tenantName} (${item.tenant.city ?? "Unknown city"}) - ${slotCount} slots`,
    );
    console.log(`  tenant_id: ${item.tenant.tenantId}`);

    for (const resource of item.resources) {
      console.log(`  resource_id: ${resource.resourceId}`);
      for (const slot of resource.slots.slice(0, 5)) {
        console.log(
          `  ${resource.startDate} ${slot.startTime} | ${slot.duration} min | ${slot.price}`,
        );
      }
    }
  }
}
