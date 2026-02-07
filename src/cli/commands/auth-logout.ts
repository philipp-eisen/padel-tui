import type { AppContext } from "../../app/context";

export async function runAuthLogoutCommand(app: AppContext): Promise<void> {
  await app.authService.logout();
  console.log("Logged out. Local session cleared.");
}
