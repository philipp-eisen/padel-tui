export type OptionBag = Record<string, unknown>;

export function optionValue(options: OptionBag, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = options[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}
