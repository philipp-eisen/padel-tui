import { cac } from "cac";
import type { AppContext } from "../app/context";
import { registerAuthCommands, printAuthUsage } from "./commands/auth-command";
import {
  registerAvailabilityCommands,
  printAvailabilityUsage,
} from "./commands/availability-command";
import { printMatchesUsage, registerMatchCommands } from "./commands/matches-command";
import { registerPaymentCommands, printPaymentUsage } from "./commands/payment-command";

function printGroupUsage(argv: string[]): boolean {
  if (argv[0] === "auth" && !argv[1]) {
    printAuthUsage();
    return true;
  }

  if (argv[0] === "availability") {
    console.error("`availability` was simplified. Use `padel-tui search ...`.");
    printAvailabilityUsage();
    process.exitCode = 1;
    return true;
  }

  if (argv[0] === "payment") {
    console.error("`payment` was simplified. Use `padel-tui book ...`.");
    printPaymentUsage();
    process.exitCode = 1;
    return true;
  }

  if (argv[0] === "matches" && argv[1] === "help") {
    printMatchesUsage();
    return true;
  }

  return false;
}

export async function runCli(app: AppContext, argv: string[]): Promise<void> {
  if (printGroupUsage(argv)) {
    return;
  }

  const normalizedArgv = argv[0] === "help" ? ["--help"] : argv;
  const cli = cac("padel-tui");

  cli.help();
  registerAuthCommands(cli, app);
  registerAvailabilityCommands(cli, app);
  registerMatchCommands(cli, app);
  registerPaymentCommands(cli, app);

  cli.on("command:*", () => {
    console.error(`Unknown command: ${argv.join(" ")}`);
    cli.outputHelp();
    process.exitCode = 1;
  });

  await cli.parse(["node", "padel-tui", ...normalizedArgv]);
}
