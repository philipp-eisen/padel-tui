import { Show } from "solid-js";
import type { LoginFormState } from "../state";
import type { TuiTheme } from "../theme";

interface LoginScreenProps {
  theme: TuiTheme;
  state: LoginFormState;
  onEmailInput: (value: string) => void;
  onPasswordInput: (value: string) => void;
}

export function LoginScreen(props: LoginScreenProps) {
  return (
    <box
      border
      borderColor={props.theme.panelBorder}
      backgroundColor={props.theme.panelBg}
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <text fg={props.theme.text}>Login</text>
      <text fg={props.theme.muted}>Tab switches field, Enter submits, Ctrl+S submits.</text>
      <box flexDirection="row" gap={1}>
        <text fg={props.theme.text}>Email:</text>
        <input
          value={props.state.email}
          onInput={props.onEmailInput}
          placeholder="you@example.com"
          focused={props.state.focusField === "email"}
          width={42}
          backgroundColor={props.theme.inputBg}
          focusedBackgroundColor={props.theme.inputFocusedBg}
          textColor={props.theme.inputText}
          placeholderColor={props.theme.inputPlaceholder}
          cursorColor={props.theme.accent}
        />
      </box>
      <box flexDirection="row" gap={1}>
        <text fg={props.theme.text}>Password:</text>
        <input
          value={props.state.password}
          onInput={props.onPasswordInput}
          placeholder="password"
          focused={props.state.focusField === "password"}
          width={42}
          backgroundColor={props.theme.inputBg}
          focusedBackgroundColor={props.theme.inputFocusedBg}
          textColor={props.theme.inputText}
          placeholderColor={props.theme.inputPlaceholder}
          cursorColor={props.theme.accent}
        />
      </box>
      <Show when={Boolean(props.state.error)}>
        <text fg={props.theme.error}>Error: {props.state.error}</text>
      </Show>
    </box>
  );
}
