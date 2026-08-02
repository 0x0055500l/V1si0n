import { useState, useEffect } from 'react';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('pcb');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tab: pcb | line | defect | telegram
  const [form, setForm] = useState({ name: '', description: '', location: '', severity: 'Media' });
  const [telegramForm, setTelegramForm] = useState({ bot_token: '', chat_id: '' });

  const endpoints = {
    pcb: 'http://127.0.0.1:8000/pcb-models',
    line: 'http://127.0.0.1:8000/production-lines',
    defect: 'http://127.0.0.1:8000/defects'
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      if (activeTab === 'telegram') {
        const res = await fetch('http://127.0.0.1:8000/config', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const confList = await res.json();
          const tk = confList.find(c => c.key === 'telegram_bot_token')?.value || '';
          const cid = confList.find(c => c.key === 'telegram_chat_id')?.value || '';
          setTelegramForm({ bot_token: tk, chat_id: cid });
        }
      } else {
        const res = await fetch(endpoints[activeTab], {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    
    if (activeTab === 'telegram') {
      try {
        await fetch('http://127.0.0.1:8000/config', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'telegram_bot_token', value: telegramForm.bot_token })
        });
        await fetch('http://127.0.0.1:8000/config', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'telegram_chat_id', value: telegramForm.chat_id })
        });
        alert("Configuración de Telegram guardada correctamente");
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const payload = { name: form.name };
      if (activeTab === 'pcb') payload.description = form.description;
      if (activeTab === 'line') payload.location = form.location;
      if (activeTab === 'defect') {
        payload.description = form.description;
        payload.severity = form.severity;
      }

      const res = await fetch(endpoints[activeTab], {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm({ name: '', description: '', location: '', severity: 'Media' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro de eliminar este registro?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${endpoints[activeTab]}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: activeTab === 'telegram' ? '1fr' : '1fr 300px', gap: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Configuraciones del Sistema</h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)' }}>
          <button 
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: activeTab === 'pcb' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'pcb' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer' }}
            onClick={() => setActiveTab('pcb')}
          >Modelos PCB</button>
          <button 
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: activeTab === 'line' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'line' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer' }}
            onClick={() => setActiveTab('line')}
          >Líneas de Producción</button>
          <button 
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: activeTab === 'defect' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'defect' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer' }}
            onClick={() => setActiveTab('defect')}
          >Catálogo de Defectos</button>
          <button 
            style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: activeTab === 'telegram' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'telegram' ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer' }}
            onClick={() => setActiveTab('telegram')}
          >Integraciones (Telegram)</button>
        </div>

        {loading ? <p>Cargando datos...</p> : (
          activeTab === 'telegram' ? (
            <div style={{ maxWidth: '500px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Configura los parámetros para recibir alertas en Telegram cuando V1si0n detecte placas defectuosas.
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Bot Token</label>
                  <input 
                    type="password" placeholder="Ej. 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" required 
                    value={telegramForm.bot_token} onChange={e => setTelegramForm({...telegramForm, bot_token: e.target.value})} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chat ID</label>
                  <input 
                    type="text" placeholder="Ej. -1001234567890" required 
                    value={telegramForm.chat_id} onChange={e => setTelegramForm({...telegramForm, chat_id: e.target.value})} 
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Guardar Integración</button>
              </form>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Nombre</th>
                  <th style={{ padding: '1rem' }}>Detalles</th>
                  <th style={{ padding: '1rem' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>{item.id}</td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {activeTab === 'pcb' && item.description}
                      {activeTab === 'line' && `Ubicación: ${item.location}`}
                      {activeTab === 'defect' && `Severidad: ${item.severity} | ${item.description}`}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros.</td></tr>}
              </tbody>
            </table>
          )
        )}
      </div>

      {activeTab !== 'telegram' && (
        <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1rem' }}>Añadir Registro</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              type="text" placeholder="Nombre (Ej. Arduino Uno)" required 
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} 
            />
            
            {(activeTab === 'pcb' || activeTab === 'defect') && (
              <textarea 
                placeholder="Descripción" required 
                value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                style={{ padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px', minHeight: '80px' }}
              />
            )}

            {activeTab === 'line' && (
              <input 
                type="text" placeholder="Ubicación (Ej. Nave 1)" required 
                value={form.location} onChange={e => setForm({...form, location: e.target.value})} 
              />
            )}

            {activeTab === 'defect' && (
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} style={{ padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
                <option value="Baja">Baja Severidad</option>
                <option value="Media">Media Severidad</option>
                <option value="Alta">Alta Severidad</option>
              </select>
            )}

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Guardar Cambios</button>
          </form>
        </div>
      )}
    </div>
  );
}
