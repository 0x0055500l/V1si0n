import { useState, useEffect } from 'react';

export default function HistoryView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://127.0.0.1:8000/scans', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="animate-fade-in glass-panel" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Bitácora de Inspecciones</h2>
      
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando bitácora...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Fecha</th>
                <th style={{ padding: '1rem' }}>Archivo</th>
                <th style={{ padding: '1rem' }}>Estado</th>
                <th style={{ padding: '1rem' }}>Detalles (JSON)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>#{log.id}</td>
                  <td style={{ padding: '1rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>{log.filename}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      background: log.status === 'Defectuoso' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: log.status === 'Defectuoso' ? 'var(--danger)' : '#10b981'
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.defects_json}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay escaneos registrados aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
