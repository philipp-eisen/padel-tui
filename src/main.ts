#!/usr/bin/env bun

import { createAppContext } from "./app/context";
import { PlaytomicApiError } from "./adapters/playtomic/errors";
import { runCli } from "./cli/router";
import { launchTui } from "./tui/index";
import { ZodError } from "zod";

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
  if (error instanceof PlaytomicApiError) {
    console.error(error.message);
    console.error(`HTTP status: ${error.status}`);
    console.error(`Response body:\n${error.responseBody}`);
    process.exitCode = 1;
    return;
  }

  if (error instanceof ZodError) {
    console.error("Invalid input:");
    for (const issue of error.issues) {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      console.error(`- ${path}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }

  process.exitCode = 1;
});
