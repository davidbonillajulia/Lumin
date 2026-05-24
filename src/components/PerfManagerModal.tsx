import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Cpu, Check, Settings, Sparkles } from 'lucide-react';

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        onApply(localSettings);
      }, 800);
    }, 400);
  };

  const loadRecommended = () => {
    setLocalSettings({
      gpuDecoding: 'd3d11',
      engine: 'native_chromium',
      bufferingMode: 'aggressive',
      renderingBackend: 'directx11',
      codecOptimization: true,
      renderCodec: 'dxv3',
      loopMode: 'native_seamless',
      highResOptimization: true,
      maxThreads: 4
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obs-bg/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-obs-bg border border-obs-border/80 rounded shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-obs-text font-sans relative"
      >
        {/* Save/Sync Status Overlay */}
        {saveStatus !== 'idle' && (
          <div className="absolute inset-0 bg-obs-bg/95 z-[110] flex flex-col items-center justify-center p-8 text-center space-y-4">
            {saveStatus === 'saving' ? (
              <>
                <Cpu className="animate-spin text-obs-accent" size={32} />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-obs-text">
                  Guardando en la Configuración...
                </h3>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 text-emerald-400">
                  <Check size={20} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  Ajustes Sincronizados Correctamente
                </h3>
                <span className="text-[9px] text-obs-muted animate-pulse">
                  Aplicando cambios maestros...
                </span>
              </>
            )}
          </div>
        )}

        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-obs-border bg-obs-surface flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="text-obs-accent" size={14} />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-obs-text">
              RENDIMIENTO Y CONFIGURACIÓN (GPU)
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-obs-muted hover:text-white hover:bg-obs-border transition-colors focus:outline-none"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 p-4 space-y-4">
          <div className="text-[8.5px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 p-2.5 rounded leading-relaxed font-black uppercase tracking-wide">
            ✓ Configuración de fluidos activa: El sistema se ha optimizado para evitar cortes o pausas al reproducir video.
          </div>

          <div className="bg-obs-surface p-3.5 rounded border border-obs-text/5 space-y-3">
            {/* Aceleración por Hardware GPU */}
            <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-obs-text/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-obs-text font-black uppercase font-sans">Aceleración por GPU (Windows)</span>
                <span className="text-[7.5px] text-obs-muted leading-tight">Usa DirectX11/D3D11 para acelerar la decodificación.</span>
              </div>
              <button
                onClick={() => setLocalSettings(p => ({ ...p, gpuDecoding: p.gpuDecoding === 'software' ? 'd3d11' : 'software' }))}
                className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.gpuDecoding !== 'software' ? 'bg-obs-accent' : 'bg-obs-border'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.gpuDecoding !== 'software' ? 'translate-x-[12px]' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Precarga de Memoria GPU */}
            <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-obs-text/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-obs-text font-black uppercase font-sans">Precarga Inteligente (Anti-Cortes)</span>
                <span className="text-[7.5px] text-obs-muted leading-tight">Mantiene un buffer continuo de 2 segundos para evitar pausas.</span>
              </div>
              <button
                onClick={() => setLocalSettings(p => ({ ...p, bufferingMode: p.bufferingMode === 'normal' ? 'aggressive' : 'normal' }))}
                className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.bufferingMode !== 'normal' ? 'bg-obs-accent' : 'bg-obs-border'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.bufferingMode !== 'normal' ? 'translate-x-[12px]' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Bucle Sin Fisuras */}
            <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-obs-text/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-obs-text font-black uppercase font-sans">Bucle Continuo Ultra</span>
                <span className="text-[7.5px] text-obs-muted leading-tight">Pre-carga frames de bucle para evitar pantallazos negros.</span>
              </div>
              <button
                onClick={() => setLocalSettings(p => ({ ...p, loopMode: p.loopMode === 'standard' ? 'native_seamless' : 'standard' }))}
                className={`w-7 h-4 rounded-full p-0.5 transition-colors shrink-0 ${localSettings.loopMode !== 'standard' ? 'bg-obs-accent' : 'bg-obs-border'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${localSettings.loopMode !== 'standard' ? 'translate-x-[12px]' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Hilos de Procesamiento */}
            <div className="space-y-1.5 pt-1.5">
              <div className="flex justify-between items-center text-[8px] text-obs-text font-black uppercase">
                <div className="flex flex-col gap-0.5">
                  <span>Hilos de Decodificación (CPU)</span>
                  <span className="text-[7.5px] text-obs-muted leading-tight">Reparte el trabajo de descompresión en múltiples núcleos.</span>
                </div>
                <span className="font-mono text-obs-accent text-[9px] font-black">{localSettings.maxThreads || 4} Cores</span>
              </div>
              <input 
                type="range"
                min={1}
                max={8}
                step={1}
                value={localSettings.maxThreads || 4}
                onChange={(e) => setLocalSettings(p => ({ ...p, maxThreads: parseInt(e.target.value) }))}
                className="w-full accent-obs-accent h-1 bg-obs-dark-1 rounded cursor-pointer"
              />
            </div>

            {/* Cargar Configuración Recomendada Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={loadRecommended}
                className="w-full py-2 bg-obs-accent/20 text-obs-accent hover:bg-obs-accent hover:text-white uppercase font-black text-[7.5px] tracking-widest rounded transition-all flex items-center justify-center gap-1 border border-obs-accent/30"
              >
                <Sparkles size={10} />
                Cargar Ajustes Recomendados
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-obs-border bg-obs-surface flex justify-end gap-2 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-[8px] font-black uppercase tracking-wider bg-obs-bg border border-obs-border hover:bg-obs-border hover:text-white transition-all focus:outline-none"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded text-[8px] font-black uppercase tracking-wider bg-obs-accent text-white hover:bg-obs-accent/80 transition-all shadow-lg shadow-obs-accent/10 flex items-center gap-1 focus:outline-none font-sans"
          >
            ✓ Aplicar Cambios
          </button>
        </div>
      </motion.div>
    </div>
  );
};
