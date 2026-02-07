import type { CAC } from "cac";
import type { AppContext } from "../../app/context";
import { runAvailabilitySearchCommand } from "./availability-search";
import { optionValue, type OptionBag } from "../options";

export function printAvailabilityUsage(): void {
  console.log("Usage:");
  console.log(
    "  padel-tui availability search <query> [--date YYYY-MM-DD] [--max-tenants <count>]",
  );
}

export function registerAvailabilityCommands(cli: CAC, app: AppContext): void {
  cli
    .command("availability <action> [query]", "Availability commands")
    .option("--date <date>", "Filter by date in YYYY-MM-DD")
    .option("--max-tenants <count>", "Max tenants to query")
    .action(async (action: string, query: string | undefined, options: OptionBag) => {
      if (action !== "search") {
        printAvailabilityUsage();
        console.error(`Unknown availability action: ${action}`);
        process.exitCode = 1;
        return;
      }

      if (!query || query.trim().length === 0) {
        printAvailabilityUsage();
        console.error("Missing required argument: <query>");
        process.exitCode = 1;
        return;
      }

      await runAvailabilitySearchCommand(app, {
        query,
        date: optionValue(options, "date"),
        maxTenants: optionValue(options, "maxTenants", "max-tenants"),
      });
    });
}
