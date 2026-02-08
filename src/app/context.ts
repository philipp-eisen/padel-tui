import { getAppConfig } from "../config";
import { LivePlaytomicApi } from "../adapters/playtomic/live-playtomic-api";
import { SessionStore } from "../adapters/storage/session-store";
import { AuthService } from "../services/auth-service";
import { AvailabilityService } from "../services/availability-service";
import { MatchService } from "../services/match-service";
import { PurchaseService } from "../services/purchase-service";

export interface AppContext {
  authService: AuthService;
  availabilityService: AvailabilityService;
  matchService: MatchService;
  purchaseService: PurchaseService;
}

export function createAppContext(): AppContext {
  const config = getAppConfig();
  const api = new LivePlaytomicApi(config);
  const sessionStore = new SessionStore(config.sessionFilePath);
  const authService = new AuthService(api, sessionStore);
  const availabilityService = new AvailabilityService(api, {
    defaultSportId: config.defaultSportId,
  });
  const matchService = new MatchService(api);
  const purchaseService = new PurchaseService(api);

  return {
    authService,
    availabilityService,
    matchService,
    purchaseService,
  };
}
