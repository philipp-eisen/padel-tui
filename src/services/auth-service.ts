import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import { PlaytomicApiError } from "../adapters/playtomic/errors";
import { SessionStore } from "../adapters/storage/session-store";
import type { Credentials, Session } from "../domain/types";

export class AuthService {
  constructor(
    private readonly api: PlaytomicApi,
    private readonly sessionStore: SessionStore,
  ) {}

  async login(credentials: Credentials): Promise<Session> {
    const session = await this.api.login(credentials);
    await this.sessionStore.save(session);
    return session;
  }

  async restoreSession(): Promise<Session | null> {
    return this.sessionStore.load();
  }

  async requireSession(): Promise<Session> {
    const session = await this.restoreSession();
    if (!session) {
      throw new Error("No active session. Run `padel-tui auth login` first.");
    }
    return session;
  }

  async requireValidSession(): Promise<Session> {
    return this.requireSession();
  }

  async refresh(session: Session): Promise<Session> {
    if (!session.refreshToken) {
      throw new Error("Session has no refresh token. Run `padel-tui auth login`.");
    }

    try {
      const refreshed = await this.api.refreshSession(session.refreshToken);
      const merged: Session = {
        ...session,
        ...refreshed,
        refreshToken: refreshed.refreshToken ?? session.refreshToken,
        refreshTokenExpiration:
          refreshed.refreshTokenExpiration ?? session.refreshTokenExpiration,
      };

      await this.sessionStore.save(merged);
      return merged;
    } catch (error) {
      if (
        error instanceof PlaytomicApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        await this.sessionStore.clear();
      }

      if (error instanceof PlaytomicApiError) {
        throw new Error(
          `Token refresh failed. Run 'padel-tui auth login' again. Status=${error.status}. Response=${error.responseBody}`,
        );
      }

      throw new Error(
        `Token refresh failed. Run 'padel-tui auth login' again. ${error instanceof Error ? error.message : ""}`,
      );
    }
  }

  async runWithValidSession<T>(
    operation: (session: Session) => Promise<T>,
  ): Promise<T> {
    const initialSession = await this.requireValidSession();

    try {
      return await operation(initialSession);
    } catch (error) {
      if (
        error instanceof PlaytomicApiError &&
        error.status === 401 &&
        initialSession.refreshToken
      ) {
        const refreshed = await this.refresh(initialSession);
        return operation(refreshed);
      }

      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.sessionStore.clear();
  }
}
