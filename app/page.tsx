'use client';
import { useEffect, useState, useRef } from 'react'; 
import { signOut } from "next-auth/react";

export default function ChatPage() {
  const [conversations, setConversations] = useState<{ id: string; title?: string }[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const title = `Chat ${new Date().toLocaleString()}`;
  const messagesEndRef = useRef<HTMLDivElement>(null); 
  const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
      fetch("/api/session")
        .then(res => res.json())
        .then(data => setUserName(data?.user?.name || null))
        .catch(() => setUserName(null));
    }, []);


  useEffect(() => {
    if (messagesEndRef.current && !loading) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]); 

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.conversations)
          ? data.conversations
          : [];
        setConversations(list);
      })
      .catch(err => {
        console.error("Error cargando conversaciones:", err);
        setConversations([]);
      });
  }, []);


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
      setConversations(prev => [newConv, ...(Array.isArray(prev) ? prev : [])]);
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
    <div className="h-screen bg-gray-100 flex text-gray-800">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-300 flex flex-col p-4 shadow-lg relative">
        <h2 className="font-bold text-xl text-gray-800 mb-4 whitespace-pre-line">
          {userName ? `Hola, ${userName.split(' ')[0]}\nSoy Gemini 2.5` : 'Mis conversaciones'}
        </h2>
        
        <button
          onClick={handleNewConversation}
          className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl transition font-medium"
        >
          ➕ Nueva conversación
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 mb-20">
          {Array.isArray(conversations) && conversations.map((c, index) => (
            <div
              key={c.id ?? `conv-${index}`} // usar index si c.id es indefinido
              onClick={() => loadConversation(c.id)}
              className={`cursor-pointer p-3 rounded-xl transition truncate
                ${activeConversationId === c.id 
                  ? 'bg-blue-100 font-semibold ring-1 ring-blue-500'
                  : 'hover:bg-gray-100 text-gray-700'
                }`}
            >
              {c.title || "Sin título"}
            </div>
          ))}
        </div>


        <div className="pt-4 border-t border-gray-300 absolute bottom-0 left-0 right-0 p-4 bg-white">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full bg-red-500 text-white px-4 py-3 rounded-xl hover:bg-red-600 transition font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 pb-20">
          <div className="p-4 rounded-2xl shadow-inner shadow-gray-200 bg-white">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`p-3 my-4 rounded-2xl max-w-[80%] md:max-w-[65%] break-words whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-blue-600 text-white ml-auto text-right'
                    : msg.role === 'assistant'
                    ? 'bg-gray-200 text-gray-800 text-left'
                    : 'bg-red-100 text-red-800 text-left'
                  }`}
              >
                <p>{msg.content}</p>
              </div>
            ))}
            {loading && <div className="text-gray-400 italic text-sm mt-4">Gemini está pensando...</div>}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-300 flex-shrink-0">
          <div className="flex gap-3">
            <input
              className="flex-1 bg-gray-100 border border-gray-300 text-gray-800 rounded-2xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder-gray-400"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Escribe un mensaje..."
            />
            <button
              onClick={handleSend}
              disabled={loading || input.trim() === ''}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
