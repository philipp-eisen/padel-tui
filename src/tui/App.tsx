import { For, Show, createSignal, onMount } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { AppContext } from "../app/context";
import type { Session } from "../domain/types";
import { formatErrorMessage } from "../errors/format-error";
import type { LoginFormState, SearchState, ViewMode } from "./state";

interface AppProps {
  app: AppContext;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface BookableSlot {
  tenantName: string;
  tenantId: string;
  resourceId: string;
  startDate: string;
  startTime: string;
  duration: number;
  price: string;
}

function collectBookableSlots(search: SearchState): BookableSlot[] {
  const slots: BookableSlot[] = [];

  for (const tenantResult of search.results) {
    for (const resource of tenantResult.resources) {
      for (const slot of resource.slots) {
        slots.push({
          tenantName: tenantResult.tenant.tenantName,
          tenantId: tenantResult.tenant.tenantId,
          resourceId: resource.resourceId,
          startDate: resource.startDate,
          startTime: slot.startTime,
          duration: slot.duration,
          price: slot.price,
        });
      }
    }
  }

  return slots;
}

export function App(props: AppProps) {
  const theme = {
    appBg: "#0b1020",
    panelBg: "#111827",
    panelBorder: "#334155",
    text: "#e5e7eb",
    muted: "#93a4b8",
    accent: "#7dd3fc",
    inputBg: "#0f172a",
    inputFocusedBg: "#1e293b",
    inputText: "#f8fafc",
    inputPlaceholder: "#64748b",
    error: "#fca5a5",
    success: "#86efac",
  };

  const [mode, setMode] = createSignal<ViewMode>("loading");
  const [session, setSession] = createSignal<Session | null>(null);
  const [loginState, setLoginState] = createSignal<LoginFormState>({
    email: "",
    password: "",
    focusField: "email",
    error: "",
  });
  const [searchState, setSearchState] = createSignal<SearchState>({
    query: "berlin",
    date: todayIsoDate(),
    focusField: "query",
    loading: false,
    booking: false,
    selectedSlotIndex: 0,
    pendingBookingSlotIndex: null,
    bookingMessage: "",
    error: "",
    results: [],
  });

  onMount(async () => {
    try {
      const restoredSession = await props.app.authService.requireValidSession();
      if (restoredSession) {
        setSession(restoredSession);
        setMode("search");
        return;
      }
    } catch {
      // no active session
    }
    setMode("login");
  });

  async function handleLogout(): Promise<void> {
    await props.app.authService.logout();
    setSession(null);
    setMode("login");
  }

  async function handleLogin(): Promise<void> {
    const form = loginState();

    if (!form.email || !form.password) {
      setLoginState((state) => ({
        ...state,
        error: "Email and password are required.",
      }));
      return;
    }

    setMode("loading");
    try {
      const nextSession = await props.app.authService.login({
        email: form.email,
        password: form.password,
      });
      setSession(nextSession);
      setSearchState((state) => ({ ...state, error: "" }));
      setMode("search");
    } catch (error) {
      setLoginState((state) => ({
        ...state,
        error: formatErrorMessage(error),
      }));
      setMode("login");
    }
  }

  async function handleSearch(): Promise<void> {
    const search = searchState();
    if (!search.query.trim()) {
      setSearchState((state) => ({
        ...state,
        error: "Search query is required.",
      }));
      return;
    }

    setSearchState((state) => ({ ...state, loading: true, error: "", bookingMessage: "" }));
    try {
      const results = await props.app.authService.runWithValidSession((validSession) => {
        setSession(validSession);
        return props.app.availabilityService.search(validSession, {
          query: search.query,
          date: search.date,
        });
      });

      setSearchState((state) => ({
        ...state,
        loading: false,
        selectedSlotIndex: 0,
        pendingBookingSlotIndex: null,
        results,
      }));
    } catch (error) {
      const message = formatErrorMessage(error);
      if (message.includes("No active session")) {
        setMode("login");
      }

      setSearchState((state) => ({
        ...state,
        loading: false,
        error: message,
      }));
    }
  }

  async function handleBookSelected(): Promise<void> {
    const search = searchState();
    const slots = collectBookableSlots(search);
    if (slots.length === 0) {
      setSearchState((state) => ({
        ...state,
        error: "No bookable slots in current results.",
      }));
      return;
    }

    const selectedIndex = Math.max(0, Math.min(search.selectedSlotIndex, slots.length - 1));
    const selectedSlot = slots[selectedIndex];
    if (!selectedSlot) {
      return;
    }

    setSearchState((state) => ({
      ...state,
      booking: true,
      error: "",
      bookingMessage: "",
    }));

    try {
      const result = await props.app.authService.runWithValidSession((validSession) => {
        setSession(validSession);
        return props.app.purchaseService.purchaseSlot(validSession, {
          tenantId: selectedSlot.tenantId,
          resourceId: selectedSlot.resourceId,
          start: `${selectedSlot.startDate}T${selectedSlot.startTime}`,
          duration: selectedSlot.duration,
          numberOfPlayers: 4,
        });
      });

      setSearchState((state) => ({
        ...state,
        booking: false,
        pendingBookingSlotIndex: null,
        bookingMessage:
          `Booked ${selectedSlot.tenantName} ${selectedSlot.startTime} (${selectedSlot.price})` +
          ` payment_id=${result.final.paymentId ?? "unknown"}`,
      }));
    } catch (error) {
      setSearchState((state) => ({
        ...state,
        booking: false,
        error: formatErrorMessage(error),
      }));
    }
  }

  useKeyboard((key) => {
    const isSubmitKey =
      key.name === "enter" ||
      key.name === "return" ||
      key.sequence === "\r" ||
      key.sequence === "\n";

    if (mode() === "login") {
      if (key.name === "tab") {
        setLoginState((state) => ({
          ...state,
          focusField: state.focusField === "email" ? "password" : "email",
        }));
      }
      if (isSubmitKey || (key.ctrl && key.name === "s")) {
        void handleLogin();
      }
      return;
    }

    if (mode() === "search") {
      const slots = collectBookableSlots(searchState());

      if (key.name === "tab") {
        setSearchState((state) => ({
          ...state,
          focusField: state.focusField === "query" ? "date" : "query",
        }));
      }

      if ((key.name === "down" || key.name === "j") && slots.length > 0) {
        setSearchState((state) => ({
          ...state,
          selectedSlotIndex: Math.min(state.selectedSlotIndex + 1, slots.length - 1),
          pendingBookingSlotIndex: null,
        }));
      }

      if ((key.name === "up" || key.name === "k") && slots.length > 0) {
        setSearchState((state) => ({
          ...state,
          selectedSlotIndex: Math.max(state.selectedSlotIndex - 1, 0),
          pendingBookingSlotIndex: null,
        }));
      }

      if (isSubmitKey || (key.ctrl && key.name === "s")) {
        void handleSearch();
      }

      if (
        (key.name === "b" || (key.ctrl && key.name === "b")) &&
        !searchState().booking &&
        !searchState().loading
      ) {
        const selectedIndex = searchState().selectedSlotIndex;
        const selectedSlot = slots[selectedIndex];

        if (!selectedSlot) {
          setSearchState((state) => ({
            ...state,
            error: "No bookable slots in current results.",
          }));
          return;
        }

        if (searchState().pendingBookingSlotIndex === selectedIndex) {
          void handleBookSelected();
        } else {
          setSearchState((state) => ({
            ...state,
            pendingBookingSlotIndex: selectedIndex,
            error: "",
            bookingMessage: `Press B again to confirm charge for ${selectedSlot.tenantName} ${selectedSlot.startTime} (${selectedSlot.price}).`,
          }));
        }
      }

      if (key.name === "escape") {
        setSearchState((state) => ({
          ...state,
          pendingBookingSlotIndex: null,
          bookingMessage: "",
        }));
      }

      if (key.ctrl && key.name === "l") {
        void handleLogout();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      padding={1}
      gap={1}
      flexGrow={1}
      backgroundColor={theme.appBg}
    >
      <box border borderColor={theme.panelBorder} backgroundColor={theme.panelBg} padding={1}>
        <text fg={theme.text}>
          <strong>padel-tui</strong> - reverse-engineered CLI/TUI
        </text>
      </box>

      <Show when={mode() === "loading"}>
        <box border borderColor={theme.panelBorder} backgroundColor={theme.panelBg} padding={1}>
          <text fg={theme.text}>Loading...</text>
        </box>
      </Show>

      <Show when={mode() === "login"}>
        <box
          border
          borderColor={theme.panelBorder}
          backgroundColor={theme.panelBg}
          padding={1}
          flexDirection="column"
          gap={1}
        >
          <text fg={theme.text}>Login</text>
          <text fg={theme.muted}>Tab switches field, Enter submits, Ctrl+S submits.</text>
          <box flexDirection="row" gap={1}>
            <text fg={theme.text}>Email:</text>
            <input
              value={loginState().email}
              onInput={(value) =>
                setLoginState((state) => ({ ...state, email: value, error: "" }))
              }
              placeholder="you@example.com"
              focused={loginState().focusField === "email"}
              width={40}
              backgroundColor={theme.inputBg}
              focusedBackgroundColor={theme.inputFocusedBg}
              textColor={theme.inputText}
              placeholderColor={theme.inputPlaceholder}
              cursorColor={theme.accent}
            />
          </box>
          <box flexDirection="row" gap={1}>
            <text fg={theme.text}>Password:</text>
            <input
              value={loginState().password}
              onInput={(value) =>
                setLoginState((state) => ({
                  ...state,
                  password: value,
                  error: "",
                }))
              }
              placeholder="password"
              focused={loginState().focusField === "password"}
              width={40}
              backgroundColor={theme.inputBg}
              focusedBackgroundColor={theme.inputFocusedBg}
              textColor={theme.inputText}
              placeholderColor={theme.inputPlaceholder}
              cursorColor={theme.accent}
            />
          </box>
          <text fg={theme.muted}>Tip: if Enter is flaky, use Ctrl+S to submit.</text>
          <Show when={Boolean(loginState().error)}>
            <text fg={theme.error}>Error: {loginState().error}</text>
          </Show>
        </box>
      </Show>

      <Show when={mode() === "search"}>
        <box flexDirection="column" gap={1}>
          <box
            border
            borderColor={theme.panelBorder}
            backgroundColor={theme.panelBg}
            padding={1}
            flexDirection="column"
            gap={1}
          >
            <text fg={theme.text}>Search availability</text>
            <text fg={theme.muted}>
              Tab query/date, Enter run, Up/Down select slot, B then B confirms booking, Esc cancels confirmation, Ctrl+L logout.
            </text>
            <box flexDirection="row" gap={1}>
              <text fg={theme.text}>Query:</text>
              <input
                value={searchState().query}
                onInput={(value) =>
                  setSearchState((state) => ({ ...state, query: value, error: "" }))
                }
                placeholder="berlin"
                focused={searchState().focusField === "query"}
                width={30}
                backgroundColor={theme.inputBg}
                focusedBackgroundColor={theme.inputFocusedBg}
                textColor={theme.inputText}
                placeholderColor={theme.inputPlaceholder}
                cursorColor={theme.accent}
              />
            </box>
            <box flexDirection="row" gap={1}>
              <text fg={theme.text}>Date:</text>
              <input
                value={searchState().date}
                onInput={(value) =>
                  setSearchState((state) => ({ ...state, date: value, error: "" }))
                }
                placeholder="YYYY-MM-DD"
                focused={searchState().focusField === "date"}
                width={20}
                backgroundColor={theme.inputBg}
                focusedBackgroundColor={theme.inputFocusedBg}
                textColor={theme.inputText}
                placeholderColor={theme.inputPlaceholder}
                cursorColor={theme.accent}
              />
            </box>
            <Show when={searchState().loading}>
              <text fg={theme.text}>Loading availability...</text>
            </Show>
            <Show when={searchState().booking}>
              <text fg={theme.text}>Booking selected slot...</text>
            </Show>
            <Show when={Boolean(searchState().bookingMessage)}>
              <text fg={theme.success}>{searchState().bookingMessage}</text>
            </Show>
            <Show when={Boolean(searchState().error)}>
              <text fg={theme.error}>Error: {searchState().error}</text>
            </Show>
          </box>

          <scrollbox
            border
            borderColor={theme.panelBorder}
            backgroundColor={theme.panelBg}
            padding={1}
            flexDirection="column"
            height={20}
          >
            <Show
              when={collectBookableSlots(searchState()).length > 0}
              fallback={<text fg={theme.muted}>No results yet. Run a search first.</text>}
            >
              <For each={collectBookableSlots(searchState())}>
                {(slot, index) => (
                  <text
                    fg={index() === searchState().selectedSlotIndex ? theme.accent : theme.text}
                  >
                    {index() === searchState().selectedSlotIndex
                      ? searchState().pendingBookingSlotIndex === index()
                        ? "!"
                        : ">"
                      : " "} {slot.tenantName} | {slot.startDate} {slot.startTime} | {slot.duration} min | {slot.price}
                  </text>
                )}
              </For>
            </Show>
          </scrollbox>
        </box>
      </Show>
    </box>
  );
}
