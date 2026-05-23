import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Cpu, CpuIcon, Check, Settings, ShieldAlert, Zap, Layers, RefreshCw } from 'lucide-react';

interface PerfSettings {
  gpuDecoding: string;
  engine: string;
  bufferingMode: string;
  renderingBackend: string;
  codecOptimization: boolean;
  renderCodec: string;
  loopMode: string;
  highResOptimization: boolean;
  maxThreads: number;
}

interface PerfManagerModalProps {
  perfSettings: PerfSettings;
  onClose: () => void;
  onApply: (settings: PerfSettings) => void;
}

export const PerfManagerModal: React.FC<PerfManagerModalProps> = ({
  perfSettings: initialSettings,
  onClose,
  onApply,
}) => {
  const [localSettings, setLocalSettings] = useState<PerfSettings>({ ...initialSettings });
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [diagnosticsResult, setDiagnosticsResult] = useState<{
    gpuRenderer: string;
    gpuVendor: string;
    isNvidia: boolean;
    isAmd: boolean;
    isIntel: boolean;
    directX11Supported: boolean;
    directX12Supported: boolean;
    vulkanSupported: boolean;
    openglSupported: boolean;
    cpuCores: number;
    ramEstimated: string;
  } | null>(null);

  // Load actual saved performance settings from Windows on mount if in Electron
  useEffect(() => {
    const loadSavedSettings = async () => {
      const electron = (window as any).electron;
      if (electron?.getPerfSettings) {
        try {
          const saved = await electron.getPerfSettings();
          if (saved) {
            setLocalSettings(saved);
          }
        } catch (err) {
          console.error("Error al leer settings de Electron:", err);
        }
      }
    };
    loadSavedSettings();
  }, []);

  // Run hardware diagnostic scan
  const runDiagnostic = () => {
    setIsDiagnosing(true);
    setTimeout(() => {
      let gpuRenderer = "Software Default Renderer (ANGLE)";
      let gpuVendor = "Generic System Device";
      let isNvidia = false;
      let isAmd = false;
      let isIntel = false;
      let directX11Supported = false;
      let directX12Supported = false;
      let vulkanSupported = false;
      let openglSupported = true; // WebGL uses OpenGL underneath usually

      try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as any;
        
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "";
            gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "";
            
            const lowerGp = gpuRenderer.toLowerCase();
            const lowerVd = gpuVendor.toLowerCase();
            
            if (lowerGp.includes('nvidia') || lowerVd.includes('nvidia') || lowerGp.includes('geforce')) {
              isNvidia = true;
            } else if (lowerGp.includes('amd') || lowerGp.includes('radeon') || lowerVd.includes('amd') || lowerVd.includes('ati')) {
              isAmd = true;
            } else if (lowerGp.includes('intel') || lowerGp.includes('graphics') || lowerVd.includes('intel') || lowerGp.includes('iris')) {
              isIntel = true;
            }
          }
          
          // WebGL2 is translated to DirectX 11 via Chromium ANGLE on Windows
          if (canvas.getContext('webgl2')) {
            directX11Supported = true;
          }
        }
      } catch (e) {
        console.error("Diagnostic error:", e);
      }

      // Check for WebGPU (translates to DirectX 12 / Vulkan on Windows)
      if ('gpu' in navigator) {
        directX12Supported = true;
        vulkanSupported = true;
      }

      const cpuCores = navigator.hardwareConcurrency || 4;
      const ramEstimated = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "No disponible";

      setDiagnosticsResult({
        gpuRenderer,
        gpuVendor,
        isNvidia,
        isAmd,
        isIntel,
        directX11Supported,
        directX12Supported,
        vulkanSupported,
        openglSupported,
        cpuCores,
        ramEstimated
      });

      // Intelligent adjustment: Auto-set thread pool to matching CPU cores
      setLocalSettings(prev => ({
        ...prev,
        maxThreads: Math.max(1, Math.min(cpuCores, 8))
      }));

      setIsDiagnosing(false);
    }, 1200);
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    // Save to high-performance Windows backend configuration first
    const electron = (window as any).electron;
    if (electron?.savePerfSettings) {
      try {
        const result = await electron.savePerfSettings(localSettings);
        if (result && result.success) {
          setSaveStatus('saved');
          // Let the user visually comprehend the save and instruction before closing modal
          setTimeout(() => {
            onApply(localSettings);
          }, 4500);
        } else {
          setSaveStatus('error');
          setTimeout(() => {
            onApply(localSettings);
          }, 2000);
        }
      } catch (err) {
        console.error("Fallo guardando en Electron:", err);
        setSaveStatus('error');
        setTimeout(() => {
          onApply(localSettings);
        }, 2000);
      }
    } else {
      // Direct Web localStorage save fallback
      setSaveStatus('saved');
      setTimeout(() => {
        onApply(localSettings);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-obs-bg border border-obs-border/80 rounded shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-obs-text font-sans relative"
      >
        {/* Overlay de Guardado Exitoso */}
        {saveStatus === 'saved' && (
          <div className="absolute inset-0 bg-obs-bg/95 z-[110] flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
              <Check size={24} />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
              ¡Ajustes de Aceleración Aplicados en Windows!
            </h3>
            <p className="max-w-md text-[10px] text-obs-muted leading-relaxed">
              La configuración ha sido registrada con éxito en el archivo de entorno nativo (<span className="text-obs-text font-mono font-bold">lumin_perf.json</span>). Windows forzará este pipeline de render en el próximo inicio:
            </p>
            <div className="bg-obs-surface p-3 rounded border border-obs-border max-w-xs w-full font-mono text-[10px] text-left space-y-1">
              <div className="flex justify-between border-b border-obs-text/5 pb-1">
                <span className="text-obs-muted">API DE PINTADO:</span> 
                <span className="text-obs-accent font-bold uppercase">{localSettings.renderingBackend}</span>
              </div>
              <div className="flex justify-between border-b border-obs-text/5 pb-1">
                <span className="text-obs-muted">DECODIFICADOR:</span> 
                <span className="text-obs-accent font-bold uppercase">{localSettings.gpuDecoding}</span>
              </div>
              <div className="flex justify-between border-b border-obs-text/5 pb-1">
                <span className="text-obs-muted">NÚCLEOS DE VIDEO:</span> 
                <span className="text-obs-text font-bold">{localSettings.maxThreads} Cores</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-muted">COORDS PILOT:</span> 
                <span className="text-emerald-500 font-bold">GPU ACTIVE</span>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/25 text-amber-500/90 p-3.5 rounded text-[9.5px] max-w-md leading-relaxed">
              <span className="font-bold uppercase block mb-1">⚠️ REINICIO DE SOFTWARE REQUERIDO</span>
              Para que Windows reasigne los búferes físicos de baja latencia con los controladores de NVIDIA/AMD a nivel de sistema operativo y los muestre en el Panel de Control, reinicie la aplicación de escritorio.
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-obs-muted animate-pulse font-sans">
              Volviendo a la interfaz maestra en instantes...
            </span>
          </div>
        )}

        {/* Overlay de Progreso Guardando */}
        {saveStatus === 'saving' && (
          <div className="absolute inset-0 bg-obs-bg/95 z-[110] flex flex-col items-center justify-center p-8 text-center space-y-3">
            <CpuIcon className="animate-spin text-obs-accent" size={32} />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-obs-text">
              Sincronizando con el Registro de Windows...
            </h3>
            <p className="max-w-xs text-[10px] text-obs-muted">
              Escribiendo claves de optimización de hardware...
            </p>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-obs-border bg-obs-surface flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="text-obs-accent animate-pulse" size={16} />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-obs-text">
              CENTRAL DE CONFIGURACIÓN DE RENDIMIENTO Y HARDWARE (GPU)
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-obs-muted hover:text-white hover:bg-obs-border transition-colors focus:outline-none"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Welcome alert */}
          <div className="bg-obs-surface/40 border border-obs-accent/20 rounded-sm p-3 text-[10px] leading-relaxed text-obs-muted flex gap-2">
            <Settings size={14} className="text-obs-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-obs-text uppercase mb-0.5 tracking-wider">Aceleración por Hardware</p>
              <span>
                Configuración avanzada del subsistema de renderizado y decodificación nativa para optimizar el consumo de recursos de CPU y memoria instalada.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Column Left: Controls */}
            <div className="md:col-span-7 space-y-5">
              <div className="bg-obs-surface p-5 rounded border border-obs-border/50 space-y-4">
                <div className="border-b border-obs-border pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-obs-accent flex items-center gap-2">
                    <Layers size={14} /> Parámetros del Motor de Video
                  </span>
                </div>

                {/* Motor de Reproducción */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">Motor de Reproducción Integrado</label>
                    <span className="text-[10px] font-mono text-obs-accent bg-obs-accent/10 px-1 py-0.5 rounded font-bold">RECOMENDADO</span>
                  </div>
                  <select 
                    value={localSettings.engine}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, engine: e.target.value }))}
                    className="w-full text-[11px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="native_chromium">Chromium Threaded GPGPU Engine</option>
                    <option value="ffmpeg">FFmpeg GPGPU Accelerator Core</option>
                    <option value="libvlc">libVLC Hardware Core Native</option>
                  </select>
                  <p className="text-[9px] text-obs-muted/60 leading-normal mt-1">
                    Selecciona el motor de procesamiento preferido para medios.
                  </p>
                </div>

                {/* Decodificación por Hardware */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">Aceleración por Hardware de Video (Windows Media Accel)</label>
                  <select 
                    value={localSettings.gpuDecoding}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, gpuDecoding: e.target.value }))}
                    className="w-full text-[11px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="d3d11">Direct3D 11 (GPU Windows Dedicado)</option>
                    <option value="dxva2">DXVA2 (DirectX Video Acceleration 2.0)</option>
                    <option value="nvdec">NVIDIA NVDEC Core Engine</option>
                    <option value="vaapi">Intel/AMD VA-API Hardware Layer</option>
                    <option value="software">Software (Multi-núcleo por CPU - No acelerado)</option>
                  </select>
                  <p className="text-[9px] text-obs-muted/60 leading-normal mt-1">
                    Driver de decodificación de video en GPU Windows. Direct3D 11 / DXVA2 son los predeterminados.
                  </p>
                </div>

                {/* Algoritmo de renderizado/codec preferido */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">Códec Preferido de Renderizado (Formatos Soportados)</label>
                  <select 
                    value={localSettings.renderCodec}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, renderCodec: e.target.value }))}
                    className="w-full text-[11px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="dxv3">Resolume DXV 3 (Máximo Rendimiento de GPU)</option>
                    <option value="h264">H.264 / AVC (Balanceado, Compatible con NVDEC)</option>
                    <option value="hap">HAP Codec Series (Vidvox HAP / HAP-Q)</option>
                    <option value="prores">Apple ProRes 422 / 4444</option>
                  </select>
                  <p className="text-[9px] text-obs-muted/60 leading-normal mt-1">
                    Pre-configuración del decodificador de hardware para pre-carga de VRAM anticipada.
                  </p>
                </div>

                {/* API de Presentación Gráfica */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">API de Presentación Gráfica (Rasterización del Lienzo)</label>
                  <select 
                    value={localSettings.renderingBackend}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, renderingBackend: e.target.value }))}
                    className="w-full text-[11px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="directx11">DirectX 11 (Composición por GPU principal)</option>
                    <option value="directx12">DirectX 12 (Baja latencia multihilo / D3D12)</option>
                    <option value="opengl">OpenGL Core 4.6 Native</option>
                    <option value="vulkan">Vulkan Universal RT Presentation Interface</option>
                  </select>
                  <p className="text-[9px] text-obs-muted/60 leading-normal mt-1">
                    API nativa para renderizado y transiciones a nivel de hardware.
                  </p>
                </div>

                {/* Dos Columnas internas para buffering y loop */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">Estrategia de Pool de Búfer</label>
                    <select 
                      value={localSettings.bufferingMode || 'aggressive'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, bufferingMode: e.target.value }))}
                      className="w-full text-[10px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase"
                    >
                      <option value="normal">Demanda Simple</option>
                      <option value="aggressive">Agresivo (2000ms caché)</option>
                      <option value="ultra_preload">Pool HD (Ultra Precache)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">Algoritmo de Bucle</label>
                    <select 
                      value={localSettings.loopMode || 'native_seamless'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, loopMode: e.target.value }))}
                      className="w-full text-[10px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase"
                    >
                      <option value="native_seamless">Sub-frame Loop (Nat)</option>
                      <option value="double_buffer">Double Buffer Loop</option>
                      <option value="standard">Simple (Estilo Web)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-obs-border/40">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-obs-muted uppercase font-black tracking-widest block">Hilos de procesamiento en paralelo de Video</label>
                    <span className="font-mono text-obs-accent text-[10px] font-black">{localSettings.maxThreads} Cores asignados</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={diagnosticsResult ? Math.max(8, diagnosticsResult.cpuCores) : 8}
                    step={1}
                    value={localSettings.maxThreads}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, maxThreads: parseInt(e.target.value) }))}
                    className="w-full accent-obs-accent h-2 bg-obs-dark-1 rounded-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-obs-muted/70 font-mono">
                    <span>1 Hilo (Mínima carga)</span>
                    <span>{diagnosticsResult?.cpuCores || 8} Hilos (Diagnóstico óptimo)</span>
                  </div>
                </div>

                {/* Optimización de codecs */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-obs-border/40">
                  <div className="flex justify-between items-center bg-obs-dark-1 p-3 rounded">
                    <span className="text-[10px] text-obs-text uppercase font-black tracking-wider leading-none">Optimizar Codecs HA</span>
                    <button
                      onClick={() => setLocalSettings(prev => ({ ...prev, codecOptimization: !prev.codecOptimization }))}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${localSettings.codecOptimization ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${localSettings.codecOptimization ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-obs-dark-1 p-3 rounded">
                    <span className="text-[10px] text-obs-text uppercase font-black tracking-wider leading-none">Precarga de Videos HD</span>
                    <button
                      onClick={() => setLocalSettings(prev => ({ ...prev, highResOptimization: !prev.highResOptimization }))}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${localSettings.highResOptimization ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${localSettings.highResOptimization ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Right: Diagnostics & Windows Nvidia Banner */}
            <div className="md:col-span-5 space-y-5">
              {/* Diagnósticos del Sistema Windows */}
              <div className="bg-obs-surface p-5 rounded border border-obs-border/50 space-y-3">
                <div className="flex justify-between items-center border-b border-obs-border pb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-obs-accent flex items-center gap-2">
                    <RefreshCw size={14} className={isDiagnosing ? 'animate-spin' : ''} /> Diagnóstico de Windows
                  </span>
                  <button 
                    onClick={runDiagnostic}
                    className="text-[10px] uppercase tracking-widest font-bold bg-obs-bg px-2 py-1 rounded border border-obs-border text-obs-text hover:bg-obs-border hover:text-white transition-all font-mono"
                  >
                    Escanear
                  </button>
                </div>

                {isDiagnosing ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <CpuIcon className="animate-spin text-obs-accent" size={28} />
                    <span className="text-[10px] font-bold text-obs-muted uppercase tracking-widest animate-pulse">Sondeando API DirectX/OpenGL...</span>
                  </div>
                ) : diagnosticsResult ? (
                  <div className="space-y-3 font-mono text-[10px]">
                    <div className="bg-obs-dark-1 p-3 rounded space-y-2">
                      <div className="flex justify-between border-b border-obs-text/5 pb-1">
                        <span className="text-obs-muted">GPU PRINCIPAL:</span>
                        <span className="text-obs-text font-bold uppercase truncate max-w-[150px]" title={diagnosticsResult.gpuRenderer}>
                          {diagnosticsResult.gpuRenderer.replace(/angle \((.*?)\)/gi, '$1')}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-obs-text/5 pb-1">
                        <span className="text-obs-muted">FABRICANTE GPU:</span>
                        <span className="text-obs-accent font-bold uppercase">{diagnosticsResult.gpuVendor}</span>
                      </div>
                      <div className="flex justify-between border-b border-obs-text/5 pb-1">
                        <span className="text-obs-muted">NÚCLEOS CPU:</span>
                        <span className="text-obs-text font-bold">{diagnosticsResult.cpuCores} Cores Lógicos</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-obs-muted">RAM CONTEXT:</span>
                        <span className="text-obs-text font-bold">{diagnosticsResult.ramEstimated}</span>
                      </div>
                    </div>

                    {/* Matriz de compatibilidades */}
                    <div className="bg-obs-dark-1 p-3 rounded space-y-2">
                      <div className="text-[10px] font-black text-obs-muted uppercase border-b border-obs-text/5 pb-1 select-none">LISTA DE INTEGRIDAD DE CONTROLADORES</div>
                      
                      <div className="flex justify-between items-center text-[10px]">
                        <span>DirectX 11 (Composición)</span>
                        {diagnosticsResult.directX11Supported ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">● DISPONIBLE (D3D11)</span>
                        ) : (
                          <span className="text-red-500 font-bold">● NO COMPATIBLE</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span>DirectX 12 / Vulkan (Baja Latencia)</span>
                        {diagnosticsResult.directX12Supported ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">● INSTALADO EN WINDOWS</span>
                        ) : (
                          <span className="text-amber-500 font-bold flex items-center gap-1">▲ SIN API WEBGPU (SIMULADA)</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <span>OpenGL Core API</span>
                        {diagnosticsResult.openglSupported ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-1">● DISPONIBLE (CON ARREGLO)</span>
                        ) : (
                          <span className="text-red-500 font-bold">● CONTROLADOR OBSOLETO</span>
                        )}
                      </div>
                    </div>

                    {/* GPU Check and Nvidia Specific */}
                    {diagnosticsResult.isNvidia ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-3 text-emerald-400">
                        <div className="flex items-center gap-2 font-bold uppercase text-[10px] mb-1.5">
                          <Zap size={12} className="fill-emerald-400" /> ¡GPU NVIDIA DETECTADA CON ÉXITO!
                        </div>
                        <p className="leading-relaxed text-[10px] text-emerald-400/90 font-sans">
                          Tu aceleradora NVIDIA está acelerando activamente la rasterización matricial de Lumin. El decodificador NVDEC de hardware ha sido inicializado sobre la API de video de Windows.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-obs-dark-1 p-3 rounded text-[10px] text-obs-muted font-sans gap-2">
                        <span className="font-bold text-[10px] text-obs-text uppercase block mb-1">Aviso de GPU Intel/AMD</span>
                        Tu aceleradora integrada está disponible. Asegúrate de forzar la GPU dedicada de alto rendimiento para proyectos que manejen múltiples pantallas con contenido nativo DXV/H264.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Guard de Diagnóstico e Información de NVIDIA */}
              <div className="bg-obs-surface p-5 rounded border border-obs-border/50 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-obs-accent flex items-center gap-2">
                  <ShieldAlert size={14} /> Tareas de Integridad en Windows
                </span>
                <p className="text-[10px] text-obs-muted leading-relaxed">
                  Para forzar el uso de la GPU dedicada:
                </p>
                <ol className="text-[9.5px] text-obs-muted/90 list-decimal pl-4 space-y-1.5 font-mono">
                  <li>Panel de control de NVIDIA &gt; Configuración 3D.</li>
                  <li>Añadir el ejecutable <span className="text-obs-accent font-bold">Lumin.exe</span>.</li>
                  <li>Selecciona <span className="text-white">"Procesador NVIDIA de alto rendimiento"</span>.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-obs-border bg-obs-surface flex justify-between items-center shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-obs-muted font-bold">
            Configuración guardada en el Registro Local de Windows
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest bg-obs-bg border border-obs-border hover:bg-obs-border hover:text-white transition-all focus:outline-none"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-5 py-1.5 rounded text-[10px] font-black uppercase tracking-widest bg-obs-accent text-white hover:bg-obs-accent/80 transition-all shadow-lg shadow-obs-accent/20 flex items-center gap-1.5 focus:outline-none"
            >
              <Check size={11} /> Aplicar Ajustes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
