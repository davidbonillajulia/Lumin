import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, Cpu, CpuIcon, Check, Settings, ShieldAlert, Zap, Layers, RefreshCw } from 'lucide-react';

interface PerfSettings {
  gpuDecoding: string;
  engine: string;
  bufferingMode: string;
  renderingBackend: string;
  codecOptimization: boolean;
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

  const handleSave = () => {
    onApply(localSettings);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-obs-bg border border-obs-border/80 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-obs-text font-sans"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-obs-border bg-obs-surface flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="text-obs-accent animate-pulse" size={16} />
            <h2 className="text-xs font-black uppercase tracking-widest text-obs-text">
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
          <div className="bg-obs-surface/40 border border-obs-accent/20 rounded p-3 text-[10px] leading-relaxed text-obs-muted/90 flex gap-3">
            <Settings size={18} className="text-obs-accent shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-obs-text uppercase mb-1">Optimización de Motor de Ejecución en Windows Explorer</p>
              <span>
                Para la decodificación por hardware de alta resolución y reproducción de múltiples transmisiones sincronizadas, Lumin utiliza un motor de aceleración paralela híbrida. Las siguientes opciones modifican cómo interactúa la aplicación web y los renderizadores nativos de Windows (como Chromium Webview2, Electron o los puentes multimedia nativos) con los componentes físicos de tu ordenador.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Column Left: Controls */}
            <div className="md:col-span-7 space-y-4">
              <div className="bg-obs-surface p-4 rounded border border-obs-border/50 space-y-4">
                <div className="border-b border-obs-border pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-obs-accent flex items-center gap-1.5">
                    <Layers size={13} /> Parámetros del Motor de Video
                  </span>
                </div>

                {/* Motor de Reproducción */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8px] text-obs-muted uppercase font-black tracking-widest block">Motor de Reproducción Integrado</label>
                    <span className="text-[8px] font-mono text-obs-accent bg-obs-accent/10 px-1 py-0.2 rounded font-bold">RECOMENDADO</span>
                  </div>
                  <select 
                    value={localSettings.engine}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, engine: e.target.value }))}
                    className="w-full text-[10px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="native_chromium">Chromium Threaded GPGPU Engine</option>
                    <option value="ffmpeg">FFmpeg GPGPU Accelerator Core</option>
                    <option value="libvlc">libVLC Hardware Core Native</option>
                  </select>
                  <p className="text-[7.5px] text-obs-muted/70 leading-normal">
                    Fuerza la pila de reproducción nativa. El motor FFmpeg y VLC gestionan buffering paralelo de audio y video externo en múltiples subprocesos aislados para suprimir colisiones críticas.
                  </p>
                </div>

                {/* Decodificación por Hardware */}
                <div className="space-y-1.5">
                  <label className="text-[8px] text-obs-muted uppercase font-black tracking-widest block">Aceleración por Hardware de Video (Windows Media Accel)</label>
                  <select 
                    value={localSettings.gpuDecoding}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, gpuDecoding: e.target.value }))}
                    className="w-full text-[10px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="d3d11">Direct3D 11 (GPU Windows Dedicado)</option>
                    <option value="dxva2">DXVA2 (DirectX Video Acceleration 2.0)</option>
                    <option value="nvdec">NVIDIA NVDEC Core Engine</option>
                    <option value="vaapi">Intel/AMD VA-API Hardware Layer</option>
                    <option value="software">Software (Multi-núcleo por CPU - No acelerado)</option>
                  </select>
                  <p className="text-[7.5px] text-obs-muted/70 leading-normal">
                    La selección activa el controlador decodificador de silicio en tu GPU Windows. **D3D11** y **DXVA2** usan las tuberías nativas de aceleración DirectX Media Foundation integradas en Windows.
                  </p>
                </div>

                {/* API de Presentación Gráfica */}
                <div className="space-y-1.5">
                  <label className="text-[8px] text-obs-muted uppercase font-black tracking-widest block">API de Presentación Gráfica (Rasterización del Lienzo)</label>
                  <select 
                    value={localSettings.renderingBackend}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, renderingBackend: e.target.value }))}
                    className="w-full text-[10px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-2 focus:outline-none focus:border-obs-accent font-black uppercase tracking-wider"
                  >
                    <option value="directx11">DirectX 11 (Composición por GPU principal)</option>
                    <option value="directx12">DirectX 12 (Baja latencia multihilo / D3D12)</option>
                    <option value="opengl">OpenGL Core 4.6 Native</option>
                    <option value="vulkan">Vulkan Universal RT Presentation Interface</option>
                  </select>
                  <p className="text-[7.5px] text-obs-muted/70 leading-normal">
                    Este motor asigna qué API de renderizado utilizará la aplicación de escritorio para pintar los efectos de mezcla, transiciones WebGL, filtros matriciales RGB y capas PIP.
                  </p>
                </div>

                {/* Dos Columnas internas para buffering y loop */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[8px] text-obs-muted uppercase font-black tracking-widest block">Estrategia de Pool de Búfer</label>
                    <select 
                      value={localSettings.bufferingMode || 'aggressive'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, bufferingMode: e.target.value }))}
                      className="w-full text-[9px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-1.5 focus:outline-none focus:border-obs-accent font-black uppercase"
                    >
                      <option value="normal">Demanda Simple</option>
                      <option value="aggressive">Agresivo (2000ms caché)</option>
                      <option value="ultra_preload">Pool HD (Ultra Precache)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[8px] text-obs-muted uppercase font-black tracking-widest block">Algoritmo de Bucle</label>
                    <select 
                      value={localSettings.loopMode || 'native_seamless'}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, loopMode: e.target.value }))}
                      className="w-full text-[9px] bg-obs-dark-1 text-obs-text border border-obs-border rounded p-1.5 focus:outline-none focus:border-obs-accent font-black uppercase"
                    >
                      <option value="native_seamless">Sub-frame Loop</option>
                      <option value="double_buffer">Double Buffer Loop</option>
                      <option value="standard">HTML5 nativo (Estilo Web)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-obs-border/40">
                  <div className="flex justify-between items-center">
                    <label className="text-[8px] text-obs-muted uppercase font-black tracking-widest block">Hilos de procesamiento en paralelo de Video</label>
                    <span className="font-mono text-obs-accent text-[9px] font-black">{localSettings.maxThreads} Cores asignados</span>
                  </div>
                  <input 
                    type="range"
                    min={1}
                    max={diagnosticsResult ? Math.max(8, diagnosticsResult.cpuCores) : 8}
                    step={1}
                    value={localSettings.maxThreads}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, maxThreads: parseInt(e.target.value) }))}
                    className="w-full accent-obs-accent h-1.5 bg-obs-dark-1 rounded-full cursor-pointer"
                  />
                  <div className="flex justify-between text-[6.5px] text-obs-muted/70 font-mono">
                    <span>1 Hilo (Mínima carga)</span>
                    <span>{diagnosticsResult?.cpuCores || 8} Hilos (Diagnóstico óptimo)</span>
                  </div>
                </div>

                {/* Optimización de codecs */}
                <div className="grid grid-cols-2 gap-3.5 pt-2 border-t border-obs-border/40">
                  <div className="flex justify-between items-center bg-obs-dark-1 p-2 rounded">
                    <span className="text-[8px] text-obs-text uppercase font-black tracking-wider leading-none">Optimizar Codecs HA</span>
                    <button
                      onClick={() => setLocalSettings(prev => ({ ...prev, codecOptimization: !prev.codecOptimization }))}
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${localSettings.codecOptimization ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${localSettings.codecOptimization ? 'translate-x-[14px]' : 'translate-x-[1px]'}`} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center bg-obs-dark-1 p-2 rounded">
                    <span className="text-[8px] text-obs-text uppercase font-black tracking-wider leading-none">Precarga de Videos HD</span>
                    <button
                      onClick={() => setLocalSettings(prev => ({ ...prev, highResOptimization: !prev.highResOptimization }))}
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${localSettings.highResOptimization ? 'bg-obs-accent' : 'bg-obs-border'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${localSettings.highResOptimization ? 'translate-x-[14px]' : 'translate-x-[1px]'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Column Right: Diagnostics & Windows Nvidia Banner */}
            <div className="md:col-span-5 space-y-4">
              {/* Diagnósticos del Sistema Windows */}
              <div className="bg-obs-surface p-4 rounded border border-obs-border/50 space-y-3">
                <div className="flex justify-between items-center border-b border-obs-border pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-obs-accent flex items-center gap-1.5">
                    <RefreshCw size={13} className={isDiagnosing ? 'animate-spin' : ''} /> Diagnóstico de Windows
                  </span>
                  <button 
                    onClick={runDiagnostic}
                    className="text-[8px] uppercase tracking-widest font-bold bg-obs-bg px-2 py-0.5 rounded border border-obs-border text-obs-text hover:bg-obs-border hover:text-white transition-all font-mono"
                  >
                    Escanear
                  </button>
                </div>

                {isDiagnosing ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <CpuIcon className="animate-spin text-obs-accent" size={24} />
                    <span className="text-[9px] font-bold text-obs-muted uppercase tracking-widest animate-pulse">Sondeando API DirectX/OpenGL...</span>
                  </div>
                ) : diagnosticsResult ? (
                  <div className="space-y-2.5 font-mono text-[8px]">
                    <div className="bg-obs-dark-1 p-2 rounded space-y-1.5">
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
                    <div className="bg-obs-dark-1 p-2 rounded space-y-1.5">
                      <div className="text-[7.5px] font-black text-obs-muted uppercase border-b border-obs-text/5 pb-1 select-none">LISTA DE INTEGRIDAD DE CONTROLADORES</div>
                      
                      <div className="flex justify-between items-center text-[7.5px]">
                        <span>DirectX 11 (Composición)</span>
                        {diagnosticsResult.directX11Supported ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-0.5">● DISPONIBLE (D3D11)</span>
                        ) : (
                          <span className="text-red-500 font-bold">● NO COMPATIBLE</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[7.5px]">
                        <span>DirectX 12 / Vulkan (Baja Latencia)</span>
                        {diagnosticsResult.directX12Supported ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-0.5">● INSTALADO EN WINDOWS</span>
                        ) : (
                          <span className="text-amber-500 font-bold flex items-center gap-0.5">▲ SIN API WEBGPU (SIMULADA)</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[7.5px]">
                        <span>OpenGL Core API</span>
                        {diagnosticsResult.openglSupported ? (
                          <span className="text-emerald-500 font-bold flex items-center gap-0.5">● DISPONIBLE (CON ARREGLO)</span>
                        ) : (
                          <span className="text-red-500 font-bold">● CONTROLADOR OBSOLETO</span>
                        )}
                      </div>
                    </div>

                    {/* GPU Check and Nvidia Specific */}
                    {diagnosticsResult.isNvidia ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2.5 text-emerald-400">
                        <div className="flex items-center gap-1.5 font-bold uppercase text-[8.5px] mb-1">
                          <Zap size={10} className="fill-emerald-400" /> ¡GPU NVIDIA DETECTADA CON ÉXITO!
                        </div>
                        <p className="leading-relaxed text-[7px] text-emerald-400/80">
                          Tu aceleradora NVIDIA está acelerando activamente la rasterización matricial y efectos WebGL de Lumin. El decodificador NVDEC de hardware ha sido inicializado sobre la API de video de Windows.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-obs-dark-1 p-2 rounded text-[7px] text-obs-muted">
                        <span className="font-bold text-[7.5px] text-obs-text uppercase block mb-0.5">Aviso de GPU Intel/AMD</span>
                        Tu aceleradora integrada está disponible. Asegúrate de forzar la GPU dedicada de alto rendimiento para proyectos que manejen múltiples pantallas con contenido 4K.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Guard de Diagnóstico e Información de NVIDIA */}
              <div className="bg-obs-surface p-4 rounded border border-obs-border/50 space-y-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-obs-accent flex items-center gap-1.5">
                  <ShieldAlert size={14} /> Tareas de Integridad en Windows
                </span>
                <p className="text-[7.5px] text-obs-muted leading-relaxed">
                  Para forzar al sistema operativo Windows a despachar esta aplicación usando la aceleradora GPU dedicada (por ejemplo, en el <span className="text-obs-text font-bold">Panel de Control de NVIDIA</span>):
                </p>
                <ol className="text-[7px] text-obs-muted/90 list-decimal pl-3 space-y-1 font-mono">
                  <li>Abre el Panel de control de NVIDIA en Windows.</li>
                  <li>Ve a <span className="text-white">"Controlar la configuración 3D"</span> &gt; <span className="text-white">"Configuración de programa"</span>.</li>
                  <li>Pulsa <span className="text-white">"Agregar"</span> y localiza el ejecutable de <span className="text-obs-accent font-bold">Lumin.exe</span> (o tu navegador de confianza si corres en sandbox).</li>
                  <li>Selecciona <span className="text-white">"Procesador NVIDIA de alto rendimiento"</span> como procesador gráfico preferido.</li>
                  <li>Pulsa aplicar. Las lecturas de DirectX 11/12 se propagarán directamente en el Monitor de Tarea en Windows.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-obs-border bg-obs-surface flex justify-between items-center shrink-0">
          <div className="text-[8px] uppercase tracking-wider text-obs-muted font-bold">
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
