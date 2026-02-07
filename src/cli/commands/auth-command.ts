import type { CAC } from "cac";
import type { AppContext } from "../../app/context";
import { runAuthLoginCommand } from "./auth-login";
import { runAuthLogoutCommand } from "./auth-logout";
import { optionValue, type OptionBag } from "../options";

export function printAuthUsage(): void {
  console.log("Usage:");
  console.log("  padel-tui auth login [--email <email>] [--password <password>]");
  console.log("  padel-tui auth logout");
}

export function registerAuthCommands(cli: CAC, app: AppContext): void {
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
}
