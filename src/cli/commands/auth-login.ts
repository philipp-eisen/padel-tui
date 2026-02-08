import type { AppContext } from "../../app/context";
import { z } from "zod";
import { ask, askHidden } from "../prompt";

export const AuthLoginOptionsSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
});

export type AuthLoginOptions = z.input<typeof AuthLoginOptionsSchema>;

export async function runAuthLoginCommand(
  app: AppContext,
  options: AuthLoginOptions,
): Promise<void> {
  const parsed = AuthLoginOptionsSchema.parse(options);

  const email =
    parsed.email ??
    (await ask("Email: "));
  const password =
    parsed.password ??
    (await askHidden("Password: "));

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const session = await app.authService.login({ email, password });
  console.log(`Logged in as user ${session.userId}.`);
}
