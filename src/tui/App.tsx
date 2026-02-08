import { Show, createMemo, createSignal, onMount } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { AppContext } from "../app/context";
import type { Session } from "../domain/types";
import { formatErrorMessage } from "../errors/format-error";
import type {
  LoginFormState,
  MatchesState,
  SearchMode,
  SearchFocusField,
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
import { extractMatchIdFromUnknown, extractShareLinkFromUnknown } from "../services/match-utils";

interface AppProps {
  app: AppContext;
}

function toggleSearchMode(mode: SearchMode): SearchMode {
  return mode === "location" ? "name" : "location";
}

type BookingPromptChoice = "reject" | "confirm";
const TUI_MAX_TENANTS = 30;
const TUI_MATCHES_LIMIT = 40;

function nextSearchFocus(current: SearchFocusField): SearchFocusField {
  if (current === "search") {
    return "matches";
  }

  if (current === "matches") {
    return "results";
  }

  return "search";
}

export function App(props: AppProps) {
  let latestSearchRequestId = 0;

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
  const [matchesState, setMatchesState] = createSignal<MatchesState>({
    loading: false,
    matches: [],
    selectedIndex: 0,
    pendingCancelMatchId: null,
    message: "",
    error: "",
  });
  const [bookingPromptOpen, setBookingPromptOpen] = createSignal(false);
  const [bookingPromptChoice, setBookingPromptChoice] = createSignal<BookingPromptChoice>("reject");
  const [matchesCancelPromptOpen, setMatchesCancelPromptOpen] = createSignal(false);
  const [matchesCancelPromptChoice, setMatchesCancelPromptChoice] =
    createSignal<BookingPromptChoice>("reject");

  const placeSummaries = createMemo(() => summarizeAvailablePlaces(searchState().results));

  function invalidatePendingSearch(): void {
    latestSearchRequestId += 1;
  }

  onMount(async () => {
    try {
      const restoredSession = await props.app.authService.requireValidSession();
      if (restoredSession) {
        setSession(restoredSession);
        setMode("search");
        void loadMatches();
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
    setMatchesState({
      loading: false,
      matches: [],
      selectedIndex: 0,
      pendingCancelMatchId: null,
      message: "",
      error: "",
    });
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
      void loadMatches();
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

    const requestId = ++latestSearchRequestId;

    setSearchState((state) => ({ ...state, loading: true, error: "", bookingMessage: "" }));
    try {
      const results = await props.app.authService.runWithValidSession((validSession) => {
        setSession(validSession);
        return props.app.availabilityService.search(validSession, {
          query: searchMode === "name" ? trimmedTerm : undefined,
          near: searchMode === "location" ? trimmedTerm : undefined,
          date,
          maxTenants: TUI_MAX_TENANTS,
        });
      });

      if (requestId !== latestSearchRequestId) {
        return;
      }

      setSearchState((state) => ({
        ...state,
        ...(state.term.trim() !== trimmedTerm || state.mode !== searchMode || state.date !== date
          ? { loading: false }
          : {
              loading: false,
              focusField: "search",
              selectedPlaceIndex: 0,
              expandedPlaceIndex: null,
              selectedExpandedSlotIndex: 0,
              pendingBookingPlaceIndex: null,
              results,
            }),
      }));
    } catch (error) {
      if (requestId !== latestSearchRequestId) {
        return;
      }

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

  async function loadMatches(): Promise<void> {
    setMatchesState((state) => ({
      ...state,
      loading: true,
      message: "",
      error: "",
      pendingCancelMatchId: null,
    }));

    try {
      const matches = await props.app.authService.runWithValidSession((session) => {
        setSession(session);
        return props.app.matchService.listActiveMatches(session, TUI_MATCHES_LIMIT);
      });

      setMatchesState((state) => ({
        ...state,
        loading: false,
        matches,
        selectedIndex: Math.min(state.selectedIndex, Math.max(0, matches.length - 1)),
      }));
    } catch (error) {
      const message = formatErrorMessage(error);
      if (message.includes("No active session")) {
        setMode("login");
      }

      setMatchesState((state) => ({
        ...state,
        loading: false,
        error: message,
      }));
    }
  }

  async function cancelSelectedMatch(): Promise<void> {
    const current = matchesState();
    const selected = current.matches[current.selectedIndex];
    if (!selected) {
      setMatchesState((state) => ({ ...state, error: "No match selected." }));
      return;
    }

    try {
      const canceled = await props.app.authService.runWithValidSession((session) => {
        setSession(session);
        return props.app.matchService.cancelMatch(session, selected.matchId);
      });

      setMatchesState((state) => ({
        ...state,
        pendingCancelMatchId: null,
        message: `Canceled ${canceled.startDate} at ${canceled.tenantName}.`,
        error: "",
      }));
      await loadMatches();
    } catch (error) {
      setMatchesState((state) => ({
        ...state,
        pendingCancelMatchId: null,
        error: formatErrorMessage(error),
      }));
    }
  }

  function openBookingPrompt(): void {
    setBookingPromptChoice("reject");
    setBookingPromptOpen(true);
  }

  function closeBookingPrompt(): void {
    setBookingPromptOpen(false);
    setBookingPromptChoice("reject");
  }

  function openMatchesCancelPrompt(): void {
    setMatchesCancelPromptChoice("reject");
    setMatchesCancelPromptOpen(true);
  }

  function closeMatchesCancelPrompt(): void {
    setMatchesCancelPromptOpen(false);
    setMatchesCancelPromptChoice("reject");
  }

  function getSelectedSlotForBooking(): BookableSlot | null {
    const search = searchState();
    const summaries = placeSummaries();
    const selectedSummary = summaries[search.selectedPlaceIndex];
    if (!selectedSummary) {
      return null;
    }

    if (search.expandedPlaceIndex !== search.selectedPlaceIndex) {
      return null;
    }

    return pickBookableSlotByIndex(selectedSummary.source, search.selectedExpandedSlotIndex);
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
      const bookingOutcome = await props.app.authService.runWithValidSession(async (validSession) => {
        setSession(validSession);
        const result = await props.app.purchaseService.purchaseSlot(validSession, {
          tenantId: slot.tenantId,
          resourceId: slot.resourceId,
          start: `${slot.startDate}T${slot.startTime}`,
          duration: slot.duration,
          numberOfPlayers: 4,
        });

        let shareLink = extractShareLinkFromUnknown(result.final.raw);
        if (!shareLink) {
          const matchId = extractMatchIdFromUnknown(result.final.raw);
          if (matchId) {
            try {
              const match = await props.app.matchService.getMatch(validSession, matchId);
              shareLink = match.shareLink;
            } catch {
              // Ignore match detail errors and keep booking success path.
            }
          }
        }

        return { result, shareLink };
      });

      setSearchState((state) => ({
        ...state,
        booking: false,
        pendingBookingPlaceIndex: null,
        bookingMessage:
          `Booked ${slot.tenantName} ${slot.startTime} (${slot.price})` +
          ` payment_id=${bookingOutcome.result.final.paymentId ?? "unknown"}` +
          (bookingOutcome.shareLink ? ` share=${bookingOutcome.shareLink}` : ""),
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
        return;
      }

      if (isSubmitKey || (key.ctrl && key.name === "s")) {
        void handleLogin();
      }
      return;
    }

    if (mode() !== "search") {
      return;
    }

    if (matchesCancelPromptOpen()) {
      if (key.name === "left") {
        setMatchesCancelPromptChoice("reject");
        return;
      }

      if (key.name === "right") {
        setMatchesCancelPromptChoice("confirm");
        return;
      }

      if (key.name === "tab") {
        setMatchesCancelPromptChoice((choice) => (choice === "reject" ? "confirm" : "reject"));
        return;
      }

      if (key.name === "escape") {
        closeMatchesCancelPrompt();
        return;
      }

      if (isSubmitKey) {
        if (key.eventType === "repeat") {
          return;
        }

        const choice = matchesCancelPromptChoice();
        closeMatchesCancelPrompt();

        if (choice === "confirm") {
          void cancelSelectedMatch();
        }
        return;
      }

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
        if (key.eventType === "repeat") {
          return;
        }

        const selectedChoice = bookingPromptChoice();
        const selectedSlot = getSelectedSlotForBooking();
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
        invalidatePendingSearch();
        setSearchState((state) => ({
          ...state,
          mode: toggleSearchMode(state.mode),
          loading: false,
          results: [],
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
          bookingMessage: "",
          error: "",
        }));
        return;
      }

      if ((key.name === "left" || key.name === "right") && !search.loading) {
        invalidatePendingSearch();
        const delta = key.name === "right" ? 1 : -1;
        const nextDate = shiftIsoDateByDays(search.date, delta);
        setSearchState((state) => ({
          ...state,
          date: nextDate,
          loading: false,
          results: [],
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
          bookingMessage: "",
          error: "",
        }));
        return;
      }

      if (
        (key.name === "down" || key.name === "j") &&
        (matchesState().matches.length > 0 || summaries.length > 0)
      ) {
        setSearchState((state) => ({
          ...state,
          focusField: matchesState().matches.length > 0 ? "matches" : "results",
        }));
        return;
      }

      if (isSubmitKey || (key.ctrl && key.name === "s")) {
        void handleSearch();
      }

      return;
    }

    if (search.focusField === "matches") {
      const state = matchesState();
      const selectedMatch = state.matches[state.selectedIndex];

      if (key.name === "tab") {
        setSearchState((state) => ({ ...state, focusField: nextSearchFocus(state.focusField) }));
        closeMatchesCancelPrompt();
        return;
      }

      if (key.name === "r") {
        void loadMatches();
        return;
      }

      if ((key.name === "down" || key.name === "j") && state.matches.length > 0) {
        if (state.selectedIndex === state.matches.length - 1 && summaries.length > 0) {
          setSearchState((prev) => ({ ...prev, focusField: "results" }));
          return;
        }

        setMatchesState((prev) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.matches.length - 1),
          pendingCancelMatchId: null,
          message: "",
          error: "",
        }));
        return;
      }

      if ((key.name === "up" || key.name === "k") && state.matches.length > 0) {
        if (state.selectedIndex === 0) {
          setSearchState((prev) => ({ ...prev, focusField: "search" }));
          return;
        }

        setMatchesState((prev) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0),
          pendingCancelMatchId: null,
          message: "",
          error: "",
        }));
        return;
      }

      if (key.name === "delete" || key.name === "backspace") {
        if (selectedMatch && !state.loading) {
          setMatchesState((prev) => ({
            ...prev,
            pendingCancelMatchId: selectedMatch.matchId,
            message: "",
            error: "",
          }));
          openMatchesCancelPrompt();
        }
        return;
      }

      if (isSubmitKey && selectedMatch?.shareLink) {
        setMatchesState((prev) => ({
          ...prev,
          message: `Share: ${selectedMatch.shareLink}`,
          error: "",
        }));
        return;
      }

      if (key.name === "escape") {
        setSearchState((state) => ({ ...state, focusField: "search" }));
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
        setSearchState((state) => ({ ...state, focusField: nextSearchFocus(state.focusField) }));
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
          closeBookingPrompt();
          return;
        }

        setSearchState((state) => ({
          ...state,
          selectedPlaceIndex: Math.min(state.selectedPlaceIndex + 1, summaries.length - 1),
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
        }));
        closeBookingPrompt();
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
          closeBookingPrompt();
          return;
        }

          setSearchState((state) => ({
            ...state,
            selectedExpandedSlotIndex: Math.max(state.selectedExpandedSlotIndex - 1, 0),
            pendingBookingPlaceIndex: null,
          }));
          closeBookingPrompt();
          return;
        }

        if (search.selectedPlaceIndex === 0) {
          setSearchState((state) => ({
            ...state,
            focusField: matchesState().matches.length > 0 ? "matches" : "search",
          }));
          closeBookingPrompt();
          return;
        }

        setSearchState((state) => ({
          ...state,
          selectedPlaceIndex: Math.max(state.selectedPlaceIndex - 1, 0),
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
          pendingBookingPlaceIndex: null,
        }));
        closeBookingPrompt();
        return;
      }

      if (isSubmitKey || key.name === "right") {
        if (isSubmitKey && key.eventType === "repeat") {
          return;
        }

        if (summaries.length === 0) {
          return;
        }

        if (isSubmitKey && expandedSlots.length > 0 && expandedSummary) {
          openBookingPrompt();
          return;
        }

        setSearchState((state) => ({
          ...state,
          expandedPlaceIndex: state.selectedPlaceIndex,
          selectedExpandedSlotIndex: 0,
          error: "",
        }));
        closeBookingPrompt();
        return;
      }

      if (key.name === "left") {
        setSearchState((state) => ({
          ...state,
          expandedPlaceIndex: null,
          selectedExpandedSlotIndex: 0,
        }));
        closeBookingPrompt();
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
      closeBookingPrompt();
    }
  });

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      width="100%"
      height="100%"
      position="relative"
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
            matchesState={matchesState()}
            summaries={placeSummaries()}
            theme={theme}
            bookingPromptOpen={bookingPromptOpen()}
            bookingPromptChoice={bookingPromptChoice()}
            matchesCancelPromptOpen={matchesCancelPromptOpen()}
            matchesCancelPromptChoice={matchesCancelPromptChoice()}
            onTermInput={(value: string) => {
              invalidatePendingSearch();
              setSearchState((state) => ({
                ...state,
                term: value,
                loading: false,
                results: [],
                error: "",
                expandedPlaceIndex: null,
                selectedExpandedSlotIndex: 0,
                pendingBookingPlaceIndex: null,
                bookingMessage: "",
              }));
              closeBookingPrompt();
              closeMatchesCancelPrompt();
            }}
            onFocusSearch={() => {
              setSearchState((state) => ({ ...state, focusField: "search" }));
              closeBookingPrompt();
              closeMatchesCancelPrompt();
            }}
            onFocusMatches={() => {
              setSearchState((state) => ({ ...state, focusField: "matches" }));
            }}
            onSelectMatch={(index: number) => {
              setSearchState((state) => ({ ...state, focusField: "matches" }));
              setMatchesState((state) => ({
                ...state,
                selectedIndex: index,
                pendingCancelMatchId: null,
                message: "",
                error: "",
              }));
              closeMatchesCancelPrompt();
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
              closeBookingPrompt();
              closeMatchesCancelPrompt();
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
              closeBookingPrompt();
              closeMatchesCancelPrompt();
            }}
            onSelectExpandedSlot={(slotIndex: number) => {
              setSearchState((state) => ({
                ...state,
                focusField: "results",
                selectedExpandedSlotIndex: slotIndex,
                pendingBookingPlaceIndex: null,
              }));
              closeBookingPrompt();
              closeMatchesCancelPrompt();
            }}
          />
        </box>
      </Show>
    </box>
  );
}
