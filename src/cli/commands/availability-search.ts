import type { AppContext } from "../../app/context";
import { z } from "zod";

export const AvailabilitySearchInputSchema = z.object({
  query: z.string().trim().min(1),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD")
    .optional(),
  maxTenants: z.coerce.number().int().positive().max(25).optional(),
});

export type AvailabilitySearchInput = z.input<typeof AvailabilitySearchInputSchema>;

export async function runAvailabilitySearchCommand(
  app: AppContext,
  input: AvailabilitySearchInput,
): Promise<void> {
  const parsed = AvailabilitySearchInputSchema.parse(input);

  const results = await app.authService.runWithValidSession((session) =>
    app.availabilityService.search(session, {
      query: parsed.query,
      date: parsed.date,
      maxTenants: parsed.maxTenants,
    }),
  );

  if (results.length === 0) {
    console.log(`No tenants found for '${parsed.query}'.`);
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
