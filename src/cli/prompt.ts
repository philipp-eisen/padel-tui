import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";

export async function ask(question: string): Promise<string> {
  const readline = createInterface({ input, output });
  try {
    return (await readline.question(question)).trim();
  } finally {
    readline.close();
  }
}

export async function askHidden(question: string): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    return ask(question);
  }

  const stty = (...args: string[]) =>
    spawnSync("stty", args, {
      stdio: ["inherit", "ignore", "ignore"],
    });

  const previousState = spawnSync("stty", ["-g"], {
    stdio: ["inherit", "pipe", "ignore"],
    encoding: "utf8",
  }).stdout.trim();

  output.write(question);
  try {
    // Ghostty secure-input heuristic: canonical mode + echo disabled.
    stty("-echo", "icanon");

    const answer = await new Promise<string>((resolve) => {
      const onData = (chunk: Buffer | string) => {
        input.off("data", onData);
        const raw = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        resolve(raw.replace(/\r?\n$/u, "").trim());
      };

      input.setEncoding("utf8");
      input.resume();
      input.on("data", onData);
    });

    output.write("\n");
    return answer;
  } finally {
    if (previousState.length > 0) {
      stty(previousState);
    } else {
      stty("echo", "icanon");
    }
  }
}
