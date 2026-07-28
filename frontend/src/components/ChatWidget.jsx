import { useState, useRef, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';

export default function ChatWidget() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hola, soy la IA de V1si0n. ¿En qué puedo ayudarte con respecto al control de calidad de PCBs?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMsg })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: No pude conectarme con el servidor Ollama local. Asegúrate de que esté corriendo.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de red.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in glass-panel" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
          <Bot size={24} color="white" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Asistente V1si0n (Ollama)</h2>
          <span style={{ fontSize: '0.85rem', color: '#10b981' }}>● Online</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: 'white',
            padding: '1rem',
            borderRadius: '12px',
            borderBottomRightRadius: m.role === 'user' ? '0' : '12px',
            borderBottomLeftRadius: m.role === 'assistant' ? '0' : '12px',
            border: m.role === 'assistant' ? '1px solid var(--surface-border)' : 'none'
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', borderBottomLeftRadius: '0', color: 'var(--text-muted)' }}>
            Pensando...
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe tu pregunta sobre la inspección..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '8px', color: 'white' }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 1.5rem' }}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
