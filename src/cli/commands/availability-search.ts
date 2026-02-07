import type { AppContext } from "../../app/context";
import { parseArgs } from "../args";

function printHelp(): void {
  console.log(
    "Usage: padel-tui availability search <query> [--date YYYY-MM-DD] [--max-tenants N]",
  );
}

export async function runAvailabilitySearchCommand(
  app: AppContext,
  argv: string[],
): Promise<void> {
  const { positional, flags } = parseArgs(argv);
  const query = positional.join(" ").trim();

  if (!query) {
    printHelp();
    return;
  }

  const maxTenants =
    typeof flags["max-tenants"] === "string"
      ? Number(flags["max-tenants"])
      : undefined;

  const results = await app.authService.runWithValidSession((session) =>
    app.availabilityService.search(session, {
      query,
      date: typeof flags.date === "string" ? flags.date : undefined,
      maxTenants,
    }),
  );

  if (results.length === 0) {
    console.log(`No tenants found for '${query}'.`);
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
