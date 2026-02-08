import type { MatchesState, SearchState } from "../state";
import type { PlaceSummary } from "../types";
import type { TuiTheme } from "../theme";
import { ActiveMatchesPanel } from "../components/ActiveMatchesPanel";
import { SearchToolbar } from "../components/SearchToolbar";
import { LoadingStrip } from "../components/LoadingStrip";
import { PlacesTable } from "../components/PlacesTable";
import { HotkeysBar } from "../components/HotkeysBar";

interface SearchScreenProps {
  state: SearchState;
  matchesState: MatchesState;
  summaries: PlaceSummary[];
  theme: TuiTheme;
  bookingPromptOpen: boolean;
  bookingPromptChoice: "reject" | "confirm";
  matchesCancelPromptOpen: boolean;
  matchesCancelPromptChoice: "reject" | "confirm";
  onTermInput: (value: string) => void;
  onFocusSearch: () => void;
  onFocusMatches: () => void;
  onSelectMatch: (index: number) => void;
  onFocusResults: () => void;
  onSelectPlace: (index: number) => void;
  onExpandPlace: (index: number) => void;
  onSelectExpandedSlot: (slotIndex: number) => void;
}

export function SearchScreen(props: SearchScreenProps) {
  const status = () => {
    if (props.state.error) {
      return { text: `Error: ${props.state.error}`, color: props.theme.error };
    }

    if (props.state.booking) {
      return { text: "Booking selected slot...", color: props.theme.text };
    }

    if (props.state.bookingMessage) {
      return { text: props.state.bookingMessage, color: props.theme.success };
    }

    return { text: "", color: props.theme.muted };
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <SearchToolbar
        term={props.state.term}
        searchMode={props.state.mode}
        date={props.state.date}
        focusField={props.state.focusField}
        theme={props.theme}
        onTermInput={props.onTermInput}
        onFocusSearch={props.onFocusSearch}
      />

      <LoadingStrip loading={props.state.loading} theme={props.theme} />

      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={props.theme.panelBg}>
        <text fg={status().color}>{status().text}</text>
      </box>

      <PlacesTable
        summaries={props.summaries}
        selectedPlaceIndex={props.state.selectedPlaceIndex}
        expandedPlaceIndex={props.state.expandedPlaceIndex}
        selectedExpandedSlotIndex={props.state.selectedExpandedSlotIndex}
        pendingBookingPlaceIndex={props.state.pendingBookingPlaceIndex}
        focusField={props.state.focusField}
        theme={props.theme}
        bookingPromptOpen={props.bookingPromptOpen}
        bookingPromptChoice={props.bookingPromptChoice}
        onFocusResults={props.onFocusResults}
        onSelectPlace={props.onSelectPlace}
        onExpandPlace={props.onExpandPlace}
        onSelectExpandedSlot={props.onSelectExpandedSlot}
      />

      <ActiveMatchesPanel
        state={props.matchesState}
        focusField={props.state.focusField}
        cancelPromptOpen={props.matchesCancelPromptOpen}
        cancelPromptChoice={props.matchesCancelPromptChoice}
        theme={props.theme}
        onFocusMatches={props.onFocusMatches}
        onSelectMatch={props.onSelectMatch}
      />

      <HotkeysBar
        theme={props.theme}
        focusField={props.state.focusField}
        hasExpandedPlace={props.state.expandedPlaceIndex === props.state.selectedPlaceIndex}
        bookingPromptOpen={props.bookingPromptOpen || props.matchesCancelPromptOpen}
      />
    </box>
  );
}
