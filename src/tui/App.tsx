import { Show, createMemo, createSignal, onMount } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { AppContext } from "../app/context";
import type { Session } from "../domain/types";
import { formatErrorMessage } from "../errors/format-error";
import { BookingConfirmModal, type BookingPromptChoice } from "./components/BookingConfirmModal";
import type {
  LoginFormState,
  SearchMode,
  SearchState,
  ViewMode,
} from "./state";
import type { BookableSlot } from "./types";
import { LoginScreen } from "./screens/LoginScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { theme } from "./theme";
import {
  collectBookableSlots,
  pickBookableSlotByIndex,
  shiftIsoDateByDays,
  summarizeAvailablePlaces,
  todayIsoDate,
} from "./utils";

interface AppProps {
  app: AppContext;
}

function toggleSearchMode(mode: SearchMode): SearchMode {
  return mode === "location" ? "name" : "location";
}

export function App(props: AppProps) {
  const [mode, setMode] = createSignal<ViewMode>("loading");
  const [, setSession] = createSignal<Session | null>(null);
  const [loginState, setLoginState] = createSignal<LoginFormState>({
    email: "",
    password: "",
    focusField: "email",
    error: "",
  });
  const [searchState, setSearchState] = createSignal<SearchState>({
    term: "",
    mode: "location",
    date: todayIsoDate(),
    focusField: "search",
    loading: false,
    booking: false,
    selectedPlaceIndex: 0,
    expandedPlaceIndex: null,
    selectedExpandedSlotIndex: 0,
    pendingBookingPlaceIndex: null,
    bookingMessage: "",
    error: "",
    results: [],
  });
  const [bookingPromptOpen, setBookingPromptOpen] = createSignal(false);
  const [bookingPromptChoice, setBookingPromptChoice] = createSignal<BookingPromptChoice>("reject");
  const [bookingPromptSlot, setBookingPromptSlot] = createSignal<BookableSlot | null>(null);

  const placeSummaries = createMemo(() => summarizeAvailablePlaces(searchState().results));

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

  async function runSearch(term: string, searchMode: SearchMode, date: string): Promise<void> {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) {
      setSearchState((state) => ({
        ...state,
        error: "Enter a location or place name.",
      }));
      return;
    }

    setSearchState((state) => ({ ...state, loading: true, error: "", bookingMessage: "" }));
    try {
      const results = await props.app.authService.runWithValidSession((validSession) => {
        setSession(validSession);
        return props.app.availabilityService.search(validSession, {
          query: searchMode === "name" ? trimmedTerm : undefined,
          near: searchMode === "location" ? trimmedTerm : undefined,
          date,
        });
      });

      setSearchState((state) => ({
        ...state,
        loading: false,
        focusField: "search",
        selectedPlaceIndex: 0,
        expandedPlaceIndex: null,
        selectedExpandedSlotIndex: 0,
        pendingBookingPlaceIndex: null,
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

  async function handleSearch(): Promise<void> {
    const search = searchState();
    await runSearch(search.term, search.mode, search.date);
  }

  function openBookingPromptFor(slot: BookableSlot): void {
    setBookingPromptSlot(slot);
    setBookingPromptChoice("reject");
    setBookingPromptOpen(true);
  }

  function closeBookingPrompt(): void {
    setBookingPromptOpen(false);
    setBookingPromptChoice("reject");
    setBookingPromptSlot(null);
  }

  async function handleBookSelected(slot: BookableSlot): Promise<void> {
    if (!slot) {
      setSearchState((state) => ({
        ...state,
        error: "No bookable slots for selected place.",
      }));
      return;
    }

    setSearchState((state) => ({
      ...state,
      booking: true,
      pendingBookingPlaceIndex: null,
      error: "",
      bookingMessage: "",
    }));

    try {
      const result = await props.app.authService.runWithValidSession((validSession) => {
        setSession(validSession);
        return props.app.purchaseService.purchaseSlot(validSession, {
          tenantId: slot.tenantId,
          resourceId: slot.resourceId,
          start: `${slot.startDate}T${slot.startTime}`,
          duration: slot.duration,
          numberOfPlayers: 4,
        });
      });

      setSearchState((state) => ({
        ...state,
        booking: false,
        pendingBookingPlaceIndex: null,
        bookingMessage:
          `Booked ${slot.tenantName} ${slot.startTime} (${slot.price})` +
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

    if (mode() !== "search") {
      return;
    }

    if (bookingPromptOpen()) {
      if (key.name === "left") {
        setBookingPromptChoice("reject");
        return;
      }

      if (key.name === "right") {
        setBookingPromptChoice("confirm");
        return;
      }

      if (key.name === "tab") {
        setBookingPromptChoice((choice) => (choice === "reject" ? "confirm" : "reject"));
        return;
      }

      if (key.name === "escape") {
        closeBookingPrompt();
        return;
      }

      if (isSubmitKey) {
        const selectedSlot = bookingPromptSlot();
        const selectedChoice = bookingPromptChoice();
        closeBookingPrompt();

        if (selectedChoice === "confirm" && selectedSlot) {
          void handleBookSelected(selectedSlot);
        }
        return;
      }

      return;
    }

    const search = searchState();
    const summaries = placeSummaries();

    if (key.ctrl && key.name === "l") {
      void handleLogout();
      return;
    }

    if (search.focusField === "search") {
      if (key.name === "tab") {
        setSearchState((state) => ({
          ...state,
          mode: toggleSearchMode(state.mode),
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
          bookingMessage: "",
          error: "",
        }));
        return;
      }

      if ((key.name === "left" || key.name === "right") && !search.loading) {
        const delta = key.name === "right" ? 1 : -1;
        const nextDate = shiftIsoDateByDays(search.date, delta);
        setSearchState((state) => ({
          ...state,
          date: nextDate,
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
          bookingMessage: "",
          error: "",
        }));

        if (search.term.trim().length > 0) {
          void runSearch(search.term, search.mode, nextDate);
        }
        return;
      }

      if ((key.name === "down" || key.name === "j") && summaries.length > 0) {
        setSearchState((state) => ({ ...state, focusField: "results" }));
        return;
      }

      if (isSubmitKey || (key.ctrl && key.name === "s")) {
        void handleSearch();
      }

      return;
    }

    if (search.focusField === "results") {
      const expandedSummary =
        search.expandedPlaceIndex === search.selectedPlaceIndex
          ? summaries[search.selectedPlaceIndex]
          : null;
      const expandedSlots = expandedSummary ? collectBookableSlots(expandedSummary.source) : [];

      if (key.name === "tab") {
        setSearchState((state) => ({ ...state, focusField: "search" }));
        return;
      }

      if ((key.name === "down" || key.name === "j") && summaries.length > 0) {
        if (expandedSlots.length > 0) {
          setSearchState((state) => ({
            ...state,
            selectedExpandedSlotIndex: Math.min(
              state.selectedExpandedSlotIndex + 1,
              expandedSlots.length - 1,
            ),
            pendingBookingPlaceIndex: null,
          }));
          return;
        }

        setSearchState((state) => ({
          ...state,
          selectedPlaceIndex: Math.min(state.selectedPlaceIndex + 1, summaries.length - 1),
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
        }));
        return;
      }

      if ((key.name === "up" || key.name === "k") && summaries.length > 0) {
        if (expandedSlots.length > 0) {
          if (search.selectedExpandedSlotIndex === 0) {
            setSearchState((state) => ({
              ...state,
              expandedPlaceIndex: null,
              selectedExpandedSlotIndex: 0,
              pendingBookingPlaceIndex: null,
            }));
            return;
          }

          setSearchState((state) => ({
            ...state,
            selectedExpandedSlotIndex: Math.max(state.selectedExpandedSlotIndex - 1, 0),
            pendingBookingPlaceIndex: null,
          }));
          return;
        }

        if (search.selectedPlaceIndex === 0) {
          setSearchState((state) => ({ ...state, focusField: "search" }));
          return;
        }

        setSearchState((state) => ({
          ...state,
          selectedPlaceIndex: Math.max(state.selectedPlaceIndex - 1, 0),
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
        }));
        return;
      }

      if (isSubmitKey || key.name === "right") {
        if (summaries.length === 0) {
          return;
        }

        if (isSubmitKey && expandedSlots.length > 0 && expandedSummary) {
          const selectedSlot = pickBookableSlotByIndex(
            expandedSummary.source,
            search.selectedExpandedSlotIndex,
          );
          if (selectedSlot) {
            openBookingPromptFor(selectedSlot);
          }
          return;
        }

        setSearchState((state) => ({
          ...state,
          expandedPlaceIndex: state.selectedPlaceIndex,
          selectedExpandedSlotIndex: 0,
          error: "",
        }));
        return;
      }

      if (key.name === "left") {
        setSearchState((state) => ({
          ...state,
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
        }));
        return;
      }
    }

    if (key.name === "escape") {
      setSearchState((state) => ({
        ...state,
        focusField: "search",
        expandedPlaceIndex: null,
        selectedExpandedSlotIndex: 0,
        pendingBookingPlaceIndex: null,
        bookingMessage: "",
      }));
    }
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      width="100%"
      height="100%"
      backgroundColor={theme.appBg}
    >
      <Show when={mode() === "loading"}>
        <box border borderColor={theme.panelBorder} backgroundColor={theme.panelBg} padding={1}>
          <text fg={theme.text}>Loading...</text>
        </box>
      </Show>

      <Show when={mode() === "login"}>
        <LoginScreen
          theme={theme}
          state={loginState()}
          onEmailInput={(value) => setLoginState((state) => ({ ...state, email: value, error: "" }))}
          onPasswordInput={(value) =>
            setLoginState((state) => ({
              ...state,
              password: value,
              error: "",
            }))
          }
        />
      </Show>

      <Show when={mode() === "search"}>
        <box flexDirection="column" flexGrow={1}>
          <SearchScreen
            state={searchState()}
            summaries={placeSummaries()}
            theme={theme}
            bookingPromptOpen={bookingPromptOpen()}
            onTermInput={(value: string) => {
              setSearchState((state) => ({
                ...state,
                term: value,
                error: "",
                expandedPlaceIndex: null,
                selectedExpandedSlotIndex: 0,
                pendingBookingPlaceIndex: null,
                bookingMessage: "",
              }));
            }}
            onFocusSearch={() => {
              setSearchState((state) => ({ ...state, focusField: "search" }));
            }}
            onToggleMode={() => {
              setSearchState((state) => ({
                ...state,
                mode: toggleSearchMode(state.mode),
                error: "",
                expandedPlaceIndex: null,
                selectedExpandedSlotIndex: 0,
                pendingBookingPlaceIndex: null,
                bookingMessage: "",
              }));
            }}
            onFocusResults={() => {
              setSearchState((state) => ({ ...state, focusField: "results" }));
            }}
            onSelectPlace={(index: number) => {
              setSearchState((state) => ({
                ...state,
                focusField: "results",
                selectedPlaceIndex: index,
                pendingBookingPlaceIndex: null,
              }));
            }}
            onExpandPlace={(index: number) => {
              setSearchState((state) => ({
                ...state,
                focusField: "results",
                selectedPlaceIndex: index,
                expandedPlaceIndex: state.expandedPlaceIndex === index ? null : index,
                selectedExpandedSlotIndex: 0,
                pendingBookingPlaceIndex: null,
              }));
            }}
            onSelectExpandedSlot={(slotIndex: number) => {
              setSearchState((state) => ({
                ...state,
                focusField: "results",
                selectedExpandedSlotIndex: slotIndex,
                pendingBookingPlaceIndex: null,
              }));
            }}
          />
          <BookingConfirmModal
            open={bookingPromptOpen()}
            slot={bookingPromptSlot()}
            choice={bookingPromptChoice()}
            theme={theme}
            onChooseReject={() => {
              setBookingPromptChoice("reject");
              closeBookingPrompt();
            }}
            onChooseConfirm={() => {
              const slot = bookingPromptSlot();
              closeBookingPrompt();
              if (slot) {
                void handleBookSelected(slot);
              }
            }}
          />
        </box>
      </Show>
    </box>
  );
}
