"use client";

import { useEffect, useRef, useState } from "react";
import { useJarvisConnection } from "./useJarvisConnection";
import { matchCommand } from "@/lib/commandRegistry";
import { openPanel, closePanel } from "@/lib/jarvisActions";
import { useEiraStore } from "@/store/useEiraStore";

const NOT_UNDERSTOOD_REPLY = "Jag uppfattade inte panelen. Försök igen.";
const RESTART_DELAY_AFTER_SPEECH_MS = 600;
const RESTART_DELAY_AFTER_INTERRUPT_MS = 300;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 5000;

/**
 * Half-duplex hands-free voice control for the Eira dashboard.
 *
 * State machine: IDLE -> LISTENING -> PROCESSING -> SPEAKING -> (~600ms) ->
 * LISTENING. The mic never runs while Jarvis talks, and Jarvis never starts
 * talking on his own — every utterance is either a fixed local-command
 * confirmation or the fixed "didn't understand" reply. There is no manual
 * mic control: recognition starts itself on mount, and restarts itself
 * after every response. The only user-facing controls are the Escape key
 * and clicking the orb, both of which interrupt Jarvis mid-speech and start
 * listening again almost immediately.
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
    if (wasSpeaking && !connection.speaking && expectingNaturalEndRef.current) {
      expectingNaturalEndRef.current = false;
      setState("idle");
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

  /** Cancels whatever Jarvis is saying and starts listening again shortly
   * after — used by Escape and by clicking the orb. No-op if he isn't
   * currently talking. */
  function interrupt() {
    if (!connectionRef.current.speaking) return;
    expectingNaturalEndRef.current = false;
    connectionRef.current.interruptSpeech();
    setState("idle");
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

  function handleUtterance(alternatives: string[]) {
    const primary = alternatives[0]?.trim() ?? "";
    setTranscript(primary);
    setState("thinking");

    let match = matchCommand("");
    for (const alt of alternatives) {
      const candidate = matchCommand(alt);
      if (candidate.handled) {
        match = candidate;
        break;
      }
    }

    // A local dashboard command is fully self-contained: run the action,
    // speak ONLY its fixed short confirmation. An unrecognized utterance
    // gets the same fixed short reply — never a long AI response — so a
    // misheard command can't spiral into an unrelated ramble.
    if (match.handled) {
      if (match.panel) openPanel(match.panel);
      else closePanel();
      speak(match.confirmation);
    } else {
      speak(NOT_UNDERSTOOD_REPLY);
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
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "sv-SE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onstart = () => {
      if (sessionIdRef.current !== mySessionId) return;
      isRecognitionActiveRef.current = true;
      retryCountRef.current = 0;
      hasActivatedRef.current = true;
      setNeedsActivation(false);
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      if (sessionIdRef.current !== mySessionId) return;
      expectedEndRef.current = true;
      const result = event.results[0];
      const alternatives: string[] = [];
      for (let i = 0; i < result.length; i++) {
        alternatives.push(result[i].transcript);
      }
      setListening(false);
      handleUtterance(alternatives);
    };

    recognition.onerror = (event: any) => {
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
      // Transient error (no-speech, audio-capture, network, ...) — recover
      // on its own with limited backoff rather than erroring out.
      scheduleRetry();
    };

    recognition.onend = () => {
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
    } catch {
      // Stray double-start (InvalidStateError) — recover via retry/backoff
      // rather than getting stuck.
      isRecognitionActiveRef.current = false;
      scheduleRetry();
    }
  }

  // Try to go hands-free the moment the dashboard mounts. If the browser
  // blocks it (no prior user gesture), onerror above flips needsActivation
  // on and the one-time "AKTIVERA JARVIS" button takes over.
  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setMicSupported(Boolean(SpeechRecognitionCtor));
    setMicSupportedStore(Boolean(SpeechRecognitionCtor));
    if (SpeechRecognitionCtor) startListening();

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
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
   * the session as soon as recognition starts successfully. */
  function activateHandsFree() {
    startListening();
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
