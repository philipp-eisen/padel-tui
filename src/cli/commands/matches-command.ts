import type { CAC } from "cac";
import { z } from "zod";
import type { AppContext } from "../../app/context";
import { optionValue, type OptionBag } from "../options";

const MatchListInputSchema = z.object({
  size: z.coerce.number().int().positive().max(200).default(30),
});

const MatchCancelInputSchema = z.object({
  matchId: z.string().trim().min(1),
});

function formatMatchLine(match: {
  matchId: string;
  startDate: string;
  status: string;
  tenantName: string;
  resourceName: string;
  joinedPlayers: number;
  totalPlayers: number;
  shareLink?: string;
}): string {
  const players = `${match.joinedPlayers}/${match.totalPlayers}`;
  const share = match.shareLink ? ` | share=${match.shareLink}` : "";
  return `id=${match.matchId} | ${match.startDate} | ${match.status} | ${match.tenantName} | ${match.resourceName} | players=${players}${share}`;
}

export function printMatchesUsage(): void {
  console.log("Usage:");
  console.log("  padel-tui matches [--size <count>]");
  console.log("  padel-tui match-cancel --match-id <id>");
}

export function registerMatchCommands(cli: CAC, app: AppContext): void {
  cli
    .command("matches", "List active matches")
    .option("--size <count>", "Max matches to fetch", { default: "30" })
    .action(async (options: OptionBag) => {
      const parsed = MatchListInputSchema.parse({
        size: optionValue(options, "size"),
      });

      const matches = await app.authService.runWithValidSession((session) =>
        app.matchService.listActiveMatches(session, parsed.size),
      );

      if (matches.length === 0) {
        console.log("No active matches found.");
        return;
      }

      console.log(`Active matches (${matches.length}):`);
      for (const match of matches) {
        console.log(`- ${formatMatchLine(match)}`);
      }
    });

  cli
    .command("match-cancel", "Cancel a match owned by you")
    .option("--match-id <id>", "Match id to cancel")
    .action(async (options: OptionBag) => {
      const parsed = MatchCancelInputSchema.parse({
        matchId: optionValue(options, "matchId", "match-id"),
      });

      const canceled = await app.authService.runWithValidSession((session) =>
        app.matchService.cancelMatch(session, parsed.matchId),
      );

      console.log(`Canceled match ${canceled.matchId}.`);
      console.log(formatMatchLine(canceled));
    });
}
