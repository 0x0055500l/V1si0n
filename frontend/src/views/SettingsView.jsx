import { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Mail, Users as UsersIcon } from 'lucide-react';
import PasswordModal from '../components/PasswordModal';
import { useLang, t } from '../i18n';

export default function SettingsView() {
  const lang = useLang();
  const [activeTab, setActiveTab] = useState('pcb');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Forms
  const [form, setForm] = useState({ name: '', description: '', location: '', severity: 'Media' });
  const [telegramForm, setTelegramForm] = useState({ bot_token: '', chat_id: '' });
  const [emailForm, setEmailForm] = useState({ smtp_server: '', port: '', user: '', password: '', recipient: '' });

  // Users for email list
  const [systemUsers, setSystemUsers] = useState([]);
  const [showUsersModal, setShowUsersModal] = useState(false);

  // Pagination & Search
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Security Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { type: 'save' | 'delete', payload: any }

  const endpoints = {
    pcb: `http://${window.location.hostname}:8000/pcb-models`,
    line: `http://${window.location.hostname}:8000/production-lines`,
    defect: `http://${window.location.hostname}:8000/defects`
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      if (activeTab === 'telegram' || activeTab === 'email') {
        const res = await fetch(`http://${window.location.hostname}:8000/config`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const confList = await res.json();
          if (activeTab === 'telegram') {
            setTelegramForm({
              bot_token: confList.find(c => c.key === 'telegram_bot_token')?.value || '',
              chat_id: confList.find(c => c.key === 'telegram_chat_id')?.value || ''
            });
          } else {
            setEmailForm({
              smtp_server: confList.find(c => c.key === 'email_smtp_server')?.value || '',
              port: confList.find(c => c.key === 'email_port')?.value || '',
              user: confList.find(c => c.key === 'email_user')?.value || '',
              password: confList.find(c => c.key === 'email_password')?.value || '',
              recipient: confList.find(c => c.key === 'email_recipient')?.value || ''
            });
            // Fetch users for the modal
            const uRes = await fetch(`http://${window.location.hostname}:8000/users`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (uRes.ok) setSystemUsers(await uRes.json());
          }
        }
      } else {
        const res = await fetch(endpoints[activeTab], { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch('');
    setCurrentPage(1);
    fetchData();
  }, [activeTab]);

  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter(d => 
      d.name?.toLowerCase().includes(search.toLowerCase()) || 
      d.id?.toString() === search ||
      d.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Request actions (triggers password modal)
  const handleSaveRequest = (e) => {
    e.preventDefault();
    setPendingAction({ type: 'save' });
    setShowPasswordModal(true);
  };

  const handleDeleteRequest = (id) => {
    setPendingAction({ type: 'delete', payload: id });
    setShowPasswordModal(true);
  };

  // Execute actions after password verify
  const executeAction = async () => {
    if (pendingAction.type === 'save') {
      await saveConfig();
    } else if (pendingAction.type === 'delete') {
      await deleteRecord(pendingAction.payload);
    }
  };

  const saveConfig = async () => {
    const token = localStorage.getItem('access_token');
    
    if (activeTab === 'telegram') {
      try {
        await fetch(`http://${window.location.hostname}:8000/config`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'telegram_bot_token', value: telegramForm.bot_token }) });
        await fetch(`http://${window.location.hostname}:8000/config`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'telegram_chat_id', value: telegramForm.chat_id }) });
        alert("Configuración de Telegram guardada correctamente");
      } catch (err) { console.error(err); }
      return;
    }

    if (activeTab === 'email') {
      try {
        const configs = [
          { key: 'email_smtp_server', value: emailForm.smtp_server },
          { key: 'email_port', value: emailForm.port },
          { key: 'email_user', value: emailForm.user },
          { key: 'email_password', value: emailForm.password },
          { key: 'email_recipient', value: emailForm.recipient }
        ];
        for (const cfg of configs) {
          await fetch(`http://${window.location.hostname}:8000/config`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
        }
        alert("Configuración de Correo guardada correctamente");
      } catch (err) { console.error(err); }
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm({ name: '', description: '', location: '', severity: 'Media' });
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const deleteRecord = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${endpoints[activeTab]}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const handleToggleUserEmail = (email) => {
    if (!email) return;
    const currentEmails = emailForm.recipient.split(',').map(e => e.trim()).filter(e => e);
    if (currentEmails.includes(email)) {
      setEmailForm({ ...emailForm, recipient: currentEmails.filter(e => e !== email).join(', ') });
    } else {
      currentEmails.push(email);
      setEmailForm({ ...emailForm, recipient: currentEmails.join(', ') });
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      <div className="glass-panel" style={{ flex: '1 1 600px', padding: '2rem', minWidth: 0 }}>
        <h2 style={{ marginBottom: '1.5rem' }}>{t(lang, 'settings_title')}</h2>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', overflowX: 'auto' }}>
          {['pcb', 'line', 'defect', 'telegram', 'email'].map(tab => (
            <button 
              key={tab}
              style={{ padding: '0.5rem 1rem', background: 'none', border: 'none', color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap' }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'pcb' ? t(lang, 'pcb_models') : tab === 'line' ? t(lang, 'lines') : tab === 'defect' ? t(lang, 'defect_dict') : tab}
            </button>
          ))}
        </div>

        {loading ? <p>Cargando datos...</p> : (
          activeTab === 'telegram' ? (
            <div style={{ maxWidth: '500px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t(lang, 'telegram_alerts')}</p>
              <form onSubmit={handleSaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'telegram_bot')}</label>
                  <input type="password" placeholder="Ej. 123456:ABC-DEF1234" required value={telegramForm.bot_token} onChange={e => setTelegramForm({...telegramForm, bot_token: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'telegram_chat')}</label>
                  <input type="text" placeholder="Ej. -1001234567890" required value={telegramForm.chat_id} onChange={e => setTelegramForm({...telegramForm, chat_id: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{t(lang, 'save_config')}</button>
              </form>
            </div>
          ) : activeTab === 'email' ? (
            <div style={{ maxWidth: '500px' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t(lang, 'email_alerts')}</p>
              <form onSubmit={handleSaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'email_server')}</label>
                  <input type="text" placeholder="Ej. smtp.gmail.com" required value={emailForm.smtp_server} onChange={e => setEmailForm({...emailForm, smtp_server: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'email_port')}</label>
                  <input type="number" placeholder="Ej. 587" required value={emailForm.port} onChange={e => setEmailForm({...emailForm, port: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'email_user')}</label>
                  <input type="email" placeholder="Usuario Correo" required value={emailForm.user} onChange={e => setEmailForm({...emailForm, user: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'email_pass')}</label>
                  <input type="password" placeholder="Contraseña SMTP" required value={emailForm.password} onChange={e => setEmailForm({...emailForm, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'email_recipients')}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="correo1@a.com, correo2@a.com" value={emailForm.recipient} onChange={e => setEmailForm({...emailForm, recipient: e.target.value})} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
                    <button type="button" onClick={() => setShowUsersModal(true)} className="btn btn-secondary" title={t(lang, 'select_registered_users')} style={{ padding: '0.75rem', borderRadius: '8px' }}>
                      <UsersIcon size={20} />
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{t(lang, 'save_config')}</button>
              </form>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar registro..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ padding: '0.5rem 1rem 0.5rem 35px', width: '200px', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ padding: '0.5rem', background: 'var(--surface-bg)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
                    <option value={10}>10 por página</option>
                    <option value={20}>20 por página</option>
                    <option value={50}>50 por página</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <th style={{ padding: '1rem' }}>ID</th>
                      <th style={{ padding: '1rem' }}>{t(lang, 'name')}</th>
                      <th style={{ padding: '1rem' }}>{t(lang, 'details')}</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>{t(lang, 'action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{item.id}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{item.name}</td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {activeTab === 'pcb' && item.description}
                          {activeTab === 'line' && `Ubicación: ${item.location}`}
                          {activeTab === 'defect' && `Severidad: ${item.severity} | ${item.description}`}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <button onClick={() => handleDeleteRequest(item.id)} className="btn btn-danger" style={{ padding: '0.5rem', borderRadius: '8px' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedData.length === 0 && <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t(lang, 'no_records')}</td></tr>}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem 0 0 0', borderTop: '1px solid var(--surface-border)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Anterior</button>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {(activeTab !== 'telegram' && activeTab !== 'email') && (
        <div className="glass-panel" style={{ flex: '1 1 300px', padding: '2rem', height: 'fit-content', minWidth: 0 }}>
          <h3 style={{ marginBottom: '1rem' }}>{t(lang, 'add_record')}</h3>
          <form onSubmit={handleSaveRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="text" placeholder={t(lang, 'name')} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />
            {(activeTab === 'pcb' || activeTab === 'defect') && <textarea placeholder={t(lang, 'desc')} required value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)', minHeight: '80px' }} />}
            {activeTab === 'line' && <input type="text" placeholder={t(lang, 'location')} required value={form.location} onChange={e => setForm({...form, location: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }} />}
            {activeTab === 'defect' && (
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-bg)', color: 'var(--text-main)' }}>
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            )}
            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Guardar Cambios</button>
          </form>
        </div>
      )}

      {/* Users Modal for Email Selection */}
      {showUsersModal && (
        <div className="sidebar-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={20} /> Seleccionar Usuarios</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Selecciona los usuarios registrados que recibirán notificaciones de calidad.</p>
            
            <div style={{ overflowY: 'auto', flex: 1, borderTop: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)', padding: '1rem 0' }}>
              {systemUsers.length === 0 ? <p>No hay usuarios con correo registrado.</p> : (
                systemUsers.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={emailForm.recipient.includes(u.email)}
                      onChange={() => handleToggleUserEmail(u.email)}
                      disabled={!u.email}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600' }}>{u.username}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{u.email || 'Sin correo asignado'}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            
            <button className="btn btn-primary" onClick={() => setShowUsersModal(false)} style={{ marginTop: '1.5rem' }}>Aceptar</button>
          </div>
        </div>
      )}

      {/* Security Verification */}
      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={executeAction}
        title={pendingAction?.type === 'save' ? 'Guardar Cambios' : 'Eliminar Registro'}
      />
    </div>
  );
}
