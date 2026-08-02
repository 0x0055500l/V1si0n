import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Inspecciones - V1si0n", 14, 15);
    
    const tableColumn = ["ID", "Fecha", "Archivo", "Estado", "Defectos"];
    const tableRows = [];

    logs.forEach(log => {
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

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save("Reporte_V1si0n.pdf");
  };

  const exportExcel = () => {
    const exportData = logs.map(log => ({
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

  return (
    <div className="animate-fade-in glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Bitácora de Inspecciones</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
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
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Fecha</th>
                <th style={{ padding: '1rem' }}>Archivo</th>
                <th style={{ padding: '1rem' }}>Estado</th>
                <th style={{ padding: '1rem' }}>Defectos</th>
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
                    {log.defects && log.defects.length > 0 
                      ? log.defects.map(d => d.defect?.name || "Defecto").join(", ") 
                      : "Ninguno"}
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
