import type { SearchFocusField, SearchMode } from "../state";
import { formatHumanDate } from "../utils";
import type { TuiTheme } from "../theme";

interface SearchToolbarProps {
  term: string;
  searchMode: SearchMode;
  date: string;
  focusField: SearchFocusField;
  theme: TuiTheme;
  onTermInput: (value: string) => void;
  onFocusSearch: () => void;
}

export function SearchToolbar(props: SearchToolbarProps) {
  const fieldLabel = () => (props.searchMode === "location" ? "location" : "venue");
  const placeholder = () =>
    props.searchMode === "location" ? "type a location..." : "type a venue name...";

  return (
    <box
      border
      borderColor={props.focusField === "search" ? props.theme.accentMuted : props.theme.panelBorder}
      backgroundColor={props.theme.panelBg}
      padding={1}
      flexDirection="column"
      onMouseDown={props.onFocusSearch}
    >
      <box flexDirection="row" justifyContent="space-between" alignItems="center" height={1}>
        <box flexDirection="row" alignItems="center" gap={1}>
          <text fg={props.theme.muted}>{fieldLabel()}:</text>
          <input
            value={props.term}
            onInput={props.onTermInput}
            placeholder={placeholder()}
            focused={props.focusField === "search"}
            width={54}
            backgroundColor={props.theme.inputBg}
            focusedBackgroundColor={props.theme.inputFocusedBg}
            textColor={props.theme.inputText}
            placeholderColor={props.theme.inputPlaceholder}
            cursorColor={props.theme.accent}
          />
        </box>
        <box width={26} justifyContent="flex-end" overflow="hidden">
          <text fg={props.focusField === "search" ? props.theme.accent : props.theme.muted}>
          ◁ {formatHumanDate(props.date)} ▷
          </text>
        </box>
      </box>

    </box>
  );
}
