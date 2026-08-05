import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Settings2, CheckCircle2, XCircle } from 'lucide-react';
import { t, useLang } from '../i18n';

export default function StatsView() {
  const lang = useLang();
  const [stats, setStats] = useState({ 
    total: 0, defectuoso: 0, ok: 0, 
    distribution: [], line_performance: [], recent_scans: [] 
  });
  const [config, setConfig] = useState({
    showCards: true,
    showGeneralPie: true,
    showDetailedPie: true,
    showLineBar: true,
    showRecent: true
  });
  const [showConfigMenu, setShowConfigMenu] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('access_token');
        // Fetch User Config
        const userRes = await fetch(`http://${window.location.hostname}:8000/users/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.dashboard_config) {
            try {
              const parsed = JSON.parse(userData.dashboard_config);
              if (Object.keys(parsed).length > 0) setConfig(parsed);
            } catch(e) {}
          }
        }
        // Fetch Stats
        const statsRes = await fetch(`http://${window.location.hostname}:8000/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const saveConfig = async (newConfig) => {
    setConfig(newConfig);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://${window.location.hostname}:8000/users/me/dashboard_config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dashboard_config: JSON.stringify(newConfig) })
      });
    } catch(err) {
      console.error(err);
    }
  };

  const toggleWidget = (key) => {
    const updated = { ...config, [key]: !config[key] };
    saveConfig(updated);
  };

  const pieGeneral = [
    { name: t(lang, 'defective'), value: stats.defectuoso },
    { name: t(lang, 'ok'), value: stats.ok },
  ];
  const COLORS_GEN = ['#ef4444', '#10b981'];
  const COLORS_DET = ['#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e'];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{t(lang, 'stats_title')}</h2>
        <button className="btn btn-secondary" onClick={() => setShowConfigMenu(!showConfigMenu)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings2 size={18} /> {t(lang, 'customize_view')}
        </button>
      </div>

      {showConfigMenu && (
        <div className="glass-panel" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div className="toggle-switch">
              <input type="checkbox" checked={config.showCards} onChange={() => toggleWidget('showCards')} />
              <span className="toggle-slider"></span>
            </div>
            {t(lang, 'summary_cards')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div className="toggle-switch">
              <input type="checkbox" checked={config.showGeneralPie} onChange={() => toggleWidget('showGeneralPie')} />
              <span className="toggle-slider"></span>
            </div>
            {t(lang, 'general_proportion')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div className="toggle-switch">
              <input type="checkbox" checked={config.showDetailedPie} onChange={() => toggleWidget('showDetailedPie')} />
              <span className="toggle-slider"></span>
            </div>
            {t(lang, 'defects_by_type')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div className="toggle-switch">
              <input type="checkbox" checked={config.showLineBar} onChange={() => toggleWidget('showLineBar')} />
              <span className="toggle-slider"></span>
            </div>
            {t(lang, 'line_performance')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div className="toggle-switch">
              <input type="checkbox" checked={config.showRecent} onChange={() => toggleWidget('showRecent')} />
              <span className="toggle-slider"></span>
            </div>
            {t(lang, 'recent_scans')}
          </label>
        </div>
      )}

      {config.showCards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{t(lang, 'total_scans')}</h3>
            <p className="text-gradient" style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.total}</p>
          </div>
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--danger)' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{t(lang, 'defective')}</h3>
            <p style={{ color: 'var(--danger)', fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.defectuoso}</p>
          </div>
          <div className="glass-panel" style={{ borderLeft: '4px solid #10b981' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{t(lang, 'ok')}</h3>
            <p style={{ color: '#10b981', fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.ok}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {config.showGeneralPie && (
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3>{t(lang, 'general_proportion')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieGeneral} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value" label>
                  {pieGeneral.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_GEN[index % COLORS_GEN.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid var(--surface-border)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {config.showDetailedPie && (
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3>{t(lang, 'defects_by_type')}</h3>
            {stats.distribution.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>{t(lang, 'no_defects_yet')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.distribution} cx="50%" cy="50%" outerRadius={120} dataKey="value" label>
                    {stats.distribution.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_DET[index % COLORS_DET.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid var(--surface-border)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {config.showLineBar && (
          <div className="glass-panel" style={{ height: '400px', display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            <h3>{t(lang, 'line_performance')}</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.line_performance} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid var(--surface-border)' }} />
                <Legend />
                <Bar dataKey="ok" stackId="a" fill="#10b981" name={t(lang, 'ok')} />
                <Bar dataKey="defectuoso" stackId="a" fill="#ef4444" name={t(lang, 'defective')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {config.showRecent && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
            <h3>{t(lang, 'recent_scans')}</h3>
            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem' }}>ID</th>
                    <th style={{ padding: '1rem' }}>{t(lang, 'date')}</th>
                    <th style={{ padding: '1rem' }}>{t(lang, 'file')}</th>
                    <th style={{ padding: '1rem' }}>{t(lang, 'status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_scans.map(scan => (
                    <tr key={scan.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>#{scan.id}</td>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>{new Date(scan.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '1rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scan.filename}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          background: scan.status === 'OK' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: scan.status === 'OK' ? '#10b981' : '#ef4444'
                        }}>
                          {scan.status === 'OK' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {scan.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {stats.recent_scans.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No hay escaneos recientes</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
