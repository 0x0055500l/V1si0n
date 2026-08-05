import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, MessageSquare, Video, StopCircle } from 'lucide-react';
import { useLang, t } from '../i18n';

export default function ScannerView({ user }) {
  const lang = useLang();
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // States for Camera & Live Mode
  const [useCamera, setUseCamera] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const wsRef = useRef(null);
  const liveIntervalRef = useRef(null);

  const navigate = useNavigate();

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
          fetch(`http://${window.location.hostname}:8000/pcb-models`, { headers }),
          fetch(`http://${window.location.hostname}:8000/production-lines`, { headers })
        ]);

        if (modelsRes.ok) setPcbModels(await modelsRes.json());
        if (linesRes.ok) setProductionLines(await linesRes.json());
      } catch (err) {
        console.error(err);
      }
    };
    fetchCatalogs();
    
    // Cleanup on unmount
    return () => {
      stopCameraAndLive();
    };
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

  const startCamera = async (live = false) => {
    setUseCamera(true);
    setIsLiveMode(live);
    setImage(null);
    setImageFile(null);
    setResults(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        if (live) {
          // Initialize WebSocket
          wsRef.current = new WebSocket(`ws://${window.location.hostname}:8000/ws/live-scan`);
          
          wsRef.current.onopen = () => {
            console.log('Live Scan WebSocket connected');
            // Start capturing frames at 10 FPS (every 100ms)
            liveIntervalRef.current = setInterval(captureLiveFrame, 100);
          };
          
          wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
              console.error(data.error);
              return;
            }
            setResults(data);
          };
          
          wsRef.current.onclose = () => {
            console.log('Live Scan WebSocket disconnected');
          };
        }
      }
    } catch (err) {
      console.error(err);
      alert("No se pudo acceder a la cámara.");
      setUseCamera(false);
      setIsLiveMode(false);
    }
  };

  const captureLiveFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6); // 60% quality for performance
    wsRef.current.send(dataUrl);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
      setImageFile(file);
      setImage(URL.createObjectURL(file));
      setResults(null);
      
      stopCameraAndLive();
    }, 'image/jpeg');
  };

  const stopCameraAndLive = () => {
    // Clear live interval
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    // Stop camera stream
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    
    setUseCamera(false);
    setIsLiveMode(false);
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
      const res = await fetch(`http://${window.location.hostname}:8000/predict`, {
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
        <h3>{t(lang, 'scanner_title')}</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'lines')}</label>
            <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
              <option value="">{t(lang, 'select_line')}</option>
              {productionLines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t(lang, 'pcb_models')}</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-bg)', color: 'white', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
              <option value="">{t(lang, 'select_model')}</option>
              {pcbModels.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!useCamera ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => fileInputRef.current.click()} className="btn btn-secondary" style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={18} /> {t(lang, 'upload_img')}
              </button>
              <button onClick={() => startCamera(false)} className="btn btn-secondary" style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={18} /> {t(lang, 'use_camera')}
              </button>
            </div>
            
            <button onClick={() => startCamera(true)} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: 'var(--success)' }}>
              <Video size={18} /> {t(lang, 'live_scan')}
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
        ) : (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
              <video ref={videoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
              
              {/* Overlay para Bounding Boxes en Vivo */}
              {isLiveMode && results && results.defects && results.defects.map((defect, idx) => (
                <div key={idx} style={{ position: 'absolute', border: '2px solid var(--danger)', top: `${defect.bbox[1] * 100}%`, left: `${defect.bbox[0] * 100}%`, width: `${(defect.bbox[2]-defect.bbox[0]) * 100}%`, height: `${(defect.bbox[3]-defect.bbox[1]) * 100}%`, background: 'rgba(239, 68, 68, 0.2)', pointerEvents: 'none' }}>
                   <span style={{ position: 'absolute', top: '-24px', left: '-2px', background: 'var(--danger)', color: 'white', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                     {defect.type} ({Math.round(defect.confidence * 100)}%)
                   </span>
                </div>
              ))}
            </div>
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {!isLiveMode ? (
                <button onClick={captureImage} className="btn btn-primary" style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} /> {t(lang, 'capture')}
                </button>
              ) : (
                <button disabled className="btn btn-primary" style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-bg)' }}>
                  <Video size={18} /> {t(lang, 'scanning_live')}
                </button>
              )}
              
              <button onClick={stopCameraAndLive} className="btn btn-secondary" style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                <StopCircle size={18} /> {isLiveMode ? t(lang, 'stop_live') : t(lang, 'cancel')}
              </button>
            </div>
          </div>
        )}

        {!isLiveMode && (
          <button 
            className="btn btn-primary" 
            disabled={!image || analyzing || !selectedModel || !selectedLine} 
            onClick={handleAnalyze}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {analyzing ? t(lang, 'analyzing') : t(lang, 'analyze_btn')}
          </button>
        )}
      </section>

      {/* Results Section */}
      <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
        <h3>{isLiveMode ? t(lang, 'live_results') : t(lang, 'results_title')}</h3>
        
        {image && !isLiveMode ? (
          <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
            <img src={image} alt="Preview" style={{ width: '100%', display: 'block' }} />
            
            {results && !analyzing && results.defects.map((defect, idx) => (
              <div key={idx} style={{ position: 'absolute', border: '2px solid var(--danger)', top: `${defect.bbox[1] * 100}%`, left: `${defect.bbox[0] * 100}%`, width: `${(defect.bbox[2]-defect.bbox[0]) * 100}%`, height: `${(defect.bbox[3]-defect.bbox[1]) * 100}%`, background: 'rgba(239, 68, 68, 0.2)', pointerEvents: 'none' }}>
                 <span style={{ position: 'absolute', top: '-24px', left: '-2px', background: 'var(--danger)', color: 'white', padding: '2px 6px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                   {defect.type} ({Math.round(defect.confidence * 100)}%)
                 </span>
              </div>
            ))}
          </div>
        ) : (
          !isLiveMode && (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
              {t(lang, 'waiting_img')}
            </div>
          )
        )}

        {results && !analyzing && (
          <div style={{ marginTop: '1rem' }}>
            {results.status === 'Defectuoso' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', borderLeft: '4px solid var(--danger)' }}>
                  <strong style={{ color: 'var(--danger)' }}>{t(lang, 'defective_part')}</strong>
                  <span>{results.defects.length} {t(lang, 'defects_found')}</span>
                </div>
                <div style={{ padding: '1rem', background: 'var(--surface-bg)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{t(lang, 'defect_details')}</h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--text-muted)' }}>
                    {results.defects.map((d, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>
                        <strong>{d.type}</strong> - {Math.round(d.confidence * 100)}% {t(lang, 'confidence')}
                      </li>
                    ))}
                  </ul>
                  
                  {!isLiveMode && (
                    <button 
                      onClick={() => {
                        const defectsList = results.defects.map(d => d.type).join(', ');
                        navigate('/chat', { state: { initialPrompt: `He escaneado una placa y detecté: ${defectsList}. ¿Me puedes explicar qué significa esto y cómo puedo solucionarlo en la línea de producción?` } });
                      }}
                      className="btn" 
                      style={{ marginTop: '1rem', width: '100%', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                    >
                      <MessageSquare size={18} /> {t(lang, 'ask_vision')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <strong style={{ color: '#10b981' }}>{t(lang, 'ok_part')}</strong>
                <span>{t(lang, 'no_defects')}</span>
              </div>
            )}
          </div>
        )}
        
        {isLiveMode && !results && (
          <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {t(lang, 'scanning_live')}
          </div>
        )}
      </section>
    </div>
  );
}
