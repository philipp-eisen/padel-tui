import { createEffect, createSignal, onCleanup } from "solid-js";
import type { TuiTheme } from "../theme";

interface LoadingStripProps {
  loading: boolean;
  theme: TuiTheme;
}

const FRAMES = [".", "..", "...", "...."];

export function LoadingStrip(props: LoadingStripProps) {
  const [frameIndex, setFrameIndex] = createSignal(0);

  createEffect(() => {
    if (!props.loading) {
      setFrameIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setFrameIndex((index) => (index + 1) % FRAMES.length);
    }, 180);

    onCleanup(() => clearInterval(timer));
  });

  return (
    <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={props.theme.panelBg}>
      <text fg={props.loading ? props.theme.accentMuted : props.theme.panelBorderSoft}>
        {props.loading ? `loading availability${FRAMES[frameIndex()]}` : " "}
      </text>
    </box>
  );
}
