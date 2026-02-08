import type { SearchState } from "../state";
import type { PlaceSummary } from "../types";
import type { TuiTheme } from "../theme";
import { SearchToolbar } from "../components/SearchToolbar";
import { LoadingStrip } from "../components/LoadingStrip";
import { PlacesTable } from "../components/PlacesTable";
import { HotkeysBar } from "../components/HotkeysBar";

interface SearchScreenProps {
  state: SearchState;
  summaries: PlaceSummary[];
  theme: TuiTheme;
  bookingPromptOpen: boolean;
  bookingPromptChoice: "reject" | "confirm";
  onTermInput: (value: string) => void;
  onFocusSearch: () => void;
  onToggleMode: () => void;
  onFocusResults: () => void;
  onSelectPlace: (index: number) => void;
  onExpandPlace: (index: number) => void;
  onSelectExpandedSlot: (slotIndex: number) => void;
}

export function SearchScreen(props: SearchScreenProps) {
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
        onToggleMode={props.onToggleMode}
      />

      <LoadingStrip loading={props.state.loading} theme={props.theme} />

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

      <HotkeysBar
        theme={props.theme}
        focusField={props.state.focusField}
        hasExpandedPlace={props.state.expandedPlaceIndex === props.state.selectedPlaceIndex}
        bookingPromptOpen={props.bookingPromptOpen}
      />
    </box>
  );
}
