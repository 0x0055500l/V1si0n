import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Bot, MessageSquare, Mic, Plus, ShieldAlert, History } from 'lucide-react';
import PasswordModal from './PasswordModal';
import { useLang, t } from '../i18n';

export default function ChatWidget() {
  const lang = useLang();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompts, setPrompts] = useState([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const endOfMessagesRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.initialPrompt) {
      setInput(location.state.initialPrompt);
    }
  }, [location.state]);

  const loadSessions = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('http://127.0.0.1:8000/chat/sessions', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !activeSessionId && !isEphemeral) {
          loadHistory(data[0].id);
        } else if (data.length === 0 && !isEphemeral) {
          setMessages([{ role: 'assistant', content: 'Hola, soy la IA de V1si0n. ¿En qué puedo ayudarte hoy?' }]);
        }
      }
    } catch (err) { console.error(err); }
  };

  const loadHistory = async (sessionId) => {
    setIsEphemeral(false);
    setActiveSessionId(sessionId);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`http://127.0.0.1:8000/chat/sessions/${sessionId}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const history = await res.json();
        setMessages(history.length ? history : [{ role: 'assistant', content: 'Chat restaurado.' }]);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadSessions();
    const fetchPrompts = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const pRes = await fetch('http://127.0.0.1:8000/prompts', { headers: { 'Authorization': `Bearer ${token}` } });
        if (pRes.ok) setPrompts(await pRes.json());
      } catch (err) {}
    };
    fetchPrompts();
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup ephemeral chat on unmount
  useEffect(() => {
    return () => {
      if (isEphemeral) {
        setMessages([]); // Wiped without a trace
      }
    };
  }, [isEphemeral]);

  const handleNewChat = () => {
    setIsEphemeral(false);
    setActiveSessionId(null);
    setMessages([{ role: 'assistant', content: 'Nuevo chat iniciado. ¿En qué puedo ayudarte?' }]);
  };

  const startEphemeralChat = () => {
    setShowPasswordModal(true);
  };

  const onSecretChatVerified = () => {
    setIsEphemeral(true);
    setActiveSessionId(null);
    setMessages([{ role: 'assistant', content: 'Modo Autodestruible Activado. Este chat no dejará rastros en el servidor y se eliminará al salir de esta ventana.' }]);
  };

  const handleSend = async (messageText) => {
    const textToSend = typeof messageText === 'string' ? messageText : input;
    if (!textToSend.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
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
        body: JSON.stringify({ message: textToSend, session_id: activeSessionId, is_ephemeral: isEphemeral })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        if (data.session_id && data.session_id !== activeSessionId && !isEphemeral) {
          setActiveSessionId(data.session_id);
          loadSessions(); // reload sidebar
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error en conexión con la IA.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de red.' }]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        const token = localStorage.getItem('access_token');
        setLoading(true);
        try {
          const res = await fetch('http://127.0.0.1:8000/speech-to-text', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.text) {
              setInput(data.text);
              handleSend(data.text);
            }
          }
        } catch (err) { console.error(err); } 
        finally {
          setLoading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '250px 1fr 300px', gap: '2rem', height: 'calc(100vh - 4rem)' }}>
      
      {/* Sessions Sidebar */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', overflowY: 'auto' }}>
        <button onClick={handleNewChat} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>
          <Plus size={18} /> {t(lang, 'new_chat')}
        </button>
        <button onClick={startEphemeralChat} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <ShieldAlert size={18} /> {t(lang, 'secret_chat')}
        </button>

        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={16} /> {t(lang, 'history_tab')}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => loadHistory(s.id)}
              style={{ 
                padding: '0.75rem', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                background: activeSessionId === s.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: activeSessionId === s.id ? 'white' : 'var(--text-main)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.9rem'
              }}
            >
              {s.title}
            </div>
          ))}
          {sessions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t(lang, 'no_chats')}</p>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', border: isEphemeral ? '2px solid var(--danger)' : 'none' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: isEphemeral ? 'var(--danger)' : 'var(--primary)', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
            <Bot size={24} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              {isEphemeral ? 'Asistente Secreto (Autodestruible)' : 'Asistente V1si0n'}
            </h2>
            <span style={{ fontSize: '0.85rem', color: isEphemeral ? 'var(--danger)' : '#10b981' }}>● Online</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ 
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: m.role === 'user' ? (isEphemeral ? 'var(--danger)' : 'var(--primary)') : 'rgba(255,255,255,0.05)',
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
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', borderBottomLeftRadius: '0', color: 'var(--text-muted)', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ width: '8px', height: '8px', background: isEphemeral ? 'var(--danger)' : 'var(--primary)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
              <span style={{ width: '8px', height: '8px', background: isEphemeral ? 'var(--danger)' : 'var(--primary)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.2s' }}></span>
              <span style={{ width: '8px', height: '8px', background: isEphemeral ? 'var(--danger)' : 'var(--primary)', borderRadius: '50%', animation: 'pulse 1.5s infinite 0.4s' }}></span>
              <span style={{ marginLeft: '8px' }}>Escribiendo...</span>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            type="button" 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`} 
            style={{ padding: '1rem', borderRadius: '50%', animation: isRecording ? 'pulse-record 1.5s infinite' : 'none' }}
            title="Mantén presionado para hablar"
          >
            <Mic size={20} color={isRecording ? 'white' : 'var(--text-muted)'} />
          </button>
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isEphemeral ? t(lang, 'secret_message') : t(lang, 'type_message')}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '8px', color: 'white' }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading} 
            style={{ padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isEphemeral ? 'var(--danger)' : 'var(--primary)' }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Prompts Library Area */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={18} />
          {t(lang, 'prompts')}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {prompts.map(p => (
            <div 
              key={p.id}
              onClick={() => handleSend(p.content)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontSize: '0.95rem' }}>{p.title}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.content}</p>
            </div>
          ))}
          {prompts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Cargando prompts...</p>}
        </div>
      </div>

      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={onSecretChatVerified}
        title="Autenticar Chat Secreto"
      />
    </div>
  );
}
