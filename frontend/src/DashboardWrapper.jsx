import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ScannerView from './views/ScannerView';
import StatsView from './views/StatsView';
import HistoryView from './views/HistoryView';
import UsersView from './views/UsersView';
import SettingsView from './views/SettingsView';
import ChatWidget from './components/ChatWidget';

import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function DashboardWrapper({ user, role, onLogout }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      {/* Mobile Toggle Button */}
      <button className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(true)}>
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
        <Routes>
          <Route path="/" element={<StatsView />} />
          <Route path="/scanner" element={<ScannerView user={user} />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/chat" element={<ChatWidget />} />
          {role === 'admin' && (
            <>
              <Route path="/users" element={<UsersView />} />
              <Route path="/settings" element={<SettingsView />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}
