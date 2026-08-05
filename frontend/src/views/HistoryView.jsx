import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { t, useLang } from '../i18n';

export default function HistoryView() {
  const lang = useLang();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://${window.location.hostname}:8000/scans`, {
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
    doc.text("Reporte de Inspecciones - V1si0n", 14, 15);
    
    const tableColumn = ["ID", "Fecha", "Archivo", "Estado", "Defectos"];
    const tableRows = [];

    filteredLogs.forEach(log => {
      const defectList = log.defects ? log.defects.map(d => d.defect?.name || "Defecto").join(", ") : "Ninguno";
      const logData = [
        log.id,
        new Date(log.timestamp).toLocaleString(),
        log.filename,
        log.status,
        defectList
      ];
      tableRows.push(logData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 40 },
        2: { cellWidth: 60 },
        3: { cellWidth: 30 },
        4: { cellWidth: 45 }
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255]
      }
    });
    
    doc.save("Reporte_V1si0n.pdf");
  };

  const exportExcel = () => {
    const exportData = filteredLogs.map(log => ({
      ID: log.id,
      Fecha: new Date(log.timestamp).toLocaleString(),
      Archivo: log.filename,
      Estado: log.status,
      Defectos: log.defects ? log.defects.map(d => d.defect?.name || "Defecto").join(", ") : "Ninguno"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inspecciones");
    XLSX.writeFile(workbook, "Reporte_V1si0n.xlsx");
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.filename.toLowerCase().includes(searchTerm.toLowerCase()) || log.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'Todos' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="animate-fade-in glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>{t(lang, 'history_title')}</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder={t(lang, 'search_placeholder')}
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ padding: '0.5rem', background: 'var(--surface-bg)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)} 
            style={{ padding: '0.5rem', background: 'var(--surface-bg)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
          >
            <option value="Todos">{t(lang, 'all')}</option>
            <option value="Defectuoso">{t(lang, 'defective')}</option>
            <option value="OK">{t(lang, 'ok')}</option>
          </select>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ padding: '0.5rem', background: 'var(--surface-bg)', color: 'var(--text-main)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
            <option value={10}>10 {t(lang, 'per_page')}</option>
            <option value={20}>20 {t(lang, 'per_page')}</option>
            <option value={50}>50 {t(lang, 'per_page')}</option>
          </select>
          <button onClick={exportPDF} className="btn" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Download size={18} /> PDF
          </button>
          <button onClick={exportExcel} className="btn" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Download size={18} /> Excel
          </button>
        </div>
      </div>
      
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando bitácora...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => requestSort('id')}>ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => requestSort('timestamp')}>{t(lang, 'date')} {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => requestSort('filename')}>{t(lang, 'file')} {sortConfig.key === 'filename' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem', cursor: 'pointer' }} onClick={() => requestSort('status')}>{t(lang, 'status')} {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '1rem' }}>{t(lang, 'defects')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
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
                    {log.defects && log.defects.length > 0 
                      ? log.defects.map(d => d.defect?.name || "Defecto").join(", ") 
                      : "Ninguno"}
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t(lang, 'no_logs')}</td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '1rem 0 0 0', borderTop: '1px solid var(--surface-border)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Página {currentPage} de {totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>{t(lang, 'previous')}</button>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>{t(lang, 'next')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
