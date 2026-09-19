"use client";

import { useEffect, useRef, useState } from "react";
import { useJarvisConnection } from "./useJarvisConnection";
import { useEiraStore } from "@/store/useEiraStore";

// Voice lifecycle diagnostics for browser microphone and playback testing.
const DEBUG_VOICE = true;
function voiceLog(...args: unknown[]) {
  if (DEBUG_VOICE) console.log("[voice]", ...args);
}

// Conversation state transitions.
function eiraLog(tag: string) {
  console.log(`[EIRA] ${tag}`);
}

const RESTART_DELAY_AFTER_SPEECH_MS = 600;
const RESTART_DELAY_AFTER_INTERRUPT_MS = 300;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 5000;
/** One activation starts a half-duplex conversation: listen, send, speak, repeat. */
export function useVoiceCommands() {
  const connection = useJarvisConnection();
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [needsActivation, setNeedsActivation] = useState(true);

  const mountedRef = useRef(false);
  const permissionBlockedRef = useRef(false);
  const stoppedRef = useRef<(() => void) | null>(null);
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
  // Resume only after both the backend turn and its playback have completed.
  const expectingNaturalEndRef = useRef(false);
  const wasSpeakingRef = useRef(false);
  const hasActivatedRef = useRef(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsentTextRef = useRef<string | null>(null);

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

  // Streaming gaps must not reopen the mic before the final backend message.
  useEffect(() => {
    const wasSpeaking = wasSpeakingRef.current;
    wasSpeakingRef.current = connection.speaking;
    if (connection.speaking && !wasSpeaking) {
      eiraLog("SPEAKING");
    }
    if (!connection.pending && !connection.speaking && expectingNaturalEndRef.current) {
      expectingNaturalEndRef.current = false;
      setState("idle");
      scheduleStart(RESTART_DELAY_AFTER_SPEECH_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.speaking, connection.pending]);

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

  function sendToAI(text: string) {
    unsentTextRef.current = text;
    if (!connectionRef.current.sendMessage(text)) {
      // Retry only text that has not been sent; never replay an in-flight turn.
      aiTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) sendToAI(text);
      }, RETRY_BASE_DELAY_MS);
      return;
    }
    unsentTextRef.current = null;
    expectingNaturalEndRef.current = true;
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
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => startListening(), delayMs);
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
    eiraLog("THINKING");

    voiceLog("alternatives (raw):", alternatives);

    sendToAI(primary);
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
    if (!mountedRef.current || !hasActivatedRef.current || permissionBlockedRef.current || unsentTextRef.current || isRecognitionActiveRef.current) return;

    // HARD invariant, enforced here rather than trusted at every call site:
    // the mic must never be live while Jarvis is talking, or it can pick up
    // his own voice from the speakers as "user speech" and trigger a new
    // reply — a self-feeding loop that looks exactly like refusing to stop
    // talking. Every caller (mount, natural-end restart, interrupt, retry)
    // funnels through this one function, so checking once here covers all
    // of them. If blocked, don't just give up — keep checking until he's
    // actually done, so listening always eventually resumes.
    if (connectionRef.current.speaking || connectionRef.current.pending) {
      voiceLog("listening deferred — waiting for reply/playback");
      scheduleStart(250);
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicSupported(false);
      setMicSupportedStore(false);
      return;
    }

    connectionRef.current.ensureAudioContext();

    const mySessionId = ++sessionIdRef.current;
    resultHandledRef.current = false;
    expectedEndRef.current = false;
    const recognition = recognitionRef.current ?? new SpeechRecognitionCtor();
    recognition.lang = "sv-SE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    voiceLog(`starting recognition #${mySessionId} (lang=sv-SE)`);

    recognition.onstart = () => {
      voiceLog("listening started", mySessionId);
      if (sessionIdRef.current !== mySessionId) return;
      isRecognitionActiveRef.current = true;
      retryCountRef.current = 0;
      hasActivatedRef.current = true;
      setNeedsActivation(false);
      setListening(true);
      eiraLog("LISTENING");
    };
    recognition.onaudiostart = () => voiceLog(`#${mySessionId} onaudiostart`);
    recognition.onspeechstart = () => voiceLog(`#${mySessionId} onspeechstart`);

    recognition.onresult = (event: any) => {
      if (sessionIdRef.current !== mySessionId) return;
      if (resultHandledRef.current) {
        voiceLog(`#${mySessionId} onresult fired again for the same session — ignored`);
        return;
      }
      if (connectionRef.current.speaking || connectionRef.current.pending || expectedEndRef.current) return;
      const result = event.results[event.resultIndex ?? 0];
      if (!result?.isFinal || !result[0]?.transcript.trim()) return;
      resultHandledRef.current = true;
      expectedEndRef.current = true;
      const alternatives: string[] = [];
      for (let i = 0; i < result.length; i++) {
        alternatives.push(result[i].transcript);
      }
      voiceLog("final transcript", alternatives[0]);
      recognition.stop();
      setListening(false);
      handleUtterance(alternatives);
    };

    recognition.onerror = (event: any) => {
      console.error("[voice] recognition error", mySessionId, event?.error);
      if (sessionIdRef.current !== mySessionId) return;
      setListening(false);

      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setMicSupported(true); // API exists, just needs a user gesture
        permissionBlockedRef.current = true;
        setNeedsActivation(true);
        expectedEndRef.current = true;
        return;
      }
      if (event?.error === "aborted" && expectedEndRef.current) {
        // We did this ourselves (replacing the instance) — no retry needed.
        expectedEndRef.current = true;
        return;
      }
      // Transient error (no-speech, audio-capture, network, ...) — recover
      // on its own with limited backoff rather than erroring out.
      scheduleRetry();
    };

    recognition.onend = () => {
      voiceLog(`#${mySessionId} onend (expected=${expectedEndRef.current})`);
      if (sessionIdRef.current !== mySessionId) return;
      isRecognitionActiveRef.current = false;
      voiceLog("listening stopped");
      setListening(false);
      stoppedRef.current?.();
      stoppedRef.current = null;
      if (!expectedEndRef.current) {
        // Ended on its own outside the normal result/abort flow — retry.
        scheduleRetry();
      }
      expectedEndRef.current = false;
    };

    recognitionRef.current = recognition;
    try {
      isRecognitionActiveRef.current = true; // Reserve before asynchronous onstart.
      recognition.start();
    } catch (err) {
      voiceLog(`#${mySessionId} start() threw`, err);
      // Stray double-start (InvalidStateError) — recover via retry/backoff
      // rather than getting stuck.
      isRecognitionActiveRef.current = false;
      scheduleRetry();
    }
  }

  // Start only from the existing activation button; no mount-time mic or TTS.
  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setMicSupported(Boolean(SpeechRecognitionCtor));
    setMicSupportedStore(Boolean(SpeechRecognitionCtor));

    mountedRef.current = true;
    setNeedsActivation(Boolean(SpeechRecognitionCtor));
    connectionRef.current.onBeforeSpeech(async () => {
      expectingNaturalEndRef.current = true;
      if (!isRecognitionActiveRef.current) return;
      await new Promise<void>((resolve) => {
        stoppedRef.current = resolve;
        expectedEndRef.current = true;
        recognitionRef.current.abort();
      });
    });

    return () => {
      mountedRef.current = false;
      sessionIdRef.current += 1;
      stoppedRef.current?.();
      stoppedRef.current = null;
      connectionRef.current.onBeforeSpeech(undefined);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
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

  // A real user gesture allows the browser to request microphone permission.
  function activateHandsFree() {
    hasActivatedRef.current = true;
    permissionBlockedRef.current = false;
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
