import type { AppContext } from "../../app/context";
import { parseArgs } from "../args";

function printHelp(): void {
  console.log("Usage:");
  console.log(
    "  padel-tui payment purchase --tenant-id <id> --resource-id <id> --start <YYYY-MM-DDTHH:mm:ss> [--duration 60] [--players 4] [--payment-method-id <id>]",
  );
}

function getFlag(flags: Record<string, string | true>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function getNumberFlag(
  flags: Record<string, string | true>,
  key: string,
  defaultValue: number,
): number {
  const value = getFlag(flags, key);
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid --${key} value '${value}'. Expected a number.`);
  }

  return parsed;
}

export async function runPaymentPurchaseCommand(
  app: AppContext,
  argv: string[],
): Promise<void> {
  const { flags } = parseArgs(argv);

  const tenantId = getFlag(flags, "tenant-id");
  const resourceId = getFlag(flags, "resource-id");
  const start = getFlag(flags, "start");

  if (!tenantId || !resourceId || !start) {
    printHelp();
    throw new Error("Missing required flags: --tenant-id, --resource-id, --start.");
  }

  const duration = getNumberFlag(flags, "duration", 60);
  const numberOfPlayers = getNumberFlag(flags, "players", 4);
  const paymentMethodId = getFlag(flags, "payment-method-id");

  const result = await app.authService.runWithValidSession((session) =>
    app.purchaseService.purchaseSlot(session, {
      tenantId,
      resourceId,
      start,
      duration,
      numberOfPlayers,
      paymentMethodId,
    }),
  );

  console.log(`Created payment intent: ${result.created.paymentIntentId}`);
  console.log(`Status after method selection: ${result.selected.status}`);
  if (result.confirmed) {
    console.log(`Status after confirmation: ${result.confirmed.status}`);
  }
  console.log(`Final status: ${result.final.status}`);

  if (result.final.status !== "SUCCEEDED") {
    throw new Error(
      `Purchase did not succeed. Final payment intent:\n${JSON.stringify(result.final.raw, null, 2)}`,
    );
  }

  console.log(`Payment succeeded. payment_id=${result.final.paymentId ?? "unknown"}`);
}
