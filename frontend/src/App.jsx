import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import DashboardWrapper from './DashboardWrapper'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
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
            setRole(data.role);
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
    setRole(null);
  };

  const handleLogin = (username, userRole) => {
    setUser(username);
    setRole(userRole);
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/*" 
          element={user ? <DashboardWrapper user={user} role={role} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
