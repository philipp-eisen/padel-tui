import type { CAC } from "cac";
import type { AppContext } from "../../app/context";
import { runAvailabilitySearchCommand } from "./availability-search";
import { optionValue, type OptionBag } from "../options";

export function printAvailabilityUsage(): void {
  console.log("Usage:");
  console.log(
    "  padel-tui availability search [query] [--near <location>] [--radius-meters <n>] [--tenant-id <id>] [--date YYYY-MM-DD] [--max-tenants <count>]",
  );
}

export function registerAvailabilityCommands(cli: CAC, app: AppContext): void {
  cli
    .command("availability <action> [query]", "Availability commands")
    .option("--near <location>", "Search by location name via geocoding")
    .option("--radius-meters <n>", "Radius for location search (default 50000)")
    .option("--tenant-id <id>", "Restrict to a single tenant id")
    .option("--date <date>", "Filter by date in YYYY-MM-DD")
    .option("--max-tenants <count>", "Max tenants to query")
    .action(async (action: string, query: string | undefined, options: OptionBag) => {
      if (action !== "search") {
        printAvailabilityUsage();
        console.error(`Unknown availability action: ${action}`);
        process.exitCode = 1;
        return;
      }

      const near = optionValue(options, "near");
      if ((!query || query.trim().length === 0) && !near) {
        printAvailabilityUsage();
        console.error("Missing search input: provide [query] or --near <location>");
        process.exitCode = 1;
        return;
      }

      await runAvailabilitySearchCommand(app, {
        query,
        near,
        radiusMeters: optionValue(options, "radiusMeters", "radius-meters"),
        tenantId: optionValue(options, "tenantId", "tenant-id"),
        date: optionValue(options, "date"),
        maxTenants: optionValue(options, "maxTenants", "max-tenants"),
      });
    });
}
