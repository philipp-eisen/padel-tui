import { access, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import solidPlugin from "@opentui/solid/bun-plugin";

interface BuildExecutableOptions {
  target?: string;
  outfile: string;
  release: boolean;
  codesign: boolean;
  signIdentity?: string;
  entitlementsPath: string;
}

function isDarwinTarget(target?: string): boolean {
  if (!target) {
    return process.platform === "darwin";
  }

  return target.includes("darwin");
}

function targetToCorePackage(target?: string): string {
  const effectiveTarget = target ?? `bun-${process.platform}-${process.arch}`;

  if (effectiveTarget.includes("darwin-arm64")) {
    return "@opentui/core-darwin-arm64";
  }

  if (effectiveTarget.includes("darwin-x64")) {
    return "@opentui/core-darwin-x64";
  }

  if (effectiveTarget.includes("linux-arm64")) {
    return "@opentui/core-linux-arm64";
  }

  if (effectiveTarget.includes("linux-x64")) {
    return "@opentui/core-linux-x64";
  }

  if (effectiveTarget.includes("windows-x64")) {
    return "@opentui/core-windows-x64";
  }

  return `@opentui/core-${process.platform}-${process.arch}`;
}

async function assertOpenTuiCorePackageInstalled(target?: string): Promise<void> {
  const packageName = targetToCorePackage(target);
  const packagePath = `node_modules/${packageName}`;

  try {
    await access(packagePath);
  } catch {
    throw new Error(
      `Missing required package '${packageName}' for target '${target ?? `bun-${process.platform}-${process.arch}`}'. ` +
        `This OpenTUI target is not installed in node_modules. Build on the target platform/arch (recommended), ` +
        `or install a matching OpenTUI core package for that target first.`,
    );
  }
}

async function runCommand(command: string, args: string[]): Promise<void> {
  const proc = Bun.spawn({
    cmd: [command, ...args],
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed (${exitCode}): ${command} ${args.join(" ")}`);
  }
}

function parseOptions(argv: string[]): BuildExecutableOptions {
  let target: string | undefined;
  let outfile = "dist/padel-tui";
  let release = false;
  let codesign = false;
  let signIdentity = process.env.PADEL_CODESIGN_IDENTITY;
  let entitlementsPath = process.env.PADEL_CODESIGN_ENTITLEMENTS ?? "scripts/macos-entitlements.plist";

  for (const arg of argv) {
    if (arg === "--dev") {
      release = false;
      continue;
    }

    if (arg === "--release") {
      release = true;
      continue;
    }

    if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
      continue;
    }

    if (arg.startsWith("--outfile=")) {
      outfile = arg.slice("--outfile=".length);
      continue;
    }

    if (arg === "--codesign") {
      codesign = true;
      continue;
    }

    if (arg === "--no-codesign") {
      codesign = false;
      continue;
    }

    if (arg.startsWith("--sign-identity=")) {
      signIdentity = arg.slice("--sign-identity=".length);
      continue;
    }

    if (arg.startsWith("--entitlements=")) {
      entitlementsPath = arg.slice("--entitlements=".length);
      continue;
    }

    if (arg === "--help") {
      console.log("Usage:");
      console.log(
        "  bun run scripts/build-executable.ts [--release] [--target=<bun-target>] [--outfile=<path>] [--codesign] [--sign-identity=<identity>] [--entitlements=<path>]",
      );
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { target, outfile, release, codesign, signIdentity, entitlementsPath };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  await assertOpenTuiCorePackageInstalled(options.target);
  await mkdir(dirname(options.outfile), { recursive: true });

  const compileConfig = options.target
    ? {
        outfile: options.outfile,
        target: options.target as Bun.Build.Target,
        autoloadBunfig: false,
      }
    : {
        outfile: options.outfile,
        autoloadBunfig: false,
      };

  const result = await Bun.build({
    entrypoints: ["./src/main.ts"],
    compile: compileConfig,
    plugins: [solidPlugin],
    minify: options.release,
    bytecode: false,
    sourcemap: options.release ? "linked" : "inline",
  });

  if (!result.success) {
    for (const log of result.logs) {
      console.error(`${log.level}: ${log.message}`);
      if (log.position) {
        const where = `${log.position.file}:${log.position.line}:${log.position.column}`;
        console.error(`  at ${where}`);
      }
    }
    if (options.release) {
      console.error("Release build failed. Try without --release first.");
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Built executable: ${options.outfile}`);
  if (options.target) {
    console.log(`Target: ${options.target}`);
  }
  console.log(`Mode: ${options.release ? "release" : "default"}`);

  if (options.codesign) {
    if (!isDarwinTarget(options.target)) {
      throw new Error("Codesigning is only supported for macOS (darwin) targets.");
    }

    if (process.platform !== "darwin") {
      throw new Error("Codesigning requires running on macOS with the `codesign` tool.");
    }

    const identity = options.signIdentity?.trim() || "-";
    console.log(`Codesigning ${options.outfile} with identity '${identity}'`);

    await runCommand("codesign", [
      "--deep",
      "--force",
      "-vvvv",
      "--sign",
      identity,
      "--entitlements",
      options.entitlementsPath,
      options.outfile,
    ]);

    await runCommand("codesign", ["-vvv", "--verify", options.outfile]);
    console.log("Codesign verify succeeded.");
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
