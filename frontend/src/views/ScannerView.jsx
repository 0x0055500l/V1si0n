import { useState, useRef, useEffect } from 'react';

export default function ScannerView({ user }) {
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const [pcbModels, setPcbModels] = useState([]);
  const [productionLines, setProductionLines] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedLine, setSelectedLine] = useState('');

  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [modelsRes, linesRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/pcb-models', { headers }),
          fetch('http://127.0.0.1:8000/production-lines', { headers })
        ]);

        if (modelsRes.ok) setPcbModels(await modelsRes.json());
        if (linesRes.ok) setProductionLines(await linesRes.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchCatalogs();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImage(url);
      setResults(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !selectedModel || !selectedLine) {
      alert("Por favor selecciona un Modelo y Línea de Producción");
      return;
    }
    setAnalyzing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('pcb_model_id', selectedModel);
      formData.append('production_line_id', selectedLine);

      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setResults({
          status: data.defects.length > 0 ? "Defectuoso" : "OK",
          defects: data.defects
        });
      } else {
        console.error("Error al analizar");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      {/* Upload Section */}
      <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
        <h3>Análisis de Placas (PCBs)</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Línea de Producción</label>
            <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
              <option value="">-- Seleccionar Línea --</option>
              {productionLines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Modelo PCB</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
              <option value="">-- Seleccionar Modelo --</option>
              {pcbModels.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div 
          onClick={() => fileInputRef.current.click()}
          style={{ 
            border: '2px dashed var(--primary)', 
            borderRadius: '12px', 
            padding: '3rem 2rem', 
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(99, 102, 241, 0.05)',
            transition: 'all var(--transition-fast)',
            marginTop: '1rem'
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
          disabled={!image || analyzing || !selectedModel || !selectedLine} 
          onClick={handleAnalyze}
          style={{ width: '100%' }}
        >
          {analyzing ? 'Analizando con IA...' : 'Ejecutar Análisis de Calidad'}
        </button>
      </section>

      {/* Results Section */}
      <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
        <h3>Resultados de Inspección</h3>
        
        {image ? (
          <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
            <img src={image} alt="Preview" style={{ width: '100%', display: 'block' }} />
            
            {results && !analyzing && results.defects.map((defect, idx) => (
              <div key={idx} style={{ position: 'absolute', border: '2px solid var(--danger)', top: `${defect.bbox[1]}%`, left: `${defect.bbox[0]}%`, width: `${defect.bbox[2]-defect.bbox[0]}%`, height: `${defect.bbox[3]-defect.bbox[1]}%`, background: 'rgba(239, 68, 68, 0.2)' }}>
                 <span style={{ position: 'absolute', top: '-24px', left: '-2px', background: 'var(--danger)', color: 'white', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                   {defect.type} ({Math.round(defect.confidence * 100)}%)
                 </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
            Esperando imagen...
          </div>
        )}

        {results && !analyzing && (
          <div style={{ marginTop: '1rem' }}>
            {results.status === 'Defectuoso' ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
                <strong style={{ color: 'var(--danger)' }}>Pieza Defectuosa</strong>
                <span>{results.defects.length} defectos encontrados</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <strong style={{ color: '#10b981' }}>Pieza OK</strong>
                <span>Sin defectos</span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
