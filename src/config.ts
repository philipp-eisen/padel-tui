import { homedir } from "node:os";
import { join } from "node:path";

export interface AppConfig {
  apiBaseUrl: string;
  requestTimeoutMs: number;
  defaultSportId: string;
  sessionFilePath: string;
  defaultAcceptLanguage: string;
  defaultRequestedWith: string;
  defaultUserAgent: string;
}

function defaultSessionPath(): string {
  return join(homedir(), ".config", "padel-tui", "session.json");
}

export function getAppConfig(): AppConfig {
  return {
    apiBaseUrl: process.env.PADEL_API_BASE_URL ?? "https://api.playtomic.io",
    requestTimeoutMs: Number(process.env.PADEL_REQUEST_TIMEOUT_MS ?? 15_000),
    defaultSportId: process.env.PADEL_SPORT_ID ?? "PADEL",
    sessionFilePath: process.env.PADEL_TUI_SESSION_FILE ?? defaultSessionPath(),
    defaultAcceptLanguage: process.env.PADEL_ACCEPT_LANGUAGE ?? "en",
    defaultRequestedWith:
      process.env.PADEL_REQUESTED_WITH ?? "com.playtomic.app 6.59.0",
    defaultUserAgent: process.env.PADEL_USER_AGENT ?? "Android 11",
  };
}
