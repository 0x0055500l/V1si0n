import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Scan, History, Users, MessageSquare, LogOut, Settings, Bell } from 'lucide-react';

export default function Sidebar({ user, role, onLogout }) {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/scanner', icon: <Scan size={20} />, label: 'Escáner PCB' },
    { path: '/history', icon: <History size={20} />, label: 'Bitácora' },
    { path: '/chat', icon: <MessageSquare size={20} />, label: 'Asistente IA' }
  ];

  if (role === 'admin') {
    navItems.push({ path: '/users', icon: <Users size={20} />, label: 'Usuarios' });
    navItems.push({ path: '/settings', icon: <Settings size={20} />, label: 'Catálogos' });
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRead = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://127.0.0.1:8000/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <aside className="glass-panel" style={{ 
      width: '260px', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '0',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none',
      position: 'relative'
    }}>
      <div style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem' }}>V1si0n</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Panel de Inspector
          </p>
        </div>
        
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', position: 'relative', padding: '0.5rem' }}
          >
            <Bell size={24} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '0px', right: '0px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotif && (
            <div className="glass-panel animate-fade-in" style={{ position: 'absolute', top: '100%', left: '100%', width: '300px', zIndex: 50, padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Notificaciones</h4>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tienes notificaciones.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {notifications.map(n => (
                    <div key={n.id} onClick={() => handleRead(n.id)} style={{ padding: '0.75rem', borderRadius: '8px', background: n.is_read ? 'transparent' : 'rgba(239, 68, 68, 0.1)', border: '1px solid', borderColor: n.is_read ? 'var(--surface-border)' : 'var(--danger)', cursor: 'pointer', opacity: n.is_read ? 0.6 : 1 }}>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', fontWeight: n.is_read ? 'normal' : 'bold' }}>{n.message}</p>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{new Date(n.timestamp).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0 1rem' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-main)',
                  background: location.pathname === item.path ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s'
                }}
              >
                {item.icon}
                <span style={{ fontWeight: location.pathname === item.path ? '600' : '400' }}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--surface-border)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: '500' }}>{user}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</div>
        </div>
        <button 
          className="btn" 
          onClick={onLogout} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
