export interface ParsedFlags {
  positional: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: string[]): ParsedFlags {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};

  let i = 0;
  while (i < argv.length) {
    const current = argv[i];
    if (!current) {
      i += 1;
      continue;
    }

    if (!current.startsWith("--")) {
      positional.push(current);
      i += 1;
      continue;
    }

    const key = current.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }

    i += 1;
  }

  return { positional, flags };
}
