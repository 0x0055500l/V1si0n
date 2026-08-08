import { Info, Users, Code, Server, Database } from 'lucide-react';
import { useLang, t } from '../i18n';

export default function AboutView() {
  const lang = useLang();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      
      <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))' }}>
        <h1 className="text-gradient vision-text" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>V1si0n</h1>
        <p className="text-muted" style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Sistema Experto de Control de Calidad IA para Placas de Circuito Impreso (PCBs).
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <Users size={24} /> {lang === 'en' ? 'Project Members' : 'Integrantes del Proyecto'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Cinthia Paola Paz Alvarado</h3>
            <span style={{ color: 'var(--text-muted)' }}>Cuenta: 202310010826</span>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Sherley Iveth Ochoa López</h3>
            <span style={{ color: 'var(--text-muted)' }}>Cuenta: 202210040236</span>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Samantha Margarita Sabillón Mejia</h3>
            <span style={{ color: 'var(--text-muted)' }}>Cuenta: 201210010381</span>
          </div>

          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Josseth Alejandro Bautista Fuentes</h3>
            <span style={{ color: 'var(--text-muted)' }}>Cuenta: 201810020200</span>
          </div>

        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
          <Info size={24} /> {lang === 'en' ? 'Technology Stack' : 'Tecnologías Utilizadas'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '12px' }}>
              <Code size={24} color="var(--primary)" />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>Frontend</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>React, Vite, Lucide</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '12px' }}>
              <Server size={24} color="#10b981" />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>Backend</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>FastAPI, Python</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '12px' }}>
              <Database size={24} color="#f59e0b" />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>Database</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>SQLite, SQLAlchemy</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '12px' }}>
              <Info size={24} color="#ec4899" />
            </div>
            <div>
              <h4 style={{ margin: 0 }}>AI Models</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>YOLOv8, Ollama LLM</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
