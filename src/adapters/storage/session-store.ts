import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Session } from "../../domain/types";

export class SessionStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Session | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }

  async save(session: Session): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(session, null, 2), "utf8");
    await chmod(this.filePath, 0o600);
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.filePath);
    } catch {
      // no-op
    }
  }
}
