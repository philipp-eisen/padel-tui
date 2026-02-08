import type { BookableSlot } from "../types";
import type { TuiTheme } from "../theme";

export type BookingPromptChoice = "reject" | "confirm";

interface BookingConfirmModalProps {
  open: boolean;
  slot: BookableSlot | null;
  choice: BookingPromptChoice;
  theme: TuiTheme;
  onChooseReject: () => void;
  onChooseConfirm: () => void;
}

export function BookingConfirmModal(props: BookingConfirmModalProps) {
  if (!props.open || !props.slot) {
    return null;
  }

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <box
        border
        borderColor={props.theme.panelBorder}
        backgroundColor="#0b1a22"
        padding={1}
        width={64}
        flexDirection="column"
        gap={1}
      >
        <text fg={props.theme.text}>Book this slot?</text>
        <text fg={props.theme.muted}>
          {props.slot.tenantName} | {props.slot.startDate} {props.slot.startTime} | {props.slot.duration}m
          | {props.slot.price}
        </text>
        <text fg={props.theme.muted}>Left/Right choose, Enter apply, Esc cancel</text>
        <box flexDirection="row" gap={2}>
          <box
            border
            borderColor={props.choice === "reject" ? props.theme.accent : props.theme.panelBorder}
            paddingLeft={1}
            paddingRight={1}
            onMouseDown={props.onChooseReject}
          >
            <text fg={props.choice === "reject" ? props.theme.text : props.theme.muted}>Reject</text>
          </box>
          <box
            border
            borderColor={props.choice === "confirm" ? props.theme.warning : props.theme.panelBorder}
            paddingLeft={1}
            paddingRight={1}
            onMouseDown={props.onChooseConfirm}
          >
            <text fg={props.choice === "confirm" ? props.theme.warning : props.theme.muted}>Confirm</text>
          </box>
        </box>
      </box>
    </box>
  );
}
