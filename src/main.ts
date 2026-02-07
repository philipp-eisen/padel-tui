#!/usr/bin/env bun

import { createAppContext } from "./app/context";
import { runCli } from "./cli/router";
import { launchTui } from "./tui/index";
import { formatErrorMessage } from "./errors/format-error";

async function main(): Promise<void> {
  const app = createAppContext();
  const argv = process.argv.slice(2);

  if (argv.length === 0 || argv[0] === "tui") {
    launchTui(app);
    return;
  }

  await runCli(app, argv);
}

void main().catch((error: unknown) => {
  console.error(formatErrorMessage(error));

  process.exitCode = 1;
});
