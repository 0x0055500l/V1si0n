import { Link, useLocation } from 'react-router-dom';
import { Home, Scan, History, Users, MessageSquare, LogOut } from 'lucide-react';

export default function Sidebar({ user, role, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { path: '/scanner', icon: <Scan size={20} />, label: 'Escáner PCB' },
    { path: '/history', icon: <History size={20} />, label: 'Bitácora' },
    { path: '/chat', icon: <MessageSquare size={20} />, label: 'Asistente IA' }
  ];

  if (role === 'admin') {
    navItems.push({ path: '/users', icon: <Users size={20} />, label: 'Usuarios' });
  }

  return (
    <aside className="glass-panel" style={{ 
      width: '260px', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: '0',
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none'
    }}>
      <div style={{ padding: '2rem 1.5rem' }}>
        <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.8rem' }}>V1si0n</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Panel de Inspector
        </p>
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
