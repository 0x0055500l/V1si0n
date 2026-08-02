import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ScannerView from './views/ScannerView';
import StatsView from './views/StatsView';
import HistoryView from './views/HistoryView';
import UsersView from './views/UsersView';
import SettingsView from './views/SettingsView';
import ChatWidget from './components/ChatWidget';

export default function DashboardWrapper({ user, role, onLogout }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      <Sidebar user={user} role={role} onLogout={onLogout} />
      
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
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
