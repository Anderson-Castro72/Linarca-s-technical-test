'use client';

import { useState } from 'react';

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { id: string; role: string; content: string }[]
  >([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const conversationId = 'default-conversation-id';

  async function sendMessage(content: string) {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Error al parsear la respuesta del servidor');
    }

    if (!res.ok) {
      throw new Error(data?.error || 'Error desconocido');
    }

    return data.message;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const assistantMessage = await sendMessage(input);
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'error',
          content: error.message || 'Error enviando mensaje',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Chat con Gemini 2.5
      </h1>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-white h-[500px] shadow-sm">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 my-1 rounded-lg max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-blue-100 ml-auto text-right'
                  : msg.role === 'assistant'
                  ? 'bg-gray-100 text-left'
                  : 'bg-red-100 text-left'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}

          {loading && (
            <div className="text-gray-400 italic text-sm mt-2">
              Gemini está pensando...
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <input
            className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded-lg transition disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
