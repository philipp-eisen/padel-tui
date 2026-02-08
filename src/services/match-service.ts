import type { PlaytomicApi } from "../adapters/playtomic/playtomic-api";
import type { MatchSummary, Session } from "../domain/types";

const DEFAULT_ACTIVE_MATCH_STATUSES = ["PENDING", "IN_PROGRESS", "VALIDATING", "CONFIRMED"];
const DEFAULT_MATCH_LIST_SIZE = 30;

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export class MatchService {
  constructor(private readonly api: PlaytomicApi) {}

  async listActiveMatches(session: Session, size = DEFAULT_MATCH_LIST_SIZE): Promise<MatchSummary[]> {
    const now = new Date();
    const afterEndDate = new Date(now);
    afterEndDate.setDate(afterEndDate.getDate() - 3);

    const beforeEndDate = new Date(now);
    beforeEndDate.setDate(beforeEndDate.getDate() + 30);

    return this.api.listMatches(
      {
        afterEndDate: formatDateTimeLocal(afterEndDate),
        beforeEndDate: formatDateTimeLocal(beforeEndDate),
        matchStatus: DEFAULT_ACTIVE_MATCH_STATUSES,
        size,
        userId: "me",
      },
      session,
    );
  }

  async getMatch(session: Session, matchId: string): Promise<MatchSummary> {
    return this.api.getMatch(matchId, session);
  }

  async cancelMatch(session: Session, matchId: string): Promise<MatchSummary> {
    return this.api.cancelMatch(matchId, "CANCELED_BY_OWNER", session);
  }
}
