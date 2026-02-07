import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface EndpointSummary {
  method: string;
  path: string;
  queryKeys: string[];
}

function redact(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer ***REDACTED***")
    .replace(/("password"\s*:\s*")[^"]+"/g, '$1***REDACTED***"')
    .replace(/("email"\s*:\s*")[^"]+"/g, '$1***REDACTED***"')
    .replace(/("access_token"\s*:\s*")[^"]+"/g, '$1***REDACTED***"')
    .replace(/("refresh_token"\s*:\s*")[^"]+"/g, '$1***REDACTED***"')
    .replace(/(authorization\s*:\s*Bearer\s+)[^\s\r\n]+/gi, "$1***REDACTED***");
}

function extractEndpoints(raw: string): EndpointSummary[] {
  const matches = raw.matchAll(
    /\b(GET|POST|PUT|PATCH|DELETE)\s+(https:\/\/api\.playtomic\.io[^\s]+)\s+HTTP\/[0-9.]+/g,
  );

  const seen = new Map<string, EndpointSummary>();

  for (const match of matches) {
    const method = match[1];
    const urlString = match[2];
    if (!method || !urlString) {
      continue;
    }

    try {
      const url = new URL(urlString);
      const queryKeys = [...url.searchParams.keys()].sort();
      const key = `${method} ${url.pathname} ${queryKeys.join(",")}`;

      if (!seen.has(key)) {
        seen.set(key, {
          method,
          path: url.pathname,
          queryKeys,
        });
      }
    } catch {
      // ignore malformed URL fragments
    }
  }

  return [...seen.values()].sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });
}

async function main(): Promise<void> {
  const inputPath = process.argv[2] ?? "flows/playtomic-api-calls";
  const outputDir = process.argv[3] ?? "captures/sanitized";

  const input = await readFile(inputPath, "utf8");
  const redacted = redact(input);
  const endpoints = extractEndpoints(redacted);

  await mkdir(outputDir, { recursive: true });

  await writeFile(
    join(outputDir, "playtomic-api-calls.redacted.txt"),
    redacted,
    "utf8",
  );

  await writeFile(
    join(outputDir, "playtomic-endpoints.json"),
    JSON.stringify(endpoints, null, 2),
    "utf8",
  );

  console.log(`Sanitized capture written to ${outputDir}`);
  console.log(`Extracted ${endpoints.length} unique endpoint shapes.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
