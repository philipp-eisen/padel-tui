import { Match, Switch } from "solid-js";
import type { SearchFocusField } from "../state";
import type { TuiTheme } from "../theme";

interface HotkeysBarProps {
  theme: TuiTheme;
  focusField: SearchFocusField;
  hasExpandedPlace: boolean;
  bookingPromptOpen: boolean;
}

export function HotkeysBar(props: HotkeysBarProps) {
  return (
    <Switch>
      <Match when={props.bookingPromptOpen}>
        <box
          backgroundColor={props.theme.panelBg}
          paddingLeft={1}
          paddingRight={1}
          height={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <text fg={props.theme.muted}>Left/Right choose</text>
          <text fg={props.theme.accent}>Enter apply</text>
          <text fg={props.theme.muted}>Esc cancel</text>
          <text fg={props.theme.muted}>Default: Reject</text>
        </box>
      </Match>
      <Match when={props.focusField === "search"}>
        <box
          backgroundColor={props.theme.panelBg}
          paddingLeft={1}
          paddingRight={1}
          height={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <text fg={props.theme.accentMuted}>Tab mode</text>
          <text fg={props.theme.muted}>Left/Right date</text>
          <text fg={props.theme.accent}>Enter search</text>
          <text fg={props.theme.muted}>Down list</text>
          <text fg={props.theme.accentMuted}>M matches</text>
          <text fg={props.theme.muted}>Ctrl+L logout</text>
        </box>
      </Match>
      <Match when={true}>
        <box
          backgroundColor={props.theme.panelBg}
          paddingLeft={1}
          paddingRight={1}
          height={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <text fg={props.theme.muted}>Up/Down navigate</text>
          <text fg={props.theme.accent}>
            {props.hasExpandedPlace ? "Enter book slot" : "Enter expand"}
          </text>
          <text fg={props.theme.muted}>Right expand</text>
          <text fg={props.theme.muted}>Left collapse</text>
          <text fg={props.theme.muted}>Esc search</text>
        </box>
      </Match>
    </Switch>
  );
}
