import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Bot, MessageSquare, Mic, Plus, ShieldAlert, History, Paperclip, X } from 'lucide-react';
import PasswordModal from './PasswordModal';
import { useLang, t } from '../i18n';
import ReactMarkdown from 'react-markdown';

export default function ChatWidget() {
  const lang = useLang();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

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
      const res = await fetch(`http://${window.location.hostname}:8000/chat/sessions`, { headers: { 'Authorization': `Bearer ${token}` } });
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
    setDynamicSuggestions([]); // Clear dynamic suggestions on load
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/chat/sessions/${sessionId}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        let history = await res.json();
        
        // Extract suggestions if they exist in the last message
        if (history.length > 0 && history[history.length - 1].role === 'assistant') {
          const lastMsg = history[history.length - 1].content;
          if (lastMsg.includes('__SUGGESTIONS__')) {
            const [cleanMsg, suggStr] = lastMsg.split('__SUGGESTIONS__');
            history[history.length - 1].content = cleanMsg.trim();
            if (suggStr) {
              setDynamicSuggestions(suggStr.trim().split('|').filter(s => s.trim() !== ''));
            }
          }
        }
        
        setMessages(history.length ? history : [{ role: 'assistant', content: 'Chat restaurado.' }]);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadSessions();
    const fetchPrompts = async () => {
      const token = localStorage.getItem('access_token');
      try {
        const pRes = await fetch(`http://${window.location.hostname}:8000/prompts`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (pRes.ok) setPrompts(await pRes.json());
      } catch (err) {}
    };
    fetchPrompts();
  }, []);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, dynamicSuggestions]);

  useEffect(() => {
    return () => {
      if (isEphemeral) setMessages([]);
    };
  }, [isEphemeral]);

  const handleNewChat = () => {
    setIsEphemeral(false);
    setActiveSessionId(null);
    setDynamicSuggestions([]);
    setMessages([{ role: 'assistant', content: 'Nuevo chat iniciado. ¿En qué puedo ayudarte?' }]);
  };

  const startEphemeralChat = () => {
    setShowPasswordModal(true);
  };

  const onSecretChatVerified = () => {
    setIsEphemeral(true);
    setActiveSessionId(null);
    setDynamicSuggestions([]);
    setMessages([{ role: 'assistant', content: 'Modo Autodestruible Activado. Este chat no dejará rastros en el servidor y se eliminará al salir de esta ventana.' }]);
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (messageText) => {
    const textToSend = typeof messageText === 'string' ? messageText : input;
    if (!textToSend.trim() && !imagePreview || loading) return;

    let base64Image = null;
    if (imagePreview) {
      base64Image = imagePreview;
      setMessages(prev => [...prev, { role: 'user', content: textToSend, image: imagePreview }]);
    } else {
      setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    }
    
    setInput('');
    removeImage();
    setDynamicSuggestions([]);
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const payload = { 
        message: textToSend || (lang === 'en' ? 'Please analyze this image.' : 'Analiza esta imagen por favor.'), 
        session_id: activeSessionId, 
        is_ephemeral: isEphemeral,
        lang: lang
      };
      if (base64Image) payload.image_base64 = base64Image;

      const res = await fetch(`http://${window.location.hostname}:8000/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        let finalResponse = data.response;
        let newSuggestions = [];

        // Parse suggestions from backend
        if (finalResponse.includes('__SUGGESTIONS__')) {
          const parts = finalResponse.split('__SUGGESTIONS__');
          finalResponse = parts[0].trim();
          if (parts[1]) {
            newSuggestions = parts[1].trim().split('|').filter(s => s.trim() !== '');
          }
        }

        setMessages(prev => [...prev, { role: 'assistant', content: finalResponse }]);
        setDynamicSuggestions(newSuggestions);
        
        if (data.session_id && data.session_id !== activeSessionId && !isEphemeral) {
          setActiveSessionId(data.session_id);
          loadSessions(); 
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
          const res = await fetch(`http://${window.location.hostname}:8000/speech-to-text`, {
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

  // Decide which prompts to show in the sidebar
  const displayedPrompts = dynamicSuggestions.length > 0 
    ? dynamicSuggestions.map((sugg, i) => ({ id: `dyn-${i}`, title: lang === 'en' ? 'Suggested Question' : 'Pregunta sugerida', content: sugg }))
    : [
        { id: 's1', title: lang === 'en' ? 'Performance' : 'Rendimiento', content: t(lang, 'suggest_1') },
        { id: 's2', title: lang === 'en' ? 'Defects' : 'Defectos', content: t(lang, 'suggest_2') },
        { id: 's3', title: lang === 'en' ? 'Summary' : 'Resumen', content: t(lang, 'suggest_3') }
      ];

  return (
    <div className="animate-fade-in chat-layout" style={{ gap: '2rem', height: 'calc(100vh - 4rem)' }}>
      
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
              background: m.role === 'user' ? (isEphemeral ? 'var(--danger)' : 'var(--primary)') : 'var(--surface-bg)',
              color: m.role === 'user' ? 'white' : 'var(--text-main)',
              padding: '1rem',
              borderRadius: '12px',
              borderBottomRightRadius: m.role === 'user' ? '0' : '12px',
              borderBottomLeftRadius: m.role === 'assistant' ? '0' : '12px',
              border: m.role === 'assistant' ? '1px solid var(--surface-border)' : 'none'
            }}>
              {m.image && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <img src={m.image} alt="Adjunto" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                </div>
              )}
              {m.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              )}
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

        {/* Input Area */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Image Preview */}
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem', alignSelf: 'flex-start' }}>
              <img src={imagePreview} alt="Preview" style={{ height: '80px', borderRadius: '8px', border: '2px solid var(--primary)' }} />
              <button 
                onClick={removeImage}
                style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImageChange}
            />
            
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary"
              style={{ padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
              title="Adjuntar imagen de PCB"
            >
              <Paperclip size={20} />
            </button>

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
              placeholder={isEphemeral ? t(lang, 'secret_message') : (imagePreview ? "Escribe un mensaje sobre la imagen..." : t(lang, 'type_message'))}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', padding: '1rem', borderRadius: '8px', color: 'white' }}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || (!input.trim() && !imagePreview)} 
              style={{ padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isEphemeral ? 'var(--danger)' : 'var(--primary)' }}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Prompts Library Area */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: dynamicSuggestions.length > 0 ? '#10b981' : 'white' }}>
          <MessageSquare size={18} />
          {dynamicSuggestions.length > 0 ? 'Sugerencias Dinámicas' : t(lang, 'prompts')}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayedPrompts.map(p => (
            <div 
              key={p.id}
              onClick={() => handleSend(p.content)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '1rem',
                borderRadius: '8px',
                border: dynamicSuggestions.length > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--surface-border)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = dynamicSuggestions.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: dynamicSuggestions.length > 0 ? '#10b981' : 'var(--primary)', fontSize: '0.95rem' }}>{p.title}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.content}</p>
            </div>
          ))}
          {displayedPrompts.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay sugerencias disponibles...</p>}
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
