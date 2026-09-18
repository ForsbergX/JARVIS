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
 * Listening is fully hands-free: the mic starts on its own once permission
 * is granted, stops the instant an utterance is submitted (command or not),
 * and restarts on its own once Jarvis is done thinking and talking — no
 * button, no push-to-talk.
 */
export function useVoiceCommands() {
  const connection = useJarvisConnection();
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  // Guards the local-command path specifically: its panel-open sequencing
  // has its own setTimeout delays not reflected in connection.pending/speaking,
  // so it needs its own "still busy" flag in addition to those two.
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

  function submitText(text: string, speechEndAt: number = performance.now()) {
    const trimmed = text.trim();
    if (!trimmed || processingRef.current) return;
    setTranscript(trimmed);

    // Stop listening the instant any utterance is submitted — command or
    // not — so the mic is never open while Jarvis is thinking or talking.
    recognitionRef.current?.stop();
    setListening(false);

    const match = matchCommand(trimmed);
    const commandFoundAt = performance.now();

    if (match) {
      // Block any further command until Jarvis has finished responding to
      // this one (the auto-restart effect also waits on speaking/pending,
      // but the panel-open sequencing below has its own timers those two
      // don't cover).
      processingRef.current = true;
      const release = () => {
        processingRef.current = false;
      };

      const logTiming = (label: string, panelOpenAt: number) => {
        const voiceStartAt = performance.now();
        // eslint-disable-next-line no-console
        console.info(
          `[voice-timing] "${trimmed}" -> ${label}: ` +
            `speech-end→command-found ${(commandFoundAt - speechEndAt).toFixed(0)}ms, ` +
            `command-found→panel-open ${(panelOpenAt - commandFoundAt).toFixed(0)}ms, ` +
            `panel-open→voice-start ${(voiceStartAt - panelOpenAt).toFixed(0)}ms, ` +
            `total ${(voiceStartAt - speechEndAt).toFixed(0)}ms`
        );
      };

      if (match.id === "close-panel" || match.id === "show-overview") {
        const panelOpenAt = performance.now();
        closePanel();
        connection
          .speakText(match.confirmation, () => logTiming(match.id, panelOpenAt))
          .finally(release);
        return;
      }

      if (match.panel) {
        // Voice only decides WHICH panel and speaks the confirmation — the
        // actual close-previous/update-state/animate-forward sequencing is
        // owned entirely by the action system (lib/jarvisActions.ts), the
        // same one a future AI tool-call would invoke. Voice starts
        // immediately, in parallel with whatever animation runs.
        openPanel(match.panel, () => logTiming(match.id, performance.now()));
        connection.speakText(match.confirmation).finally(release);
        return;
      }

      connection.speakText(match.confirmation).finally(release);
      return;
    }

    connection.sendMessage(trimmed);
  }

  function startListening() {
    if (processingRef.current || connection.speaking || connection.pending || listening) {
      return;
    }

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
        submitText(result[0].transcript, performance.now());
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
      // Already starting/started — the restart effect will retry if needed.
    }
  }

  // Hands-free auto-(re)start: whenever nothing is blocking it, make sure
  // the mic is listening. Covers the very first start, and every restart
  // after Jarvis finishes thinking + talking, or after a transient stop.
  useEffect(() => {
    const canListen =
      micSupported &&
      !listening &&
      !processingRef.current &&
      !connection.speaking &&
      !connection.pending;

    if (!canListen) return;

    const timeout = setTimeout(() => startListening(), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micSupported, listening, connection.speaking, connection.pending]);

  return {
    ...connection,
    listening,
    micSupported,
  };
}
