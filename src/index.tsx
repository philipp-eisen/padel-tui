import { createAppContext } from "./app/context";
import { launchTui } from "./tui/index";

launchTui(createAppContext());
