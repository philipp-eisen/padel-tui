import type { AppContext } from "../app/context";
import { runAuthLoginCommand } from "./commands/auth-login";
import { runAuthLogoutCommand } from "./commands/auth-logout";
import { runAvailabilitySearchCommand } from "./commands/availability-search";
import { runPaymentPurchaseCommand } from "./commands/payment-purchase";

function printHelp(): void {
  console.log("padel-tui");
  console.log("  padel-tui                Launch TUI");
  console.log("  padel-tui auth login     Authenticate and store session");
  console.log("  padel-tui auth logout    Clear local session");
  console.log("  padel-tui availability search <query> [--date YYYY-MM-DD]");
  console.log(
    "  padel-tui payment purchase --tenant-id <id> --resource-id <id> --start <YYYY-MM-DDTHH:mm:ss>",
  );
}

export async function runCli(app: AppContext, argv: string[]): Promise<void> {
  const [group, action, ...rest] = argv;

  if (!group || group === "help" || group === "--help") {
    printHelp();
    return;
  }

  if (group === "auth" && action === "login") {
    await runAuthLoginCommand(app, rest);
    return;
  }

  if (group === "auth" && action === "logout") {
    await runAuthLogoutCommand(app);
    return;
  }

  if (group === "availability" && action === "search") {
    await runAvailabilitySearchCommand(app, rest);
    return;
  }

  if (group === "payment" && action === "purchase") {
    await runPaymentPurchaseCommand(app, rest);
    return;
  }

  printHelp();
}
