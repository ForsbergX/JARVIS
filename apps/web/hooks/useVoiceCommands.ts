"use client";

import { useEffect, useRef, useState } from "react";
import { useJarvisConnection } from "./useJarvisConnection";
import { matchCommand } from "@/lib/commandRegistry";
import { openPanel, closePanel } from "@/lib/jarvisActions";
import { useEiraStore } from "@/store/useEiraStore";

/**
 * Orchestrates the full Eira experience: wraps the working JARVIS connection
 * (chat + voice + audio-reactivity), adds a local voice/text command layer
 * that short-circuits the AI for known dashboard actions, and drives the
 * Eira state machine (idle/listening/thinking/speaking/executing/success/error).
 *
 * Listening is manual: the mic never starts itself. handleMicPress() is the
 * one entry point — pressed while idle it starts listening, pressed while
 * Jarvis is talking it interrupts him (cancels speech immediately) and
 * starts listening right away. Jarvis never starts a new utterance on his
 * own, and always settles back to idle (VILAR) once a response finishes.
 */
export function useVoiceCommands() {
  const connection = useJarvisConnection();
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  // Guards submitText against re-entry while it's synchronously handling an
  // utterance (matching + dispatching the action/confirmation or the AI call).
  const processingRef = useRef(false);

  const state = useEiraStore((s) => s.state);
  const setState = useEiraStore((s) => s.setState);
  const setConnected = useEiraStore((s) => s.setConnected);
  const setVoiceEnabledStore = useEiraStore((s) => s.setVoiceEnabled);
  const setMicSupportedStore = useEiraStore((s) => s.setMicSupported);
  const setTranscript = useEiraStore((s) => s.setTranscript);
  const setLastMessage = useEiraStore((s) => s.setLastMessage);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const supported = Boolean(SpeechRecognitionCtor);
    setMicSupported(supported);
    setMicSupportedStore(supported);
  }, [setMicSupportedStore]);

  useEffect(() => {
    setConnected(connection.connected);
  }, [connection.connected, setConnected]);

  useEffect(() => {
    setVoiceEnabledStore(connection.voiceEnabled);
  }, [connection.voiceEnabled, setVoiceEnabledStore]);

  useEffect(() => {
    connection.onAssistantText((text) => setLastMessage(text));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time states (listening/thinking/speaking) reflect live connection
  // truth and take priority; executing/success/error are set explicitly by
  // command handling below and decay on their own timers.
  useEffect(() => {
    if (listening) {
      setState("listening");
    } else if (connection.pending) {
      setState("thinking");
    } else if (connection.speaking) {
      setState("speaking");
    } else if (state === "listening" || state === "thinking" || state === "speaking") {
      setState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, connection.pending, connection.speaking]);

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

  // Surface WS-level errors as a brief Eira "error" state.
  useEffect(() => {
    const last = connection.messages[connection.messages.length - 1];
    if (last && last.role === "assistant" && last.content.startsWith("Error:")) {
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.messages.length]);

  function submitText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || processingRef.current) return;
    setTranscript(trimmed);

    // Stop listening the instant any utterance is submitted — command or
    // not — so the mic is never open while Jarvis is thinking or talking.
    recognitionRef.current?.stop();
    setListening(false);

    const match = matchCommand(trimmed);

    // A local dashboard command is fully self-contained: run the action,
    // speak ONLY its fixed short confirmation, and stop — the AI/API is
    // never invoked for this text, under any circumstance. This is the
    // entire contract; there is no other path a matched command can take.
    if (match.handled) {
      processingRef.current = true;
      const release = () => {
        processingRef.current = false;
      };

      if (match.panel) {
        openPanel(match.panel);
      } else {
        closePanel();
      }
      connection.speakText(match.confirmation).finally(release);
      return;
    }

    connection.sendMessage(trimmed);
  }

  function startListening(force = false) {
    if (processingRef.current || listening) return;
    // A forced start (mic pressed to interrupt) skips the speaking/pending
    // check on purpose — the caller just cancelled that speech itself, and
    // connection.speaking/pending in this closure won't reflect that until
    // the next render.
    if (!force && (connection.speaking || connection.pending)) return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicSupported(false);
      setMicSupportedStore(false);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }

    connection.ensureAudioContext();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "sv-SE";
    // Hands-free: keep the session open across multiple utterances instead
    // of stopping after the first one.
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        submitText(result[0].transcript);
      }
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      // Permission denied — stop trying automatically, don't spam prompts.
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        setMicSupported(false);
        setMicSupportedStore(false);
      }
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // Already starting/started.
    }
  }

  /** The single entry point for the mic control. Idle: starts listening.
   * Mid-speech: interrupts Jarvis immediately and starts listening right
   * away. This is the only way listening ever starts — Jarvis never
   * restarts the mic himself. */
  function handleMicPress() {
    if (connection.speaking) {
      connection.interruptSpeech();
      startListening(true);
      return;
    }
    startListening();
  }

  return {
    ...connection,
    listening,
    micSupported,
    handleMicPress,
  };
}
