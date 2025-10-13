'use client';
import { useEffect, useState } from 'react';
import { signOut } from "next-auth/react";
import '../styles/globals.css';

export default function ChatPage() {
  const [conversations, setConversations] = useState<{ id: string; title?: string }[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const title = `Chat ${new Date().toLocaleString()}`;

  // --- Cargar conversaciones al montar ---
  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(setConversations)
      .catch(console.error);
  }, []);

  // --- Cargar mensajes de una conversación seleccionada ---
  const loadConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Enviar mensaje ---
  const sendMessage = async (content: string) => {
    if (!activeConversationId) return;

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConversationId, content }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Error desconocido');

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content }, data.message]);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try {
      await sendMessage(input);
      setInput('');
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'error', content: err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ title }),
      });
      const newConv = await res.json();

      // Actualiza la lista de conversaciones
    setConversations(prev => [newConv, ...(Array.isArray(prev) ? prev : [])]);

      // Limpia mensajes y activa la nueva conversación
      setMessages([]);
      setActiveConversationId(newConv.id);
      setConversations(prev => {
        const filtered = prev.filter(c => c.id !== newConv.id);
        return [newConv, ...filtered];
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar de conversaciones */}
        <aside className="w-64 border-r p-4 bg-gradient-to-b from-blue-50 to-white shadow-lg">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full mb-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Cerrar sesión
          </button>
          <button
            onClick={handleNewConversation}
            className="w-full mb-6 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
          >
            Nueva conversación
          </button>

          <h2 className="font-bold text-gray-700 mb-3 text-lg">Mis conversaciones</h2>
          <ul>
            {conversations.map(c => (
              <li
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`cursor-pointer p-2 rounded-lg mb-1 transition 
                  ${activeConversationId === c.id ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'}`}
              >
                {c.title || "Sin título"}
              </li>
            ))}
          </ul>
        </aside>
<div className="bg-red-500 text-white p-10 m-10 rounded-lg">
  ¡Si esto es rojo, Tailwind funciona!
</div>


      {/* Panel de chat */}
      <main className="flex-1 flex flex-col p-6 bg-gray-50">
        <div className="flex-1 overflow-y-auto border rounded-xl p-4 bg-white shadow-md h-[500px]">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 my-2 rounded-2xl max-w-[75%] break-words 
                ${msg.role === 'user'
                  ? 'bg-blue-500 text-white ml-auto text-right'
                  : msg.role === 'assistant'
                  ? 'bg-gray-200 text-gray-800 text-left'
                  : 'bg-red-200 text-red-800 text-left'
                }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          {loading && <div className="text-gray-400 italic text-sm mt-2">Gemini está pensando...</div>}
        </div>

        <div className="flex gap-2 mt-4">
          <input
            className="flex-1 border rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-2xl transition disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </main>

    </div>
  );
}
