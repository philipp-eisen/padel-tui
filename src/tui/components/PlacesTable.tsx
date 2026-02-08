import { For, Show } from "solid-js";
import type { SearchFocusField } from "../state";
import type { PlaceSummary } from "../types";
import type { TuiTheme } from "../theme";
import { buildSlotPreview } from "../utils";

const COL_MARKER = 2;
const COL_NAME = 33;
const COL_ADDRESS = 24;
const COL_SLOTS = 8;
const COL_COURTS = 8;
const COL_FROM = 12;

const SLOT_COL_MARKER = 2;
const SLOT_COL_TIME = 10;
const SLOT_COL_DUR = 7;
const SLOT_COL_PRICE = 12;
const SLOT_COL_TYPE = 7;

interface PlacesTableProps {
  summaries: PlaceSummary[];
  selectedPlaceIndex: number;
  expandedPlaceIndex: number | null;
  selectedExpandedSlotIndex: number;
  pendingBookingPlaceIndex: number | null;
  focusField: SearchFocusField;
  theme: TuiTheme;
  onFocusResults: () => void;
  onSelectPlace: (index: number) => void;
  onExpandPlace: (index: number) => void;
  onSelectExpandedSlot: (slotIndex: number) => void;
}

export function PlacesTable(props: PlacesTableProps) {
  const slotTypeColor = (type: string): string => {
    if (type === "IN") {
      return props.theme.accent;
    }
    if (type === "OUT") {
      return "#38bdf8";
    }
    if (type === "COV") {
      return props.theme.warning;
    }
    return props.theme.muted;
  };

  return (
    <scrollbox
      border
      borderColor={props.focusField === "results" ? props.theme.accent : props.theme.panelBorder}
      backgroundColor={props.theme.panelBg}
      paddingTop={1}
      paddingLeft={1}
      paddingRight={1}
      flexDirection="column"
      flexGrow={1}
      onMouseDown={props.onFocusResults}
    >
      <box flexDirection="row" marginBottom={1}>
        <box width={COL_MARKER}>
          <text fg={props.theme.muted}> </text>
        </box>
        <box width={COL_NAME}>
          <text fg={props.theme.muted}>LOCATION</text>
        </box>
        <box width={COL_ADDRESS}>
          <text fg={props.theme.muted}>ADDRESS</text>
        </box>
        <box width={COL_SLOTS}>
          <text fg={props.theme.muted}>SLOTS</text>
        </box>
        <box width={COL_COURTS}>
          <text fg={props.theme.muted}>COURTS</text>
        </box>
        <box width={COL_FROM}>
          <text fg={props.theme.muted}>FROM</text>
        </box>
      </box>
      <Show
        when={props.summaries.length > 0}
        fallback={<text fg={props.theme.muted}>No places yet. Enter search text and press Enter.</text>}
      >
        <For each={props.summaries}>
          {(summary, index) => {
            const isSelected = () => index() === props.selectedPlaceIndex;
            const isExpanded = () => index() === props.expandedPlaceIndex;
            const marker = () => {
              if (!isSelected()) {
                return " ";
              }

              return props.pendingBookingPlaceIndex === index() ? "!" : ">";
            };

            return (
              <box flexDirection="column">
                <box
                  flexDirection="row"
                  backgroundColor={isSelected() ? "#0c1d20" : props.theme.panelBg}
                  onMouseDown={() => {
                    props.onFocusResults();
                    props.onSelectPlace(index());
                    props.onExpandPlace(index());
                  }}
                >
                  <box width={COL_MARKER}>
                    <text fg={isSelected() ? props.theme.accent : props.theme.muted}>{marker()}</text>
                  </box>
                  <box width={COL_NAME} overflow="hidden">
                    <text fg={isSelected() ? props.theme.accent : props.theme.text}>{summary.tenantName}</text>
                  </box>
                  <box width={COL_ADDRESS} overflow="hidden">
                    <text fg={props.theme.muted}>{summary.address}</text>
                  </box>
                  <box width={COL_SLOTS}>
                    <text fg={isSelected() ? props.theme.success : props.theme.text}>{summary.availableSlots}</text>
                  </box>
                  <box width={COL_COURTS}>
                    <text fg={props.theme.text}>{summary.resourceCount}</text>
                  </box>
                  <box width={COL_FROM} overflow="hidden">
                    <text fg={props.theme.warning}>{summary.minPrice ?? "-"}</text>
                  </box>
                </box>
                <Show when={isExpanded()}>
                  <box
                    flexDirection="column"
                    paddingLeft={COL_MARKER + 1}
                    marginBottom={1}
                    backgroundColor="#0a181f"
                  >
                    {(() => {
                      const allSlots = buildSlotPreview(summary.source);
                      const windowSize = 8;
                      const maxStart = Math.max(0, allSlots.length - windowSize);
                      const startIndex = Math.min(
                        maxStart,
                        Math.max(0, props.selectedExpandedSlotIndex - Math.floor(windowSize / 2)),
                      );
                      const visibleSlots = allSlots.slice(startIndex, startIndex + windowSize);

                      return (
                        <>
                    <box flexDirection="row">
                      <box width={SLOT_COL_MARKER}>
                        <text fg={props.theme.muted}> </text>
                      </box>
                      <box width={SLOT_COL_TIME}>
                        <text fg={props.theme.muted}>TIME</text>
                      </box>
                      <box width={SLOT_COL_DUR}>
                        <text fg={props.theme.muted}>DUR</text>
                      </box>
                      <box width={SLOT_COL_PRICE}>
                        <text fg={props.theme.muted}>PRICE</text>
                      </box>
                      <box width={SLOT_COL_TYPE}>
                        <text fg={props.theme.muted}>TYPE</text>
                      </box>
                      <box flexGrow={1} overflow="hidden">
                        <text fg={props.theme.muted}>
                          COURT [{visibleSlots.length === 0 ? 0 : startIndex + 1}-
                          {startIndex + visibleSlots.length}/{allSlots.length}]
                        </text>
                      </box>
                    </box>
                    <For each={visibleSlots}>
                      {(slot, slotIndex) => (
                        (() => {
                          const absoluteIndex = startIndex + slotIndex();
                          const isSlotSelected = absoluteIndex === props.selectedExpandedSlotIndex;

                          return (
                        <box
                          flexDirection="row"
                          backgroundColor={isSlotSelected ? "#0f2831" : "#0a181f"}
                          onMouseDown={() => {
                            props.onFocusResults();
                            props.onSelectExpandedSlot(absoluteIndex);
                          }}
                        >
                          <box width={SLOT_COL_MARKER}>
                            <text
                              fg={isSlotSelected ? props.theme.accent : props.theme.muted}
                            >
                              {isSlotSelected ? ">" : " "}
                            </text>
                          </box>
                          <box width={SLOT_COL_TIME}>
                            <text
                              fg={isSlotSelected ? props.theme.accent : props.theme.text}
                            >
                              {slot.startTime}
                            </text>
                          </box>
                          <box width={SLOT_COL_DUR}>
                            <text fg={props.theme.text}>{slot.duration}m</text>
                          </box>
                          <box width={SLOT_COL_PRICE}>
                            <text fg={props.theme.warning}>{slot.price}</text>
                          </box>
                          <box width={SLOT_COL_TYPE}>
                            <text fg={slotTypeColor(slot.type)}>{slot.type}</text>
                          </box>
                          <box flexGrow={1} overflow="hidden">
                            <text fg={props.theme.text}>{slot.courtName}</text>
                          </box>
                        </box>
                          );
                        })()
                      )}
                    </For>
                        </>
                      );
                    })()}
                  </box>
                </Show>
              </box>
            );
          }}
        </For>
      </Show>
    </scrollbox>
  );
}
