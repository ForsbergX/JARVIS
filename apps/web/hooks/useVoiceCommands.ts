"use client";

import { useEffect, useRef, useState } from "react";
import { useJarvisConnection } from "./useJarvisConnection";
import { matchCommand } from "@/lib/commandRegistry";
import { useEiraStore } from "@/store/useEiraStore";

/**
 * Orchestrates the full Eira experience: wraps the working JARVIS connection
 * (chat + voice + audio-reactivity), adds a local voice/text command layer
 * that short-circuits the AI for known dashboard actions, and drives the
 * Eira state machine (idle/listening/thinking/speaking/executing/success/error).
 */
export function useVoiceCommands() {
  const connection = useJarvisConnection();
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const state = useEiraStore((s) => s.state);
  const setState = useEiraStore((s) => s.setState);
  const setConnected = useEiraStore((s) => s.setConnected);
  const setVoiceEnabledStore = useEiraStore((s) => s.setVoiceEnabled);
  const setMicSupportedStore = useEiraStore((s) => s.setMicSupported);
  const setTranscript = useEiraStore((s) => s.setTranscript);
  const setLastMessage = useEiraStore((s) => s.setLastMessage);
  const openPanel = useEiraStore((s) => s.openPanel);
  const closePanel = useEiraStore((s) => s.closePanel);

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
    if (!trimmed) return;
    setTranscript(trimmed);

    const match = matchCommand(trimmed);
    if (match) {
      if (match.id === "close-panel" || match.id === "show-overview") {
        closePanel();
      } else if (match.panel) {
        openPanel(match.panel);
        setTimeout(() => setState("success"), 650);
      }
      connection.speakText(match.confirmation);
      return;
    }

    connection.sendMessage(trimmed);
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicSupported(false);
      setMicSupportedStore(false);
      return;
    }

    connection.ensureAudioContext();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "sv-SE";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      submitText(event.results[0][0].transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return {
    ...connection,
    listening,
    micSupported,
    toggleListening,
    submitText,
  };
}
