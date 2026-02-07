import { render } from "@opentui/solid";
import type { AppContext } from "../app/context";
import { App } from "./App";

export function launchTui(app: AppContext): void {
  render(() => <App app={app} />);
}
