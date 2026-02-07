import type { AppContext } from "../app/context";
import { cac } from "cac";
import { runAuthLoginCommand } from "./commands/auth-login";
import { runAuthLogoutCommand } from "./commands/auth-logout";
import { runAvailabilitySearchCommand } from "./commands/availability-search";
import { runPaymentPurchaseCommand } from "./commands/payment-purchase";

type OptionBag = Record<string, unknown>;

function printAuthUsage(): void {
  console.log("Usage:");
  console.log("  padel-tui auth login [--email <email>] [--password <password>]");
  console.log("  padel-tui auth logout");
}

function printAvailabilityUsage(): void {
  console.log("Usage:");
  console.log(
    "  padel-tui availability search <query> [--date YYYY-MM-DD] [--max-tenants <count>]",
  );
}

function printPaymentUsage(): void {
  console.log("Usage:");
  console.log(
    "  padel-tui payment purchase --tenant-id <id> --resource-id <id> --start <YYYY-MM-DDTHH:mm:ss> [--duration 60] [--players 4] [--payment-method-id <id>]",
  );
}

function optionValue(options: OptionBag, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = options[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

export async function runCli(app: AppContext, argv: string[]): Promise<void> {
  if (argv[0] === "auth" && !argv[1]) {
    printAuthUsage();
    return;
  }

  if (argv[0] === "availability" && !argv[1]) {
    printAvailabilityUsage();
    return;
  }

  if (argv[0] === "payment" && !argv[1]) {
    printPaymentUsage();
    return;
  }

  const normalizedArgv = argv[0] === "help" ? ["--help"] : argv;

  const cli = cac("padel-tui");

  cli.help();

  cli
    .command("auth <action>", "Auth commands")
    .option("--email <email>", "Email for login")
    .option("--password <password>", "Password for login")
    .action(async (action: string, options: OptionBag) => {
      if (action === "login") {
        await runAuthLoginCommand(app, {
          email: optionValue(options, "email"),
          password: optionValue(options, "password"),
        });
        return;
      }

      if (action === "logout") {
        await runAuthLogoutCommand(app);
        return;
      }

      printAuthUsage();
      console.error(`Unknown auth action: ${action}`);
      process.exitCode = 1;
    });

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

  cli
    .command("payment <action>", "Payment commands")
    .option("--tenant-id <id>", "Tenant id")
    .option("--resource-id <id>", "Resource id")
    .option("--start <iso>", "Start datetime YYYY-MM-DDTHH:mm:ss")
    .option("--duration <minutes>", "Duration in minutes", { default: "60" })
    .option("--players <count>", "Number of players", { default: "4" })
    .option("--payment-method-id <id>", "Explicit payment method id")
    .action(async (action: string, options: OptionBag) => {
      if (action !== "purchase") {
        printPaymentUsage();
        console.error(`Unknown payment action: ${action}`);
        process.exitCode = 1;
        return;
      }

      const tenantId = optionValue(options, "tenantId", "tenant-id") ?? "";
      const resourceId = optionValue(options, "resourceId", "resource-id") ?? "";
      const start = optionValue(options, "start") ?? "";

      if (!tenantId || !resourceId || !start) {
        printPaymentUsage();
        console.error("Missing required options: --tenant-id, --resource-id, --start");
        process.exitCode = 1;
        return;
      }

      await runPaymentPurchaseCommand(app, {
        tenantId,
        resourceId,
        start,
        duration: optionValue(options, "duration"),
        players: optionValue(options, "players"),
        paymentMethodId: optionValue(options, "paymentMethodId", "payment-method-id"),
      });
    });

  cli.on("command:*", () => {
    console.error(`Unknown command: ${argv.join(" ")}`);
    cli.outputHelp();
    process.exitCode = 1;
  });

  await cli.parse(["node", "padel-tui", ...normalizedArgv]);
}
