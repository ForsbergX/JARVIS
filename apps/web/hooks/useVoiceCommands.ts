"use client";

import { useEffect, useRef, useState } from "react";
import { useJarvisConnection } from "./useJarvisConnection";
import { matchCommand, normalize } from "@/lib/commandRegistry";
import { openPanel, closePanel } from "@/lib/jarvisActions";
import { getBookingsBriefing } from "@/lib/mockBookingsData";
import { useEiraStore } from "@/store/useEiraStore";

// TEMP diagnostic logging for the speech pipeline — remove once voice
// recognition is confirmed working end-to-end (see PROBLEM 1 fix notes).
const DEBUG_VOICE = true;
function voiceLog(...args: unknown[]) {
  if (DEBUG_VOICE) console.log("[voice]", ...args);
}

// Always-on trace of the entry-greeting / wake-word state machine — this is
// the feature's own state log, not a temporary diagnostic, so it isn't
// gated behind DEBUG_VOICE like voiceLog above.
function eiraLog(tag: string) {
  console.log(`[EIRA] ${tag}`);
}

const RESTART_DELAY_AFTER_SPEECH_MS = 600;
const RESTART_DELAY_AFTER_INTERRUPT_MS = 300;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 5000;
const WAKE_WORD = "eira";
// Delay before restarting recognition right after a standby cycle (wake
// word heard or missed) — same character as RESTART_DELAY_AFTER_INTERRUPT_MS,
// named separately since it isn't actually an interrupt.
const WAKE_CYCLE_DELAY_MS = 300;
const ENTRY_GREETING = "Välkommen tillbaka, Tommy. Command Center är online. Jag är redo när du är redo.";
// If the AI never replies (backend down, dropped WebSocket, network issue —
// sendMessage() fails silently when the socket isn't open, so nothing ever
// flips connection.speaking), Jarvis would otherwise be stuck in TÄNKER
// forever with the mic off, since the only restart trigger is "speech just
// finished". This is the safety net for that.
const AI_RESPONSE_TIMEOUT_MS = 10000;
// Same safety net, for the one-time entry greeting specifically: it's the
// very first speech attempt on a cold page load, with no prior user
// gesture — if the browser's speechSynthesis silently never starts (a real
// Web Speech API flakiness point), connection.speaking never flips true,
// the natural-end restart never fires, and listening would otherwise never
// start at all.
const GREETING_TIMEOUT_MS = 6000;

/**
 * Half-duplex hands-free voice control for the Eira dashboard.
 *
 * On mount, Eira speaks a one-time entry greeting, then drops into wake-word
 * STANDBY: recognition keeps cycling in the background, but every result is
 * checked only for the word "Eira" — anything else is silently discarded and
 * standby restarts. Once the wake word is heard, one ACTIVE recognition
 * cycle listens for the real command/question (checked against the local
 * dashboard commands first, falling back to the normal AI conversation),
 * speaks the reply, then automatically returns to standby.
 *
 * State machine: STANDBY -> (wake word) -> LISTENING -> THINKING -> SPEAKING
 * -> (~600ms) -> STANDBY. The mic never runs while Jarvis talks, and Jarvis
 * never starts talking on his own. There is no manual mic control:
 * recognition starts itself on mount, and restarts itself after every
 * response. The only user-facing controls are the Escape key and clicking
 * the orb, both of which interrupt Jarvis mid-speech and return to standby
 * listening almost immediately.
 */
export function useVoiceCommands() {
  const connection = useJarvisConnection();
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [needsActivation, setNeedsActivation] = useState(false);

  const recognitionRef = useRef<any>(null);
  // Identifies the single "live" recognition instance — a stale instance's
  // late callbacks (after it's been replaced/aborted) are ignored instead of
  // acting on outdated state.
  const sessionIdRef = useRef(0);
  const isRecognitionActiveRef = useRef(false);
  // Some browsers can fire onresult more than once for a single session
  // despite continuous=false — without this, a second firing would call
  // handleUtterance again and queue a second reply on top of the first,
  // which looks exactly like "won't stop talking".
  const resultHandledRef = useRef(false);
  // True while an onend is expected as a direct result of something WE did
  // (got a result, aborted to replace the instance) — distinguishes a normal
  // stop from an unexpected one that should trigger retry/backoff.
  const expectedEndRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True once speakText has been called for the current reply — lets the
  // connection.speaking true->false watcher tell a natural finish apart
  // from an interrupt (which schedules its own, shorter restart).
  const expectingNaturalEndRef = useRef(false);
  const wasSpeakingRef = useRef(false);
  const hasActivatedRef = useRef(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Gates what a recognized result means: in "standby", a result is only
  // ever checked for the wake word; in "active", it's a real command/
  // question and goes through the normal local-match/AI-fallback flow.
  const voiceModeRef = useRef<"standby" | "active">("standby");
  // Ensures the entry greeting speaks exactly once per mount, no matter how
  // many times effects re-run (StrictMode, reconnects, etc.) — the mount
  // effect below is already StrictMode-safe via its deferred start, but this
  // is a second, explicit guard on the greeting specifically.
  const hasGreetedRef = useRef(false);

  // Always-fresh handle on the connection object for callbacks that must
  // not close over a stale render (event listeners, timeouts).
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });

  const state = useEiraStore((s) => s.state);
  const setState = useEiraStore((s) => s.setState);
  const setConnected = useEiraStore((s) => s.setConnected);
  const setVoiceEnabledStore = useEiraStore((s) => s.setVoiceEnabled);
  const setMicSupportedStore = useEiraStore((s) => s.setMicSupported);
  const setTranscript = useEiraStore((s) => s.setTranscript);

  useEffect(() => {
    setConnected(connection.connected);
  }, [connection.connected, setConnected]);

  useEffect(() => {
    setVoiceEnabledStore(connection.voiceEnabled);
  }, [connection.voiceEnabled, setVoiceEnabledStore]);

  // Drives the four displayed states directly — listening/speaking are true
  // states this hook owns; "thinking" is set explicitly while a just-heard
  // utterance is being matched (see handleUtterance).
  useEffect(() => {
    if (listening) {
      setState("listening");
    } else if (connection.speaking) {
      setState("speaking");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, connection.speaking]);

  // Fires the natural post-speech restart exactly once per utterance, only
  // for a completion this hook itself expected (not an interrupt, which
  // schedules its own restart with a different delay).
  useEffect(() => {
    const wasSpeaking = wasSpeakingRef.current;
    wasSpeakingRef.current = connection.speaking;
    if (connection.speaking && !wasSpeaking) {
      eiraLog("SPEAKING");
    }
    if (connection.speaking && aiTimeoutRef.current) {
      // A real response started arriving — the AI didn't hang after all.
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    if (connection.speaking && greetingTimeoutRef.current) {
      // The greeting actually started speaking — no need for the fallback.
      clearTimeout(greetingTimeoutRef.current);
      greetingTimeoutRef.current = null;
    }
    if (wasSpeaking && !connection.speaking && expectingNaturalEndRef.current) {
      expectingNaturalEndRef.current = false;
      setState("idle");
      returnToStandby();
      scheduleStart(RESTART_DELAY_AFTER_SPEECH_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.speaking]);

  // jarvisActions.openPanel/closePanel drive "executing"/"success" on the
  // store directly (see lib/jarvisActions.ts) so the same behavior applies
  // whether a panel was opened by voice or by clicking it — this just decays
  // those transient states back to idle afterward.
  useEffect(() => {
    if (state === "success") {
      const timeout = setTimeout(() => setState("idle"), 1400);
      return () => clearTimeout(timeout);
    }
    if (state === "error") {
      const timeout = setTimeout(() => setState("idle"), 1800);
      return () => clearTimeout(timeout);
    }
  }, [state, setState]);

  function speak(text: string) {
    expectingNaturalEndRef.current = true;
    connectionRef.current.speakText(text);
  }

  /** Drops back into wake-word standby — called every time a listening/
   * speaking cycle naturally ends, so "Eira" is always required again
   * before the next command (interrupt, AI timeout, natural speech end, or
   * an active-mode cycle that heard the wake word but no follow-up). */
  function returnToStandby() {
    voiceModeRef.current = "standby";
    eiraLog("RETURN_TO_STANDBY");
  }

  /** One-time greeting on entry, then hands off to the normal listening
   * cycle — reused by both the auto-start-on-mount path and the manual
   * "AKTIVERA JARVIS" fallback, since a browser that blocks TTS until a
   * real user gesture will only let the greeting play from the latter. */
  function greetOnceThenListen() {
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      eiraLog("ENTRY_GREETING");
      speak(ENTRY_GREETING);

      if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
      greetingTimeoutRef.current = setTimeout(() => {
        greetingTimeoutRef.current = null;
        if (connectionRef.current.speaking) return; // it did start after all
        voiceLog("Entry greeting never started speaking — listening anyway");
        expectingNaturalEndRef.current = false;
        returnToStandby();
        startListening();
      }, GREETING_TIMEOUT_MS);
    } else {
      startListening();
    }
  }

  /** AI fallback for speech that didn't match any local dashboard command.
   * Goes through the normal chat round-trip (packages/core Agent), whose
   * reply streams back and is spoken the same way a local confirmation is —
   * so the natural-end restart below applies here too. Armed with a timeout:
   * if the backend is unreachable (down, dropped socket, network issue),
   * sendMessage() fails silently and connection.speaking would simply never
   * become true, leaving Jarvis stuck in TÄNKER with the mic off forever. */
  function sendToAI(text: string) {
    expectingNaturalEndRef.current = true;
    connectionRef.current.sendMessage(text);

    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    aiTimeoutRef.current = setTimeout(() => {
      aiTimeoutRef.current = null;
      if (connectionRef.current.speaking) return; // a reply did arrive after all
      voiceLog("AI response timed out — resuming listening instead of hanging");
      expectingNaturalEndRef.current = false;
      setState("idle");
      returnToStandby();
      startListening();
    }, AI_RESPONSE_TIMEOUT_MS);
  }

  /** Cancels whatever Jarvis is saying and starts listening again shortly
   * after — used by Escape and by clicking the orb. No-op if he isn't
   * currently talking. */
  function interrupt() {
    if (!connectionRef.current.speaking) return;
    expectingNaturalEndRef.current = false;
    connectionRef.current.interruptSpeech();
    setState("idle");
    returnToStandby();
    scheduleStart(RESTART_DELAY_AFTER_INTERRUPT_MS);
  }

  function scheduleStart(delayMs: number) {
    window.setTimeout(() => startListening(), delayMs);
  }

  function scheduleRetry() {
    const attempt = retryCountRef.current;
    retryCountRef.current += 1;
    const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => startListening(), delay);
  }

  /** Standby-mode result handler — checked only for the wake word. Anything
   * else (ambient conversation, noise) is silently discarded; it never
   * reaches handleUtterance/the AI, matching wake-word gating. */
  function handleWakeWordUtterance(alternatives: string[]) {
    const heard = alternatives.some((alt) => normalize(alt).includes(WAKE_WORD));
    voiceLog(`wake-word check: heard=${heard}`, alternatives);
    if (!heard) {
      scheduleStart(WAKE_CYCLE_DELAY_MS);
      return;
    }
    eiraLog("WAKE_DETECTED");
    voiceModeRef.current = "active";

    // "Eira, öppna bokningar" in one breath: matchCommand is substring-
    // based, so the leading wake word doesn't stop it from matching
    // whatever command follows — handle it immediately instead of
    // discarding it and waiting for a second, separate utterance.
    if (alternatives.some((alt) => matchCommand(alt).handled)) {
      handleUtterance(alternatives);
    } else {
      // Just the wake word alone — listen again for the actual command.
      scheduleStart(WAKE_CYCLE_DELAY_MS);
    }
  }

  function handleUtterance(alternatives: string[]) {
    const primary = alternatives[0]?.trim() ?? "";
    setTranscript(primary);
    setState("thinking");
    eiraLog("THINKING");

    voiceLog("alternatives (raw):", alternatives);

    let match = matchCommand("");
    let matchedAlt = "";
    for (const alt of alternatives) {
      const candidate = matchCommand(alt);
      voiceLog(`  raw="${alt}" normalized="${normalize(alt)}" handled=${candidate.handled} panel=${candidate.panel ?? "-"}`);
      if (candidate.handled && !match.handled) {
        match = candidate;
        matchedAlt = alt;
      }
    }

    // Dashboard commands are always matched locally first, across every
    // recognition alternative — only if NONE of them match anything does
    // this fall through to the normal AI conversation.
    if (match.handled) {
      voiceLog(`MATCHED command="${match.id}" panel=${match.panel ?? "-"} via alternative="${matchedAlt}"`);
      if (match.panel) openPanel(match.panel);
      else closePanel();
      // "öppna bokningar" gets a real briefing built from the same booking
      // data the panel just rendered, instead of the fixed confirmation
      // every other local command uses — everything else is unchanged.
      speak(match.id === "open-bookings" ? getBookingsBriefing() : match.confirmation);
    } else {
      voiceLog("no local command matched — falling back to AI with:", primary);
      sendToAI(primary);
    }
  }

  function abortCurrentRecognition() {
    if (recognitionRef.current) {
      expectedEndRef.current = true;
      try {
        recognitionRef.current.abort();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
    isRecognitionActiveRef.current = false;
  }

  function startListening() {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    // Only one recognition instance may exist, and never two concurrent
    // start() calls.
    if (isRecognitionActiveRef.current) return;

    // HARD invariant, enforced here rather than trusted at every call site:
    // the mic must never be live while Jarvis is talking, or it can pick up
    // his own voice from the speakers as "user speech" and trigger a new
    // reply — a self-feeding loop that looks exactly like refusing to stop
    // talking. Every caller (mount, natural-end restart, interrupt, retry)
    // funnels through this one function, so checking once here covers all
    // of them. If blocked, don't just give up — keep checking until he's
    // actually done, so listening always eventually resumes.
    if (connectionRef.current.speaking) {
      voiceLog("startListening deferred — Jarvis is still speaking");
      window.setTimeout(() => startListening(), 250);
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicSupported(false);
      setMicSupportedStore(false);
      return;
    }

    abortCurrentRecognition();
    connectionRef.current.ensureAudioContext();

    const mySessionId = ++sessionIdRef.current;
    resultHandledRef.current = false;
    // Captured once per session so this session's callbacks always agree on
    // what it was listening for, even if voiceModeRef changes later (e.g. a
    // wake-word detection flips it while this closure is still alive).
    const modeAtStart = voiceModeRef.current;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "sv-SE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    voiceLog(`starting recognition #${mySessionId} (lang=sv-SE, mode=${modeAtStart})`);

    recognition.onstart = () => {
      voiceLog(`#${mySessionId} onstart`);
      if (sessionIdRef.current !== mySessionId) return;
      isRecognitionActiveRef.current = true;
      retryCountRef.current = 0;
      hasActivatedRef.current = true;
      setNeedsActivation(false);
      setListening(true);
      eiraLog(modeAtStart === "active" ? "LISTENING" : "WAKE_STANDBY");
    };
    recognition.onaudiostart = () => voiceLog(`#${mySessionId} onaudiostart`);
    recognition.onspeechstart = () => voiceLog(`#${mySessionId} onspeechstart`);

    recognition.onresult = (event: any) => {
      if (sessionIdRef.current !== mySessionId) return;
      if (resultHandledRef.current) {
        voiceLog(`#${mySessionId} onresult fired again for the same session — ignored`);
        return;
      }
      resultHandledRef.current = true;
      expectedEndRef.current = true;
      const result = event.results[0];
      const alternatives: string[] = [];
      for (let i = 0; i < result.length; i++) {
        alternatives.push(result[i].transcript);
      }
      voiceLog(`#${mySessionId} onresult`, alternatives);
      setListening(false);
      if (modeAtStart === "standby") {
        handleWakeWordUtterance(alternatives);
      } else {
        handleUtterance(alternatives);
      }
    };

    recognition.onerror = (event: any) => {
      voiceLog(`#${mySessionId} onerror`, event?.error);
      if (sessionIdRef.current !== mySessionId) return;
      isRecognitionActiveRef.current = false;
      setListening(false);

      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setMicSupported(true); // API exists, just needs a user gesture
        if (!hasActivatedRef.current) setNeedsActivation(true);
        expectedEndRef.current = true;
        return;
      }
      if (event?.error === "aborted") {
        // We did this ourselves (replacing the instance) — no retry needed.
        expectedEndRef.current = true;
        return;
      }
      if (modeAtStart === "active" && event?.error === "no-speech") {
        // Wake word was heard but no command followed — don't keep the mic
        // pinned in "active" mode waiting forever; back to standby so a
        // later, unrelated sound isn't mistaken for a command.
        returnToStandby();
      }
      // Transient error (no-speech, audio-capture, network, ...) — recover
      // on its own with limited backoff rather than erroring out.
      scheduleRetry();
    };

    recognition.onend = () => {
      voiceLog(`#${mySessionId} onend (expected=${expectedEndRef.current})`);
      if (sessionIdRef.current !== mySessionId) return;
      isRecognitionActiveRef.current = false;
      setListening(false);
      if (!expectedEndRef.current) {
        // Ended on its own outside the normal result/abort flow — retry.
        scheduleRetry();
      }
      expectedEndRef.current = false;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      voiceLog(`#${mySessionId} start() threw`, err);
      // Stray double-start (InvalidStateError) — recover via retry/backoff
      // rather than getting stuck.
      isRecognitionActiveRef.current = false;
      scheduleRetry();
    }
  }

  // Try to go hands-free the moment the dashboard mounts. If the browser
  // blocks it (no prior user gesture), onerror above flips needsActivation
  // on and the one-time "AKTIVERA JARVIS" button takes over.
  //
  // ROOT CAUSE (PROBLEM 1): React's StrictMode (on by default in Next.js,
  // no override in next.config.mjs) double-invokes this effect in dev —
  // mount, cleanup, mount again, synchronously. The cleanup used to call
  // abortCurrentRecognition() on a SpeechRecognition instance that had just
  // been start()-ed moments earlier, before it had finished initializing.
  // Chrome's Web Speech implementation doesn't handle a start()->abort()
  // this rapid cleanly: the SECOND instance's onstart still fires normally
  // (so the UI shows LYSSNAR), but its underlying audio pipeline never
  // properly attaches, so speech is silently never recognized — matching
  // the reported symptom exactly. Fix: defer the actual start by a tick via
  // a cancellable timeout, so StrictMode's throwaway mount/cleanup cycle
  // resolves (schedule -> cancel -> schedule) before any real
  // SpeechRecognition instance is ever created.
  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setMicSupported(Boolean(SpeechRecognitionCtor));
    setMicSupportedStore(Boolean(SpeechRecognitionCtor));

    let cancelled = false;
    let startTimeout: ReturnType<typeof setTimeout> | null = null;
    if (SpeechRecognitionCtor) {
      startTimeout = setTimeout(() => {
        if (!cancelled) greetOnceThenListen();
      }, 0);
    }

    return () => {
      cancelled = true;
      if (startTimeout) clearTimeout(startTimeout);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (greetingTimeoutRef.current) clearTimeout(greetingTimeoutRef.current);
      abortCurrentRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape interrupts Jarvis mid-speech from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") interrupt();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** One-time recovery path for browsers that blocked the automatic start —
   * called from a real user gesture (the "AKTIVERA JARVIS" button), which
   * lets the permission prompt actually appear. Disappears for the rest of
   * the session as soon as recognition starts successfully. Also the
   * fallback if TTS itself needed a real gesture: if the greeting never
   * got to play automatically, this click is what finally lets it. */
  function activateHandsFree() {
    greetOnceThenListen();
  }

  return {
    ...connection,
    listening,
    micSupported,
    needsActivation,
    activateHandsFree,
    /** Click-on-the-orb interrupt (see EiraExperience) — identical to Escape. */
    handleOrbInterrupt: interrupt,
  };
}
