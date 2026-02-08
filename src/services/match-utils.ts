const MATCH_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractShareLinkFromUnknown(input: unknown): string | undefined {
  const queue: unknown[] = [input];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = key.toLowerCase();
      if (
        typeof value === "string" &&
        value.startsWith("http") &&
        (normalizedKey.includes("share") ||
          normalizedKey.includes("invite") ||
          normalizedKey.includes("join") ||
          normalizedKey === "url")
      ) {
        return value;
      }

      queue.push(value);
    }
  }

  return undefined;
}

export function extractMatchIdFromUnknown(input: unknown): string | undefined {
  const queue: unknown[] = [input];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    for (const [key, value] of Object.entries(current)) {
      if (
        typeof value === "string" &&
        MATCH_ID_PATTERN.test(value) &&
        (key === "match_id" || key === "matchId")
      ) {
        return value;
      }

      queue.push(value);
    }
  }

  return undefined;
}

export function buildMatchShareLink(matchId: string): string | undefined {
  if (!MATCH_ID_PATTERN.test(matchId)) {
    return undefined;
  }

  return `https://app.playtomic.io/matches/${matchId}`;
}
