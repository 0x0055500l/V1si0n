import { useState, useEffect, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import PasswordModal from '../components/PasswordModal';
import { useLang, t } from '../i18n';

export default function UsersView() {
  const lang = useLang();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('inspector');
  
  // Search and Pagination
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Security & Editing
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'delete' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, role_id: 1, is_active: true });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('No tienes permisos para ver esto.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/users', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: newUsername, email: newEmail, password: newPassword, role_id: newRole === 'admin' ? 1 : 2 })
      });
      if (res.ok) {
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.detail);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRequest = (user) => {
    setSelectedUser(user);
    setActionType('delete');
    setShowPasswordModal(true);
  };

  const handleEditRequest = (user) => {
    setEditForm({ id: user.id, role_id: user.role?.id || 1, is_active: user.is_active });
    setIsEditing(true);
  };

  const handleSaveEditRequest = (e) => {
    e.preventDefault();
    setSelectedUser(editForm);
    setActionType('edit');
    setShowPasswordModal(true);
  };

  const executeAction = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (actionType === 'delete') {
        const res = await fetch(`http://127.0.0.1:8000/users/${selectedUser.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          fetchUsers();
        } else {
          const d = await res.json();
          alert(d.detail);
        }
      } else if (actionType === 'edit') {
        const res = await fetch(`http://127.0.0.1:8000/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role_id: Number(selectedUser.role_id), is_active: selectedUser.is_active })
        });
        if (res.ok) {
          setIsEditing(false);
          fetchUsers();
        } else {
          const d = await res.json();
          alert(d.detail);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.id.toString() === search);
  }, [users, search]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // reset page if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (error) return <div style={{ color: 'var(--danger)', padding: '2rem' }}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      <div className="glass-panel" style={{ flex: '1 1 600px', padding: '2rem', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>{t(lang, 'users')}</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder={t(lang, 'search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '35px', width: '200px' }}
              />
            </div>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ width: 'auto', padding: '0.5rem' }}>
              <option value={10}>10 {t(lang, 'per_page')}</option>
              <option value={20}>20 {t(lang, 'per_page')}</option>
              <option value={50}>50 {t(lang, 'per_page')}</option>
            </select>
          </div>
        </div>

        {loading ? <p>Cargando usuarios...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>{t(lang, 'username')}</th>
                  <th style={{ padding: '1rem' }}>{t(lang, 'role')}</th>
                  <th style={{ padding: '1rem' }}>{t(lang, 'status')}</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>{t(lang, 'action')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td style={{ padding: '1rem' }}>{u.id}</td>
                    <td style={{ padding: '1rem', fontWeight: '500', whiteSpace: 'nowrap' }}>{u.username}</td>
                    <td style={{ padding: '1rem', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', background: u.role?.name === 'admin' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: u.role?.name === 'admin' ? 'var(--primary)' : 'var(--success)', fontSize: '0.85rem' }}>
                        {u.role ? u.role.name : 'Unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{u.is_active ? t(lang, 'active') : t(lang, 'inactive')}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleEditRequest(u)} 
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem', borderRadius: '8px' }}
                          title="Editar usuario"
                        >
                          {t(lang, 'edit')}
                        </button>
                        <button 
                          onClick={() => handleDeleteRequest(u)} 
                          className="btn btn-danger"
                          style={{ padding: '0.5rem', borderRadius: '8px' }}
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron usuarios.</td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem 0 0 0', borderTop: '1px solid var(--surface-border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>{t(lang, 'previous')}</button>
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>{t(lang, 'next')}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ flex: '1 1 300px', padding: '2rem', height: 'fit-content', minWidth: 0 }}>
        {isEditing ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{t(lang, 'edit')} #{editForm.id}</h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{t(lang, 'cancel')}</button>
            </div>
            <form onSubmit={handleSaveEditRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t(lang, 'role')}</label>
                <select value={editForm.role_id} onChange={(e) => setEditForm({...editForm, role_id: e.target.value})} style={{ width: '100%', padding: '0.75rem', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
                  <option value={1}>Administrador</option>
                  <option value={2}>Inspector</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div className="toggle-switch">
                  <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({...editForm, is_active: !editForm.is_active})} />
                  <span className="toggle-slider"></span>
                </div>
                <span>{editForm.is_active ? t(lang, 'active') : t(lang, 'inactive')}</span>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>{t(lang, 'save')}</button>
            </form>
          </>
        ) : (
          <>
            <h3 style={{ marginBottom: '1rem' }}>{t(lang, 'new_user')}</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                type="text" 
                placeholder={t(lang, 'username')} 
                required 
                value={newUsername} 
                onChange={(e) => setNewUsername(e.target.value)} 
              />
              <input 
                type="email" 
                placeholder="Email" 
                required 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
              />
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: '0.75rem', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
                <option value="inspector">Inspector</option>
                <option value="admin">Administrador</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>{t(lang, 'create_account')}</button>
            </form>
          </>
        )}
      </div>
      
      <PasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={executeAction}
        title={actionType === 'delete' ? "Eliminar Usuario" : "Modificar Usuario"}
      />
    </div>
  );
}
