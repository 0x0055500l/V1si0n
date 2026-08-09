import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download, Activity } from 'lucide-react';
import { t, useLang } from '../i18n';

export default function ActivityLogView() {
  const lang = useLang();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://${window.location.hostname}:8000/activity-logs`, {
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

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text(t(lang, 'activity_log_title') || 'Registro de Actividad', 14, 15);
    
    const tableColumn = ["ID", "Usuario", "Rol", "Módulo", "IP", "Dispositivo", "Fecha"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const logData = [
        log.id,
        log.user?.username || 'N/A',
        log.user?.role?.name || 'N/A',
        log.module,
        log.ip_address,
        log.user_agent.substring(0, 30) + (log.user_agent.length > 30 ? '...' : ''),
        new Date(log.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save(`activity_log_${new Date().getTime()}.pdf`);
  };

  const exportExcel = () => {
    const wsData = filteredLogs.map(log => ({
      ID: log.id,
      Usuario: log.user?.username || 'N/A',
      Rol: log.user?.role?.name || 'N/A',
      Módulo: log.module,
      IP: log.ip_address,
      Dispositivo: log.user_agent,
      Fecha: new Date(log.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }));
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Activity");
    XLSX.writeFile(wb, `activity_log_${new Date().getTime()}.xlsx`);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedLogs = [...logs].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'user') {
      aValue = a.user?.username || '';
      bValue = b.user?.username || '';
    } else if (sortConfig.key === 'role') {
      aValue = a.user?.role?.name || '';
      bValue = b.user?.role?.name || '';
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredLogs = sortedLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const userMatch = log.user?.username?.toLowerCase().includes(searchLower) || false;
    const moduleMatch = log.module.toLowerCase().includes(searchLower);
    const ipMatch = log.ip_address.toLowerCase().includes(searchLower);
    return userMatch || moduleMatch || ipMatch;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Activity size={24} />
        {t(lang, 'activity_log_title') || 'Registro de Actividad'}
      </h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder={t(lang, 'search') || 'Buscar...'} 
          className="input-field"
          style={{ flex: 1, minWidth: '200px' }}
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
        <select 
          className="input-field" 
          style={{ width: 'auto' }}
          value={pageSize}
          onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
        >
          <option value={10}>10 {t(lang, 'per_page') || 'por página'}</option>
          <option value={25}>25 {t(lang, 'per_page') || 'por página'}</option>
          <option value={50}>50 {t(lang, 'per_page') || 'por página'}</option>
        </select>
        
        <button className="btn btn-secondary" onClick={exportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={16} /> PDF
        </button>
        <button className="btn btn-secondary" onClick={exportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={16} /> Excel
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>{t(lang, 'loading') || 'Cargando...'}</p>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--surface-bg)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('id')}>ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('user')}>Usuario {sortConfig.key === 'user' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('role')}>Rol {sortConfig.key === 'role' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('module')}>Módulo {sortConfig.key === 'module' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem' }}>IP</th>
                <th style={{ padding: '1rem' }}>Dispositivo</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => handleSort('timestamp')}>Fecha {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem' }}>{log.id}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{log.user?.username || 'N/A'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem',
                      background: log.user?.role?.name === 'admin' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: log.user?.role?.name === 'admin' ? '#3b82f6' : '#10b981'
                    }}>
                      {log.user?.role?.name || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{log.module}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{log.ip_address}</td>
                  <td style={{ padding: '1rem', fontSize: '0.8rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.user_agent}>{log.user_agent}</td>
                  <td style={{ padding: '1rem' }}>{new Date(log.timestamp).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay registros de actividad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <button 
            className="btn btn-secondary" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button 
            className="btn btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
