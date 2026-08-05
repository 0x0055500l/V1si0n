import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isRegistering) {
        const response = await fetch(`http://${window.location.hostname}:8000/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, role_id: 2 }) // 2 = inspector default
        });
        
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Error al registrar usuario');
        }
        
        setIsRegistering(false);
        setError('Registro exitoso. Ahora puedes iniciar sesión.');
        setLoading(false);
        return;
      }

      const response = await fetch(`http://${window.location.hostname}:8000/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username,
          password: password,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Demasiados intentos. Por favor, espera un minuto e inténtalo de nuevo.');
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" onMouseMove={handleMouseMove}>
      <div 
        className="mouse-tracking-orb"
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
        }}
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
            <div style={{ padding: '0.75rem', backgroundColor: error.includes('exitoso') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: error.includes('exitoso') ? '#10b981' : '#ff3b30', borderRadius: '8px', fontSize: '0.875rem', border: `1px solid ${error.includes('exitoso') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 59, 48, 0.2)'}` }}>
              {error}
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Usuario Inspector
            </label>
            <input 
              type="text" 
              required 
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          {isRegistering && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Correo Electrónico
              </label>
              <input 
                type="email" 
                required 
                placeholder="tu-correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Contraseña
            </label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? (isRegistering ? 'Registrando...' : 'Verificando credenciales...') : (isRegistering ? 'Registrar Cuenta' : 'Acceder al Sistema')}
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ 
            background: 'rgba(0,0,0,0.2)', 
            padding: '0.25rem', 
            borderRadius: '24px', 
            display: 'inline-flex',
            border: '1px solid var(--surface-border)'
          }}>
            <button 
              type="button" 
              onClick={() => { setIsRegistering(false); setError(null); }} 
              style={{ 
                padding: '0.5rem 1.5rem', 
                borderRadius: '20px', 
                border: 'none', 
                background: !isRegistering ? 'var(--primary)' : 'transparent', 
                color: !isRegistering ? 'white' : 'var(--text-muted)',
                fontWeight: !isRegistering ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Iniciar Sesión
            </button>
            <button 
              type="button" 
              onClick={() => { setIsRegistering(true); setError(null); }} 
              style={{ 
                padding: '0.5rem 1.5rem', 
                borderRadius: '20px', 
                border: 'none', 
                background: isRegistering ? 'var(--primary)' : 'transparent', 
                color: isRegistering ? 'white' : 'var(--text-muted)',
                fontWeight: isRegistering ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
