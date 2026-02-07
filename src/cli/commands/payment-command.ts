import type { CAC } from "cac";
import type { AppContext } from "../../app/context";
import { runPaymentPurchaseCommand } from "./payment-purchase";
import { optionValue, type OptionBag } from "../options";

export function printPaymentUsage(): void {
  console.log("Usage:");
  console.log(
    "  padel-tui payment purchase --tenant-id <id> --resource-id <id> --start <YYYY-MM-DDTHH:mm:ss> [--duration 60] [--players 4] [--payment-method-id <id>]",
  );
}

export function registerPaymentCommands(cli: CAC, app: AppContext): void {
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
}
