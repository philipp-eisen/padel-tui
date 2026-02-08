import { For, Show } from "solid-js";
import type { MatchesState, SearchFocusField } from "../state";
import type { TuiTheme } from "../theme";

const COL_MARKER = 2;
const COL_DATE = 19;
const COL_STATUS = 11;
const COL_PLAYERS = 8;
const COL_VENUE = 22;

interface ActiveMatchesPanelProps {
  state: MatchesState;
  focusField: SearchFocusField;
  cancelPromptOpen: boolean;
  cancelPromptChoice: "reject" | "confirm";
  theme: TuiTheme;
  onFocusMatches: () => void;
  onSelectMatch: (index: number) => void;
}

export function ActiveMatchesPanel(props: ActiveMatchesPanelProps) {
  const statusText = () => {
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
    <box
      border
      borderColor={props.focusField === "matches" ? props.theme.accent : props.theme.panelBorder}
      backgroundColor={props.theme.panelBg}
      padding={1}
      flexDirection="column"
      gap={1}
      height={10}
      onMouseDown={props.onFocusMatches}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.text}>Active matches</text>
        <text fg={props.theme.muted}>{props.state.matches.length}</text>
      </box>

      <Show when={Boolean(statusText().text)}>
        <text fg={statusText().color}>{statusText().text}</text>
      </Show>

      <scrollbox flexDirection="column" flexGrow={1}>
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
            <text fg={props.theme.muted}>P</text>
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
          fallback={<text fg={props.theme.muted}>No active matches.</text>}
        >
          <For each={props.state.matches}>
            {(match, index) => {
              const isSelected = () => index() === props.state.selectedIndex;
              return (
                <box flexDirection="column">
                  <box
                    flexDirection="row"
                    backgroundColor={isSelected() ? "#0c1d20" : props.theme.panelBg}
                    onMouseDown={() => {
                      props.onFocusMatches();
                      props.onSelectMatch(index());
                    }}
                  >
                    <box width={COL_MARKER}>
                      <text fg={isSelected() ? props.theme.accent : props.theme.muted}>
                        {isSelected()
                          ? props.state.pendingCancelMatchId === match.matchId
                            ? "!"
                            : ">"
                          : " "}
                      </text>
                    </box>
                    <box width={COL_DATE} overflow="hidden">
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

                  <Show when={props.cancelPromptOpen && isSelected()}>
                    <box flexDirection="row" paddingLeft={COL_MARKER + 1} gap={1} backgroundColor="#10222d">
                      <text fg={props.theme.muted}>Cancel this match?</text>
                      <text
                        fg={
                          props.cancelPromptChoice === "reject"
                            ? props.theme.accent
                            : props.theme.muted
                        }
                      >
                        [No]
                      </text>
                      <text
                        fg={
                          props.cancelPromptChoice === "confirm"
                            ? props.theme.warning
                            : props.theme.muted
                        }
                      >
                        [Yes]
                      </text>
                    </box>
                  </Show>
                </box>
              );
            }}
          </For>
        </Show>
      </scrollbox>
    </box>
  );
}
