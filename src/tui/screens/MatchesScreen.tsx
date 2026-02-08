import { For, Show } from "solid-js";
import type { MatchesState } from "../state";
import type { TuiTheme } from "../theme";

const COL_MARKER = 2;
const COL_DATE = 20;
const COL_STATUS = 12;
const COL_PLAYERS = 10;
const COL_VENUE = 24;

interface MatchesScreenProps {
  state: MatchesState;
  theme: TuiTheme;
  onSelectMatch: (index: number) => void;
}

export function MatchesScreen(props: MatchesScreenProps) {
  const status = () => {
    if (props.state.error) {
      return { text: `Error: ${props.state.error}`, color: props.theme.error };
    }

    if (props.state.message) {
      return { text: props.state.message, color: props.theme.success };
    }

    if (props.state.loading) {
      return { text: "Loading active matches...", color: props.theme.text };
    }

    return { text: "", color: props.theme.muted };
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <box border borderColor={props.theme.panelBorder} backgroundColor={props.theme.panelBg} padding={1}>
        <text fg={props.theme.text}>Active matches</text>
      </box>

      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={props.theme.panelBg}>
        <text fg={status().color}>{status().text}</text>
      </box>

      <scrollbox
        border
        borderColor={props.theme.accent}
        backgroundColor={props.theme.panelBg}
        paddingTop={1}
        paddingLeft={1}
        paddingRight={1}
        flexDirection="column"
        flexGrow={1}
      >
        <box flexDirection="row" marginBottom={1}>
          <box width={COL_MARKER}>
            <text fg={props.theme.muted}> </text>
          </box>
          <box width={COL_DATE}>
            <text fg={props.theme.muted}>START</text>
          </box>
          <box width={COL_STATUS}>
            <text fg={props.theme.muted}>STATUS</text>
          </box>
          <box width={COL_PLAYERS}>
            <text fg={props.theme.muted}>PLAYERS</text>
          </box>
          <box width={COL_VENUE}>
            <text fg={props.theme.muted}>VENUE</text>
          </box>
          <box flexGrow={1}>
            <text fg={props.theme.muted}>SHARE</text>
          </box>
        </box>

        <Show
          when={props.state.matches.length > 0}
          fallback={<text fg={props.theme.muted}>No active matches found.</text>}
        >
          <For each={props.state.matches}>
            {(match, index) => {
              const isSelected = () => index() === props.state.selectedIndex;
              const marker = () => {
                if (!isSelected()) {
                  return " ";
                }

                return props.state.pendingCancelMatchId === match.matchId ? "!" : ">";
              };

              return (
                <box
                  flexDirection="row"
                  backgroundColor={isSelected() ? "#0c1d20" : props.theme.panelBg}
                  onMouseDown={() => props.onSelectMatch(index())}
                >
                  <box width={COL_MARKER}>
                    <text fg={isSelected() ? props.theme.accent : props.theme.muted}>{marker()}</text>
                  </box>
                  <box width={COL_DATE}>
                    <text fg={isSelected() ? props.theme.accent : props.theme.text}>{match.startDate}</text>
                  </box>
                  <box width={COL_STATUS}>
                    <text fg={props.theme.text}>{match.status}</text>
                  </box>
                  <box width={COL_PLAYERS}>
                    <text fg={props.theme.text}>{match.joinedPlayers}/{match.totalPlayers}</text>
                  </box>
                  <box width={COL_VENUE} overflow="hidden">
                    <text fg={props.theme.text}>{match.tenantName}</text>
                  </box>
                  <box flexGrow={1} overflow="hidden">
                    <text fg={props.theme.muted}>{match.shareLink ?? "-"}</text>
                  </box>
                </box>
              );
            }}
          </For>
        </Show>
      </scrollbox>

      <box
        backgroundColor={props.theme.panelBg}
        paddingLeft={1}
        paddingRight={1}
        height={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        <text fg={props.theme.muted}>Up/Down select</text>
        <text fg={props.theme.accent}>R refresh</text>
        <text fg={props.theme.warning}>C cancel (double press)</text>
        <text fg={props.theme.muted}>Esc back</text>
      </box>
    </box>
  );
}
