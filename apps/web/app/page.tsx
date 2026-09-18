"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WS_URL = process.env.NEXT_PUBLIC_JARVIS_WS_URL ?? "ws://localhost:4000/ws";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "conversation") {
        conversationIdRef.current = data.conversationId;
      } else if (data.type === "message") {
        setPending(false);
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      } else if (data.type === "error") {
        setPending(false);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.message}` },
        ]);
      }
    };

    return () => socket.close();
  }, []);

  function sendMessage() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !input.trim()) return;

    const content = input.trim();
    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setPending(true);
    socket.send(
      JSON.stringify({ conversationId: conversationIdRef.current, message: content })
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>JARVIS</h1>
      <p style={{ color: connected ? "green" : "crimson" }}>
        {connected ? "connected" : "disconnected"}
      </p>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 16,
          minHeight: 320,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.role === "user" ? "You" : "JARVIS"}:</strong>{" "}
            {message.content}
          </div>
        ))}
        {pending && <div style={{ color: "#888" }}>JARVIS is thinking…</div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Say something to JARVIS"
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={sendMessage} disabled={!connected}>
          Send
        </button>
      </div>
    </main>
  );
}
