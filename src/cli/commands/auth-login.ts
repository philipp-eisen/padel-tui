import type { AppContext } from "../../app/context";
import { parseArgs } from "../args";
import { ask } from "../prompt";

export async function runAuthLoginCommand(
  app: AppContext,
  argv: string[],
): Promise<void> {
  const { flags } = parseArgs(argv);

  const email =
    (typeof flags.email === "string" ? flags.email : undefined) ??
    (await ask("Email: "));
  const password =
    (typeof flags.password === "string" ? flags.password : undefined) ??
    (await ask("Password: "));

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const session = await app.authService.login({ email, password });
  console.log(`Logged in as user ${session.userId}.`);
}
