import { useState } from 'react';
import { KeyRound, Mail, User as UserIcon, Lock } from 'lucide-react';

export default function Login({ onLogin }) {
  const [viewState, setViewState] = useState('login'); // login, register, forgot, verify, reset
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (viewState === 'register') {
        const response = await fetch(`http://${window.location.hostname}:8000/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, role_id: 2 }) // default inspector
        });
        if (!response.ok) throw new Error((await response.json()).detail || 'Error al registrar usuario');
        
        setViewState('login');
        setSuccess('Registro exitoso. Ahora puedes iniciar sesión.');
      } 
      else if (viewState === 'login') {
        const response = await fetch(`http://${window.location.hostname}:8000/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username, password }),
        });

        if (!response.ok) {
          if (response.status === 429) throw new Error('Demasiados intentos. Espera un minuto.');
          const errData = await response.json();
          if (response.status === 403 && errData.detail === 'PASSWORD_RESET_PENDING') {
            setViewState('verify');
            setError('Tienes un reseteo de contraseña pendiente. Revisa tu correo e ingresa el código.');
            setLoading(false);
            return;
          }
          throw new Error('Usuario o contraseña incorrectos.');
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        
        const userRes = await fetch(`http://${window.location.hostname}:8000/users/me`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        const userData = await userRes.json();
        onLogin(username, userData.role.name);
      }
      else if (viewState === 'forgot') {
        const response = await fetch(`http://${window.location.hostname}:8000/request-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error('Error al solicitar reseteo');
        setViewState('verify');
        setSuccess('Si el correo existe, te hemos enviado un código de 6 dígitos.');
      }
      else if (viewState === 'verify') {
        const response = await fetch(`http://${window.location.hostname}:8000/verify-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: resetCode })
        });
        if (!response.ok) throw new Error((await response.json()).detail || 'Código inválido o expirado');
        setViewState('reset');
        setSuccess('Código verificado. Ingresa tu nueva contraseña.');
      }
      else if (viewState === 'reset') {
        const response = await fetch(`http://${window.location.hostname}:8000/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: resetCode, new_password: newPassword })
        });
        if (!response.ok) throw new Error((await response.json()).detail || 'Error al cambiar contraseña');
        setViewState('login');
        setPassword('');
        setSuccess('Contraseña cambiada exitosamente. Inicia sesión.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (view) => {
    setViewState(view);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="auth-container" onMouseMove={handleMouseMove}>
      <div 
        className="mouse-tracking-orb"
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      ></div>
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-gradient vision-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', cursor: 'default' }}>V1si0n</h1>
          <p className="text-muted">Sistema Experto de Control de Calidad IA</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', fontSize: '0.875rem', border: `1px solid rgba(239, 68, 68, 0.2)` }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.875rem', border: `1px solid rgba(16, 185, 129, 0.2)` }}>
              {success}
            </div>
          )}

          {(viewState === 'login' || viewState === 'register') && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Usuario</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  required 
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          )}
          
          {(viewState === 'register' || viewState === 'forgot' || viewState === 'verify' || viewState === 'reset') && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  required 
                  placeholder="tu-correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          )}

          {(viewState === 'verify' || viewState === 'reset') && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Código de 6 dígitos</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  required 
                  maxLength={6}
                  placeholder="123456"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  style={{ paddingLeft: '2.5rem', letterSpacing: '2px', fontFamily: 'monospace' }}
                  disabled={viewState === 'reset'}
                />
              </div>
            </div>
          )}
          
          {(viewState === 'login' || viewState === 'register') && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          )}

          {viewState === 'reset' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nueva Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  required 
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
          )}

          {viewState === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
              <button 
                type="button" 
                onClick={() => switchView('forgot')} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  fontSize: '0.85rem', 
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.2s, text-decoration 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = 'var(--primary-hover)';
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseOut={(e) => {
                  e.target.style.color = 'var(--primary)';
                  e.target.style.textDecoration = 'none';
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Procesando...' : 
              viewState === 'register' ? 'Registrar Cuenta' : 
              viewState === 'forgot' ? 'Enviar Código' : 
              viewState === 'verify' ? 'Verificar Código' : 
              viewState === 'reset' ? 'Cambiar Contraseña' : 
              'Acceder al Sistema'
            }
          </button>

          {(viewState !== 'login' && viewState !== 'register') && (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => switchView('login')} 
              disabled={loading}
            >
              Volver al Login
            </button>
          )}
        </form>
        
        {(viewState === 'login' || viewState === 'register') && (
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '24px', display: 'inline-flex', border: '1px solid var(--surface-border)' }}>
              <button 
                type="button" 
                onClick={() => switchView('login')} 
                style={{ padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', background: viewState === 'login' ? 'var(--primary)' : 'transparent', color: viewState === 'login' ? 'white' : 'var(--text-muted)', fontWeight: viewState === 'login' ? '600' : '400', cursor: 'pointer', transition: 'all 0.3s ease' }}
              >Iniciar Sesión</button>
              <button 
                type="button" 
                onClick={() => switchView('register')} 
                style={{ padding: '0.5rem 1.5rem', borderRadius: '20px', border: 'none', background: viewState === 'register' ? 'var(--primary)' : 'transparent', color: viewState === 'register' ? 'white' : 'var(--text-muted)', fontWeight: viewState === 'register' ? '600' : '400', cursor: 'pointer', transition: 'all 0.3s ease' }}
              >Registro</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
