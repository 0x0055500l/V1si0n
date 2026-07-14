import { useState, useRef } from 'react';

export default function Dashboard({ user, onLogout }) {
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setResults(null);
    }
  };

  const handleAnalyze = () => {
    if (!image) return;
    setAnalyzing(true);
    
    // Simulating YOLOv8 AI processing
    setTimeout(() => {
      setAnalyzing(false);
      setResults({
        status: "Defectuoso",
        defects: [
          { type: "Missing Hole", confidence: 95 },
          { type: "Short Circuit", confidence: 88 }
        ]
      });
    }, 2500);
  };

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', position: 'relative' }}>
      {/* Navbar */}
      <nav className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-gradient" style={{ margin: 0 }}>V1si0n</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Inspector: <strong style={{ color: 'var(--text-main)' }}>{user}</strong>
          </span>
          <button className="btn" onClick={onLogout} style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-main)' }}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', padding: 0 }}>
        
        {/* Upload Section */}
        <section className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3>Análisis de Placas (PCBs)</h3>
          
          <div 
            onClick={() => fileInputRef.current.click()}
            style={{ 
              border: '2px dashed var(--primary)', 
              borderRadius: '12px', 
              padding: '3rem 2rem', 
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(99, 102, 241, 0.05)',
              transition: 'all var(--transition-fast)'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            <p style={{ color: 'var(--primary)', fontWeight: '500', marginBottom: '0.5rem' }}>
              Haz clic para subir imagen
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Formatos soportados: JPG, PNG</p>
          </div>

          <button 
            className="btn btn-primary" 
            disabled={!image || analyzing} 
            onClick={handleAnalyze}
            style={{ width: '100%' }}
          >
            {analyzing ? 'Analizando con IA...' : 'Ejecutar Análisis de Calidad'}
          </button>
        </section>

        {/* Results Section */}
        <section className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animationDelay: '0.1s' }}>
          <h3>Resultados de Inspección</h3>
          
          {image ? (
            <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
              <img src={image} alt="Preview" style={{ width: '100%', display: 'block' }} />
              
              {/* Fake Bounding Boxes when analyzed */}
              {results && !analyzing && (
                <>
                  <div style={{ position: 'absolute', border: '2px solid var(--danger)', top: '20%', left: '30%', width: '20%', height: '20%', background: 'rgba(239, 68, 68, 0.2)' }}>
                     <span style={{ position: 'absolute', top: '-24px', left: '-2px', background: 'var(--danger)', color: 'white', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' }}>Short Circuit (88%)</span>
                  </div>
                  <div style={{ position: 'absolute', border: '2px solid var(--warning)', top: '60%', left: '70%', width: '15%', height: '15%', background: 'rgba(245, 158, 11, 0.2)' }}>
                     <span style={{ position: 'absolute', top: '-24px', left: '-2px', background: 'var(--warning)', color: 'white', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold' }}>Missing Hole (95%)</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
              Esperando imagen...
            </div>
          )}

          {results && !analyzing && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
                <strong style={{ color: 'var(--danger)' }}>Pieza Defectuosa</strong>
                <span>2 defectos encontrados</span>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
