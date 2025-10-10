'use client';
import { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ id: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userEmail] = useState(() => `demo-${Date.now()}@linarca.com`); // email único por sesión

  async function sendMessage(userEmail: string, content: string) {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, content }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Respuesta inválida del servidor');
    }

    if (!res.ok) {
      throw new Error(data?.error || 'Error desconocido');
    }

    if (!conversationId) setConversationId(data.conversationId);
    return data.message;
  }

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      const newMessage = await sendMessage(userEmail, input);
      setMessages([...messages, newMessage]);
      setInput('');
    } catch (err: any) {
      console.error(err.message);
      alert(err.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className="bg-gray-100 p-2 rounded">{msg.content}</div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button className="bg-blue-500 text-white px-4 rounded" onClick={handleSend}>Enviar</button>
      </div>
    </div>
  );
}
