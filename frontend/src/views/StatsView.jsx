import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function StatsView() {
  const [stats, setStats] = useState({ total: 0, defectuoso: 0, ok: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch('http://127.0.0.1:8000/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const pieData = [
    { name: 'Defectuosos', value: stats.defectuoso },
    { name: 'Aprobados (OK)', value: stats.ok },
  ];
  const COLORS = ['#ef4444', '#10b981'];

  const barData = [
    { name: 'Total Escaneos', amount: stats.total },
    { name: 'Defectuosos', amount: stats.defectuoso },
    { name: 'Aprobados', amount: stats.ok },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h2>Dashboard Estadístico</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Total Escaneos</h3>
          <p className="text-gradient" style={{ fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.total}</p>
        </div>
        <div className="glass-panel">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Placas Defectuosas</h3>
          <p style={{ color: 'var(--danger)', fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.defectuoso}</p>
        </div>
        <div className="glass-panel">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Placas Aprobadas</h3>
          <p style={{ color: 'var(--success, #10b981)', fontSize: '3rem', fontWeight: 'bold', margin: '0.5rem 0' }}>{stats.ok}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="glass-panel" style={{ height: '400px' }}>
          <h3>Proporción de Defectos</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid var(--surface-border)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={{ height: '400px' }}>
          <h3>Volumen de Inspecciones</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid var(--surface-border)' }} />
              <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
