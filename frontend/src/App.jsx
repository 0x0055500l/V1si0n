import { useState, useEffect } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await fetch('http://127.0.0.1:8000/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.username);
          } else {
            localStorage.removeItem('access_token');
          }
        } catch (error) {
          console.error("Error verifying token", error);
        }
      }
      setLoading(false);
    };
    checkToken();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Cargando...</div>;
  }

  return (
    <>
      {!user ? (
        <Login onLogin={(username) => setUser(username)} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  )
}

export default App
