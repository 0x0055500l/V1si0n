import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/token', {
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
      onLogin(username);
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
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', borderRadius: '8px', fontSize: '0.875rem', border: '1px solid rgba(255, 59, 48, 0.2)' }}>
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
            {loading ? 'Verificando credenciales...' : 'Acceder al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
