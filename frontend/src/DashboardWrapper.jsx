import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ScannerView from './views/ScannerView';
import StatsView from './views/StatsView';
import HistoryView from './views/HistoryView';
import UsersView from './views/UsersView';
import SettingsView from './views/SettingsView';
import ChatWidget from './components/ChatWidget';
import AboutView from './views/AboutView';
import ActivityLogView from './views/ActivityLogView';

import { Menu, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLang } from './i18n';

function RealTimeClock() {
  const lang = useLang();
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', background: 'var(--surface-bg)', padding: '0.5rem 1rem', borderRadius: '8px', width: 'fit-content', border: '1px solid var(--surface-border)' }}>
      <Clock size={16} />
      <span>{time.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {time.toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES')}</span>
    </div>
  );
}

export default function DashboardWrapper({ user, role, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const logActivity = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const moduleName = location.pathname === '/' ? '/dashboard' : location.pathname;
      try {
        await fetch(`http://${window.location.hostname}:8000/activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ module: moduleName })
        });
      } catch (err) {
        console.error('Error logging activity', err);
      }
    };
    logActivity();
  }, [location.pathname]);

  return (
    <div className="dashboard-layout">
      {/* Mobile Toggle Button */}
      <button className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        <Menu size={24} />
      </button>

      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <div className={`sidebar-container ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar user={user} role={role} onLogout={onLogout} />
      </div>
      
      <main className="main-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto', width: '100%' }}>
        <RealTimeClock />
        <Routes>
          <Route path="/" element={<StatsView />} />
          <Route path="/scanner" element={<ScannerView user={user} />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/chat" element={<ChatWidget />} />
          {role === 'admin' && (
            <>
              <Route path="/users" element={<UsersView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/activity" element={<ActivityLogView />} />
            </>
          )}
          <Route path="/about" element={<AboutView />} />
        </Routes>
      </main>
    </div>
  );
}
