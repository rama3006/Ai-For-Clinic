"use client";
import { useState } from "react";

export default function ChatPage() {
  const [m, setM] = useState("");
  const [out, setOut] = useState("");

  const send = async () => {
    setOut("Enviando...");
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: m || "Hi!" })
    });
    setOut(await r.text());
  };

  return (
    <main style={{ padding: 24 }}>
      <h2>Chat</h2>
      <input value={m} onChange={(e) => setM(e.target.value)} placeholder="Escribí..." />
      <button onClick={send}>Enviar</button>
      <pre>{out}</pre>
    </main>
  );
}
