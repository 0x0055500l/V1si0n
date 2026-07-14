import { useState } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import './index.css'

function App() {
  const [user, setUser] = useState(null)

  return (
    <>
      {!user ? (
        <Login onLogin={(username) => setUser(username)} />
      ) : (
        <Dashboard user={user} onLogout={() => setUser(null)} />
      )}
    </>
  )
}

export default App
