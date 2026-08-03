import { useState, useEffect } from 'react';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('inspector');

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
        body: JSON.stringify({ username: newUsername, password: newPassword, role_id: newRole === 'admin' ? 2 : 1 })
      });
      if (res.ok) {
        setNewUsername('');
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

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro de eliminar este usuario?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://127.0.0.1:8000/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const d = await res.json();
        alert(d.detail);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (error) return <div style={{ color: 'var(--danger)', padding: '2rem' }}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Gestión de Usuarios</h2>
        {loading ? <p>Cargando usuarios...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Username</th>
                <th style={{ padding: '1rem' }}>Rol</th>
                <th style={{ padding: '1rem' }}>Estado</th>
                <th style={{ padding: '1rem' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>{u.id}</td>
                  <td style={{ padding: '1rem' }}>{u.username}</td>
                  <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{u.role ? u.role.name : 'Unknown'}</td>
                  <td style={{ padding: '1rem' }}>{u.is_active ? 'Activo' : 'Inactivo'}</td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => handleDelete(u.id)} style={{ background: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
        <h3 style={{ marginBottom: '1rem' }}>Nuevo Usuario</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="text" 
            placeholder="Username" 
            required 
            value={newUsername} 
            onChange={(e) => setNewUsername(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            required 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
            <option value="inspector">Inspector</option>
            <option value="admin">Administrador</option>
          </select>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Crear Cuenta</button>
        </form>
      </div>
    </div>
  );
}
