import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause,
  Square, 
  Layers, 
  Monitor as MonitorIcon, 
  Settings, 
  Maximize, 
  Minimize,
  Zap, 
  Grid, 
  Plus, 
  Minus,
  Search, 
  Cpu, 
  Activity, 
  Share2,
  FolderOpen,
  Film,
  Image as ImageIcon,
  SkipBack,
  SkipForward,
  Sun,
  Moon,
  Filter,
  Scissors,
  GripVertical,
  MoreHorizontal,
  Clock,
  Timer,
  RotateCcw,
  Repeat,
  Volume2,
  List,
  Eye,
  AlertTriangle,
  ExternalLink,
  Radio,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence, animate, Reorder } from 'motion/react';

// --- Types ---
interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  scaleW: number;
  scaleH: number;
  rotationX: number;
  rotation: number;
}

interface Clip {
  id: string;
  name: string;
  thumbnail: string;
  url: string;
  type: 'video' | 'image' | 'generator';
  status: 'idle' | 'active' | 'preview';
  transform: ClipTransform;
  mask: 'none' | 'circle' | 'square' | 'diamond';
  opacity: number;
  master: number;
  speed: number;
  volume: number;
  pan: number;
  blendMode: 'Alpha' | 'Add' | 'Subtract' | 'Multiply';
  behavior: 'Cortar' | 'Mezclar' | 'Deslizar';
  curve: 'Lineal' | 'Seno' | 'Exponencial';
  filter: 'none' | 'grayscale' | 'sepia' | 'invert' | 'blur';
  brightness: number;
  contrast: number;
  saturation: number;
  colorBalance: { r: number, g: number, b: number };
  isPlaying?: boolean;
  loop?: boolean;
  currentTime?: number;
  duration?: number;
  transition?: 'cut' | 'fade' | 'wipe';
}

interface Playlist {
  id: string;
  name: string;
  clips: Clip[];
  opacity: number;
  isVisible: boolean;
  isPlaying?: boolean;
  currentClipIndex?: number;
  transform: ClipTransform;
  mask: 'none' | 'circle' | 'square' | 'diamond';
  master: number;
  speed: number;
  volume: number;
  pan: number;
  blendMode: 'Alpha' | 'Add' | 'Subtract' | 'Multiply';
  behavior: 'Cortar' | 'Mezclar' | 'Deslizar';
  curve: 'Lineal' | 'Seno' | 'Exponencial';
  filter: 'none' | 'grayscale' | 'sepia' | 'invert' | 'blur';
  brightness: number;
  contrast: number;
  saturation: number;
  colorBalance: { r: number, g: number, b: number };
}

interface Screen {
  id: string;
  name: string;
  isActive: boolean;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  isPrimary?: boolean;
}

interface ExternalScreenSettings {
  resolution: string;
  width: number;
  height: number;
  scalingW: number;
  scalingH: number;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  colorBalance: { r: number; g: number; b: number };
  selectedScreenId: string | null;
}

// --- Mock Data ---
const DEFAULT_TRANSFORM: ClipTransform = { x: 0, y: 0, scale: 1, scaleW: 1, scaleH: 1, rotationX: 0, rotation: 0 };

const MOCK_CLIPS: Clip[] = [];

// --- Components ---
const PropertyControl = ({ 
  label, 
  value, 
  displayValue, 
  min, 
  max, 
  step = 0.01, 
  onChange, 
  onInputChange 
}: { 
  label: string, 
  value: number, 
  displayValue: string, 
  min: number, 
  max: number, 
  step?: number, 
  onChange: (val: number) => void,
  onInputChange?: (val: string) => void
}) => {
  const progress = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-[#1a1a1a] rounded border border-[#2a2a2a] group">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wider text-obs-muted">{label}</span>
        <div className="flex items-center gap-2">
          {onInputChange ? (
            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
              <input 
                type="text"
                value={displayValue.replace(/[^\d.-]/g, '')}
                onChange={(e) => onInputChange(e.target.value)}
                className="w-10 bg-transparent border-none p-0 text-[10px] font-mono text-obs-accent outline-none text-right"
              />
              <span className="text-[8px] text-obs-muted uppercase font-bold">{displayValue.replace(/[\d.-]/g, '')}</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-obs-accent">{displayValue}</span>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onChange(Math.max(min, value - step))}
              className="text-obs-muted hover:text-white transition-colors p-0.5"
            >
              <Minus size={10} />
            </button>
            <button 
              onClick={() => onChange(Math.min(max, value + step))}
              className="text-obs-muted hover:text-white transition-colors p-0.5"
            >
              <Plus size={10} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Fader/Slider */}
      <div className="h-4 relative bg-black/60 rounded-full cursor-ew-resize overflow-hidden border border-white/5"
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const updateValue = (clientX: number) => {
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percent = x / rect.width;
            const newValue = min + percent * (max - min);
            onChange(newValue);
          };
          const handleMove = (moveEvent: MouseEvent) => updateValue(moveEvent.clientX);
          const handleUp = () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
          };
          window.addEventListener('mousemove', handleMove);
          window.addEventListener('mouseup', handleUp);
          updateValue(e.clientX);
        }}
      >
        <div 
          className="absolute inset-y-0 left-0 bg-obs-accent/30 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
        <div 
          className="absolute inset-y-0 bg-obs-accent w-1 shadow-[0_0_10px_rgba(0,170,255,0.8)] transition-all duration-75"
          style={{ left: `calc(${progress}% - 2px)` }}
        />
      </div>
    </div>
  );
};

const ClipCard = React.memo(({ clip, onSelect, onDragStart, isDarkMode, isSelected }: { clip: Clip, onSelect: () => void, onDragStart: (e: React.DragEvent) => void, isDarkMode: boolean, isSelected: boolean }) => (
  <div 
    draggable
    onDragStart={onDragStart}
    className="relative aspect-video rounded cursor-pointer group"
  >
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`w-full h-full rounded border transition-all ${
        isSelected 
          ? 'border-obs-accent shadow-[0_0_8px_rgba(0,170,255,0.3)]' 
          : 'border-obs-border hover:border-obs-muted bg-obs-surface'
      }`}
    >
    {clip.type === 'video' ? (
      <video 
        src={clip.url} 
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        muted
        loop
        playsInline
      />
    ) : (
      <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1.5">
      <span className="text-[9px] font-medium text-obs-text truncate">{clip.name}</span>
    </div>
    {clip.status === 'active' && (
      <div className="absolute top-1 right-1">
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
      </div>
    )}
  </motion.div>
</div>
));

const VUMeter = ({ label, position, level = 0 }: { label: string, position: 'left' | 'right', level?: number }) => {
  return (
    <div className={`flex flex-col items-center gap-2 h-full py-2 ${position === 'left' ? 'pr-1' : 'pl-1'}`}>
      <div className="flex-1 w-4 bg-obs-bg border border-obs-border rounded-sm relative overflow-hidden flex flex-col-reverse p-0.5 gap-0.5">
        {Array.from({ length: 15 }).map((_, i) => {
          const threshold = (i + 1) / 15;
          const isActive = level >= threshold;
          return (
            <div 
              key={i} 
              className={`flex-1 w-full rounded-sm transition-all duration-75 ${
                isActive 
                  ? (i < 9 ? 'bg-green-500' : i < 13 ? 'bg-yellow-500' : 'bg-red-500')
                  : (i < 9 ? 'bg-green-500/10' : i < 13 ? 'bg-yellow-500/10' : 'bg-red-500/10')
              }`} 
            />
          );
        })}
      </div>
      <div className="h-32 flex items-center justify-center">
        <span className="text-[7px] font-bold text-obs-muted uppercase tracking-[0.2em]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {label}
        </span>
      </div>
    </div>
  );
};

const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

const useAudioLevel = (videoRef: React.RefObject<HTMLVideoElement | null>, isActive: boolean, volume: number = 1) => {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const currentVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    
    if (video !== currentVideoRef.current) {
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {}
      }
      sourceRef.current = null;
      currentVideoRef.current = video;
    }

    if (!video || !isActive) {
      setLevel(0);
      return;
    }

    const initAudio = () => {
      try {
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContext.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }

        if (!sourceRef.current) {
          try {
            sourceRef.current = audioContext.createMediaElementSource(video);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContext.destination);
          } catch (e) {
            console.warn("Audio source connection error:", e);
          }
        }

        const updateLevel = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          // Level should reflect volume
          setLevel(Math.min(1, (average / 128) * video.volume));
          
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
      } catch (err) {
        console.error("Audio context error:", err);
      }
    };

    const handlePlay = () => initAudio();
    video.addEventListener('play', handlePlay);
    if (!video.paused) initAudio();

    return () => {
      video.removeEventListener('play', handlePlay);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [videoRef.current, isActive]);

  return level;
};

const Monitor = React.memo(({ 
  title, 
  isActive, 
  activeClip, 
  isDarkMode, 
  onDrop, 
  previewClip, 
  crossfaderValue, 
  isProgram,
  onEnded,
  onTogglePlay,
  onToggleLoop,
  onRewind,
  onSkip,
  onLevelChange,
  isPlaylist,
  onClick,
  volume = 1,
  brightness = 1,
  contrast = 1,
  saturation = 1,
  scalingW = 1,
  scalingH = 1,
  transitionType = 'fade',
  colorBalance = { r: 1, g: 1, b: 1 }
}: { 
  title: string, 
  isActive?: boolean, 
  activeClip?: Clip | null, 
  isDarkMode: boolean, 
  onDrop?: (e: React.DragEvent) => void, 
  previewClip?: Clip | null, 
  crossfaderValue?: number, 
  isProgram?: boolean,
  isPlaylist?: boolean,
  onEnded?: () => void,
  onTogglePlay?: (id: string) => void,
  onToggleLoop?: (id: string) => void,
  onRewind?: (id: string) => void,
  onSkip?: (id: string, amount: number) => void,
  onLevelChange?: (level: number) => void,
  onClick?: () => void,
  volume?: number,
  brightness?: number,
  contrast?: number,
  saturation?: number,
  scalingW?: number,
  scalingH?: number,
  transitionType?: 'fade' | 'wipe' | 'slide',
  colorBalance?: { r: number, g: number, b: number }
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioLevel = useAudioLevel(videoRef, !!activeClip && activeClip.type === 'video' && isProgram, volume);

  useEffect(() => {
    if (isProgram) {
      onLevelChange?.(audioLevel);
    }
  }, [audioLevel, onLevelChange, isProgram]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [activeClip?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && activeClip) {
      video.muted = false;
      // Multiply monitor volume by clip volume
      video.volume = (volume || 0) * (activeClip.volume !== undefined ? activeClip.volume : 1);
      // Set playback speed
      video.playbackRate = activeClip.speed || 1;
      
      if (activeClip.isPlaying !== false) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      video.muted = !isProgram;
      if (activeClip.currentTime !== undefined && Math.abs(video.currentTime - activeClip.currentTime) > 0.5) {
        video.currentTime = activeClip.currentTime;
      }
    }
  }, [activeClip?.id, activeClip?.isPlaying, activeClip?.volume, activeClip?.speed, isProgram, volume]);

  useEffect(() => {
    const previewVideo = previewVideoRef.current;
    if (previewVideo && previewClip) {
      previewVideo.muted = true;
      previewVideo.play().catch(() => {});
    }
  }, [previewClip?.id]);

  const lastPreviewClipId = useRef<string | null>(null);
  const lastPreviewTime = useRef<number>(0);

  // Capture time from preview video to sync when transition ends
  useEffect(() => {
    let interval: any;
    if (previewClip && previewVideoRef.current) {
      interval = setInterval(() => {
        if (previewVideoRef.current) {
          lastPreviewTime.current = previewVideoRef.current.currentTime;
        }
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [previewClip]);

  useEffect(() => {
    if (previewClip) {
      lastPreviewClipId.current = previewClip.id;
    }
  }, [previewClip]);

  useEffect(() => {
    if (!previewClip && lastPreviewClipId.current && activeClip?.id === lastPreviewClipId.current) {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - lastPreviewTime.current) > 0.5) {
        videoRef.current.currentTime = lastPreviewTime.current;
      }
      lastPreviewClipId.current = null;
    }
  }, [previewClip, activeClip]);

  const activeFilterId = useMemo(() => `monitor-filter-active-${activeClip?.id}-${Math.random().toString(36).substr(2, 9)}`, [activeClip?.id]);
  const previewFilterId = useMemo(() => `monitor-filter-preview-${previewClip?.id}-${Math.random().toString(36).substr(2, 9)}`, [previewClip?.id]);
  const globalFilterId = useMemo(() => `monitor-filter-global-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
      <div 
        className="flex flex-col min-w-0 cursor-pointer h-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onClick}
    >
      {/* SVG Filters */}
      <svg width="0" height="0" className="absolute">
        {activeClip && (
          <filter id={activeFilterId}>
            <feColorMatrix 
              type="matrix" 
              values={`${activeClip.colorBalance?.r ?? 1} 0 0 0 0
                      0 ${activeClip.colorBalance?.g ?? 1} 0 0 0
                      0 0 ${activeClip.colorBalance?.b ?? 1} 0 0
                      0 0 0 1 0`} 
            />
          </filter>
        )}
        {previewClip && (
          <filter id={previewFilterId}>
            <feColorMatrix 
              type="matrix" 
              values={`${previewClip.colorBalance?.r ?? 1} 0 0 0 0
                      0 ${previewClip.colorBalance?.g ?? 1} 0 0 0
                      0 0 ${previewClip.colorBalance?.b ?? 1} 0 0
                      0 0 0 1 0`} 
            />
          </filter>
        )}
        {isProgram && (
          <filter id={globalFilterId}>
            <feColorMatrix 
              type="matrix" 
              values={`${colorBalance.r} 0 0 0 0
                      0 ${colorBalance.g} 0 0 0
                      0 0 ${colorBalance.b} 0 0
                      0 0 0 1 0`} 
            />
          </filter>
        )}
      </svg>
      <div className={`px-2 py-1 flex justify-between items-center border-b rounded-t-sm ${
        isActive 
          ? 'bg-red-900/20 border-red-500/50' 
          : 'bg-obs-surface border-obs-border'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-red-500' : 'text-obs-text'}`}>{isProgram ? 'PROGRAMA' : 'VISTA PREVIA'}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[8px] font-mono text-obs-muted">1920x1080</span>
        </div>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
        <div 
          className={`w-full max-h-full aspect-video relative flex items-center justify-center overflow-hidden bg-[#050505] border-2 ${isActive ? 'border-red-500' : 'border-obs-accent'} rounded-sm shadow-2xl shadow-black/50`}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={isProgram ? {
              filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) url(#${globalFilterId})`,
              transform: `scale(${scalingW ?? 1}, ${scalingH ?? 1})`
            } : {}}
          >
            {/* Safe area guides */}
            <div className="absolute inset-0 border border-white/5 pointer-events-none m-4" />
            <div className="absolute inset-0 border border-white/5 pointer-events-none m-8" />
            
            <AnimatePresence>
              {activeClip && (
                <motion.div 
                  key={activeClip.id}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: (activeClip.opacity || 1) * (isProgram ? (crossfaderValue !== undefined && transitionType === 'fade' ? (100 - crossfaderValue) / 100 : 1) : 1),
                    x: activeClip.transform.x + (isProgram && transitionType === 'slide' ? -crossfaderValue : 0),
                    y: activeClip.transform.y,
                    scaleX: activeClip.transform.scaleW,
                    scaleY: activeClip.transform.scaleH,
                    rotate: activeClip.transform.rotation,
                    rotateX: activeClip.transform.rotationX,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  style={{
                    clipPath: isProgram && transitionType === 'wipe' ? `inset(0 ${crossfaderValue}% 0 0)` : 
                              activeClip.mask === 'circle' ? 'circle(50%)' : 
                              activeClip.mask === 'square' ? 'inset(0%)' : 
                              activeClip.mask === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none',
                    filter: `brightness(${activeClip.brightness ?? 1}) contrast(${activeClip.contrast ?? 1}) saturate(${activeClip.saturation ?? 1}) url(#${activeFilterId}) ${
                      activeClip.filter === 'grayscale' ? 'grayscale(100%)' :
                      activeClip.filter === 'sepia' ? 'sepia(100%)' :
                      activeClip.filter === 'invert' ? 'invert(100%)' :
                      activeClip.filter === 'blur' ? 'blur(10px)' : ''
                    }`
                  }}
                >
                  {activeClip.type === 'video' ? (
                    <video 
                      ref={videoRef}
                      src={activeClip.url} 
                      className="w-full h-full object-contain" 
                      autoPlay
                      muted={false} 
                      loop={isPlaylist ? false : true} 
                      playsInline
                      onEnded={onEnded}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <img src={activeClip.url} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  )}
                </motion.div>
              )}

              {previewClip && crossfaderValue !== undefined && crossfaderValue > 0 && previewClip.id !== activeClip?.id && (
                <motion.div 
                  key={`preview-${previewClip.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: (previewClip.opacity || 1) * (transitionType === 'fade' ? crossfaderValue / 100 : 1),
                    x: previewClip.transform.x + (transitionType === 'slide' ? (100 - crossfaderValue) : 0),
                    y: previewClip.transform.y,
                    scaleX: previewClip.transform.scaleW,
                    scaleY: previewClip.transform.scaleH,
                    rotate: previewClip.transform.rotation,
                    rotateX: previewClip.transform.rotationX,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute inset-0 z-20 flex items-center justify-center will-change-transform"
                  style={{
                    clipPath: transitionType === 'wipe' ? `inset(0 0 0 ${100 - crossfaderValue}%)` :
                              previewClip.mask === 'circle' ? 'circle(50%)' : 
                              previewClip.mask === 'square' ? 'inset(0%)' : 
                              previewClip.mask === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none',
                    filter: `brightness(${previewClip.brightness ?? 1}) contrast(${previewClip.contrast ?? 1}) saturate(${previewClip.saturation ?? 1}) url(#${previewFilterId}) ${
                      previewClip.filter === 'grayscale' ? 'grayscale(100%)' :
                      previewClip.filter === 'sepia' ? 'sepia(100%)' :
                      previewClip.filter === 'invert' ? 'invert(100%)' :
                      previewClip.filter === 'blur' ? 'blur(10px)' : ''
                    }`
                  }}
                >
                  {previewClip.type === 'video' ? (
                    <video 
                      ref={previewVideoRef}
                      src={previewClip.url} 
                      className="w-full h-full object-contain" 
                      autoPlay 
                      muted={false}
                      loop={isPlaylist ? false : true}
                      playsInline
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <img src={previewClip.url} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {!activeClip && (!previewClip || !isProgram) && (
            <div className="flex flex-col items-center gap-2 text-obs-muted">
              <MonitorIcon size={48} strokeWidth={1} />
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Sin Señal</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const PixelMapModal = ({ 
  isOpen, 
  onClose, 
  slices, 
  onUpdateSlices 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  slices: any[], 
  onUpdateSlices: (slices: any[]) => void 
}) => {
  const [activeSliceId, setActiveSliceId] = useState<string | null>(slices[0]?.id || null);
  const [viewMode, setViewMode] = useState<'input' | 'output'>('input');
  const [showTestCard, setShowTestCard] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const activeSlice = slices.find(s => s.id === activeSliceId);

  const updateActiveSlice = (updates: any) => {
    onUpdateSlices(slices.map(s => s.id === activeSliceId ? { ...s, ...updates } : s));
  };

  const addSlice = () => {
    const newSlice = {
      id: `slice-${Date.now()}`,
      name: `Slice ${slices.length + 1}`,
      x: 0, y: 0, width: 1920, height: 1080,
      outputX: 0, outputY: 0, outputWidth: 1920, outputHeight: 1080
    };
    onUpdateSlices([...slices, newSlice]);
    setActiveSliceId(newSlice.id);
  };

  const deleteSlice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slices.length <= 1) return;
    const newSlices = slices.filter(s => s.id !== id);
    onUpdateSlices(newSlices);
    if (activeSliceId === id) {
      setActiveSliceId(newSlices[0].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full max-w-6xl bg-obs-bg border border-obs-border rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="h-12 border-b border-obs-border flex items-center justify-between px-4 bg-obs-surface">
          <div className="flex items-center gap-3">
            <Layers size={16} className="text-obs-accent" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Advanced Output / Pixel Map</h2>
            <div className="h-4 w-[1px] bg-obs-border mx-2" />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-3 h-3 rounded-sm border transition-colors ${showTestCard ? 'bg-obs-accent border-obs-accent' : 'border-obs-muted group-hover:border-obs-text'}`} onClick={() => setShowTestCard(!showTestCard)} />
                <span className="text-[10px] uppercase font-bold text-obs-muted group-hover:text-obs-text">Test Card</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-3 h-3 rounded-sm border transition-colors ${snapToGrid ? 'bg-obs-accent border-obs-accent' : 'border-obs-muted group-hover:border-obs-text'}`} onClick={() => setSnapToGrid(!snapToGrid)} />
                <span className="text-[10px] uppercase font-bold text-obs-muted group-hover:text-obs-text">Snap</span>
              </label>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-obs-border rounded-full transition-colors">
            <Plus size={20} className="rotate-45" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Slices List */}
          <div className="w-64 border-r border-obs-border flex flex-col bg-obs-surface/50">
            <div className="p-3 border-b border-obs-border flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-obs-muted">Slices</span>
              <button onClick={addSlice} className="p-1 hover:bg-obs-accent hover:text-white rounded transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {slices.map(slice => (
                <button
                  key={slice.id}
                  onClick={() => setActiveSliceId(slice.id)}
                  className={`w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center justify-between group ${
                    activeSliceId === slice.id ? 'bg-obs-accent text-white' : 'hover:bg-obs-border text-obs-text'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical size={12} className="opacity-50" />
                    {slice.name}
                  </div>
                  <button 
                    onClick={(e) => deleteSlice(slice.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500 rounded transition-all"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </button>
              ))}
            </div>
          </div>

          {/* Center Panel: Canvas Editor */}
          <div className="flex-1 flex flex-col bg-black/40 relative">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-obs-surface border border-obs-border rounded-full p-1 shadow-lg">
              <button 
                onClick={() => setViewMode('input')}
                className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${viewMode === 'input' ? 'bg-obs-accent text-white' : 'text-obs-muted hover:text-obs-text'}`}
              >
                Input Selection
              </button>
              <button 
                onClick={() => setViewMode('output')}
                className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${viewMode === 'output' ? 'bg-obs-accent text-white' : 'text-obs-muted hover:text-obs-text'}`}
              >
                Output Transformation
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-12">
              <div className="w-full aspect-video bg-obs-surface/20 border border-white/10 relative shadow-2xl overflow-hidden">
                {/* Test Card Background */}
                {showTestCard && (
                  <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={`border border-white/20 ${i % 2 === 0 ? 'bg-white/5' : 'bg-transparent'}`} />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-[1px] bg-obs-accent/50" />
                      <div className="h-full w-[1px] bg-obs-accent/50 absolute" />
                      <div className="w-64 h-64 border-2 border-obs-accent/50 rounded-full" />
                    </div>
                  </div>
                )}

                {/* Canvas Grid */}
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none opacity-5">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} className="border border-white" />
                  ))}
                </div>

                {/* Slices on Canvas */}
                {slices.map(slice => (
                  <div
                    key={slice.id}
                    className={`absolute border-2 transition-all ${
                      activeSliceId === slice.id ? 'border-obs-accent bg-obs-accent/10 z-20' : 'border-white/20 bg-white/5 z-10'
                    }`}
                    style={{
                      left: `${(viewMode === 'input' ? slice.x : slice.outputX) / 19.2}%`,
                      top: `${(viewMode === 'input' ? slice.y : slice.outputY) / 10.8}%`,
                      width: `${(viewMode === 'input' ? slice.width : slice.outputWidth) / 19.2}%`,
                      height: `${(viewMode === 'input' ? slice.height : slice.outputHeight) / 10.8}%`,
                    }}
                  >
                    <div className="absolute -top-5 left-0 text-[9px] font-bold text-obs-accent whitespace-nowrap">
                      {slice.name} ({viewMode === 'input' ? `${slice.width}x${slice.height}` : `${slice.outputWidth}x${slice.outputHeight}`})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Slice Properties */}
          <div className="w-72 border-l border-obs-border flex flex-col bg-obs-surface/50">
            <div className="p-3 border-b border-obs-border">
              <span className="text-[10px] font-bold uppercase text-obs-muted">Properties</span>
            </div>
            {activeSlice ? (
              <div className="p-4 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-obs-accent uppercase">General</div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-obs-muted uppercase font-bold">Name</label>
                    <input 
                      type="text"
                      value={activeSlice.name}
                      onChange={(e) => updateActiveSlice({ name: e.target.value })}
                      className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[10px] font-bold text-obs-accent uppercase">
                    {viewMode === 'input' ? 'Input Selection' : 'Output Transformation'}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">X</label>
                      <input 
                        type="number"
                        value={viewMode === 'input' ? activeSlice.x : activeSlice.outputX}
                        onChange={(e) => updateActiveSlice(viewMode === 'input' ? { x: parseInt(e.target.value) } : { outputX: parseInt(e.target.value) })}
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">Y</label>
                      <input 
                        type="number"
                        value={viewMode === 'input' ? activeSlice.y : activeSlice.outputY}
                        onChange={(e) => updateActiveSlice(viewMode === 'input' ? { y: parseInt(e.target.value) } : { outputY: parseInt(e.target.value) })}
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">Width</label>
                      <input 
                        type="number"
                        value={viewMode === 'input' ? activeSlice.width : activeSlice.outputWidth}
                        onChange={(e) => updateActiveSlice(viewMode === 'input' ? { width: parseInt(e.target.value) } : { outputWidth: parseInt(e.target.value) })}
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-obs-muted uppercase font-bold">Height</label>
                      <input 
                        type="number"
                        value={viewMode === 'input' ? activeSlice.height : activeSlice.outputHeight}
                        onChange={(e) => updateActiveSlice(viewMode === 'input' ? { height: parseInt(e.target.value) } : { outputHeight: parseInt(e.target.value) })}
                        className="w-full bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-obs-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <span className="text-[10px] text-obs-muted uppercase font-bold tracking-widest">Select a slice to edit</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t border-obs-border flex items-center justify-end px-4 bg-obs-surface gap-3">
          <button onClick={onClose} className="px-4 py-1.5 rounded text-[11px] font-bold text-obs-muted hover:text-obs-text transition-colors">Cancel</button>
          <button onClick={onClose} className="px-6 py-1.5 rounded bg-obs-accent text-white text-[11px] font-bold hover:bg-obs-accent/80 transition-colors">Save Setup</button>
        </div>
      </motion.div>
    </div>
  );
};

const VideoLayer = ({ clip, volume, opacity, isProgram, crossfaderValue, transitionType, onTimeUpdate, startTime }: { 
  clip: any, 
  volume: number, 
  opacity: number, 
  isProgram: boolean, 
  crossfaderValue?: number,
  transitionType?: 'fade' | 'wipe' | 'slide',
  onTimeUpdate?: (time: number) => void,
  startTime?: number
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSrc = useRef<string>('');
  const filterId = useMemo(() => `filter-${clip.id}-${Math.random().toString(36).substr(2, 9)}`, [clip.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && clip.type === 'video') {
      // If src changed, check for startTime
      if (lastSrc.current !== clip.url && startTime !== undefined) {
        video.currentTime = startTime;
      }
      lastSrc.current = clip.url;

      video.volume = (volume || 0) * (clip.volume !== undefined ? clip.volume : 1);
      video.playbackRate = clip.speed || 1;
      if (clip.isPlaying !== false) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [clip.id, clip.url, clip.volume, clip.speed, volume, clip.isPlaying, startTime]);

  const colorBalance = clip.colorBalance || { r: 1, g: 1, b: 1 };
  const brightness = clip.brightness ?? 1;
  const contrast = clip.contrast ?? 1;
  const saturation = clip.saturation ?? 1;

  const clipPath = useMemo(() => {
    if (isProgram && transitionType === 'wipe' && crossfaderValue !== undefined) {
      return `inset(0 ${crossfaderValue}% 0 0)`;
    }
    if (!isProgram && transitionType === 'wipe' && crossfaderValue !== undefined) {
      return `inset(0 0 0 ${100 - crossfaderValue}%)`;
    }
    return clip.mask === 'circle' ? 'circle(50%)' : 
           clip.mask === 'square' ? 'inset(0%)' : 
           clip.mask === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none';
  }, [clip.mask, isProgram, transitionType, crossfaderValue]);

  const xOffset = useMemo(() => {
    if (isProgram && transitionType === 'slide' && crossfaderValue !== undefined) {
      return clip.transform.x - crossfaderValue;
    }
    if (!isProgram && transitionType === 'slide' && crossfaderValue !== undefined) {
      return clip.transform.x + (100 - crossfaderValue);
    }
    return clip.transform.x;
  }, [clip.transform.x, isProgram, transitionType, crossfaderValue]);

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <filter id={filterId}>
          <feColorMatrix 
            type="matrix" 
            values={`${colorBalance.r} 0 0 0 0
                    0 ${colorBalance.g} 0 0 0
                    0 0 ${colorBalance.b} 0 0
                    0 0 0 1 0`} 
          />
        </filter>
      </svg>
      <motion.div 
        key={clip.id}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: opacity,
          x: xOffset,
          y: clip.transform.y,
          scaleX: clip.transform.scaleW,
          scaleY: clip.transform.scaleH,
          rotate: clip.transform.rotation,
          rotateX: clip.transform.rotationX,
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          clipPath,
          filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) url(#${filterId}) ${
            clip.filter === 'grayscale' ? 'grayscale(100%)' :
            clip.filter === 'sepia' ? 'sepia(100%)' :
            clip.filter === 'invert' ? 'invert(100%)' :
            clip.filter === 'blur' ? 'blur(10px)' : ''
          }`
        }}
      >
        {clip.type === 'video' ? (
          <video 
            ref={videoRef}
            src={clip.url} 
            className="w-full h-full object-contain" 
            autoPlay 
            muted={false}
            loop={clip.loop !== false} 
            playsInline
            crossOrigin="anonymous"
            onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
          />
        ) : (
          <img src={clip.url} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        )}
      </motion.div>
    </>
  );
};

const OutputView = () => {
  const [state, setState] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("OutputView: Montado y esperando señal...");
    document.title = "LUMINA OUTPUT - PROGRAM";
    const channel = new BroadcastChannel('lumina-output');
    
    const handleMessage = (event: MessageEvent) => {
      console.log("OutputView: Mensaje recibido:", event.data.type);
      if (event.data.type === 'SYNC_STATE') {
        const newState = event.data.payload;
        if (newState.isLive && newState.isTransmitting) {
          setState(newState);
        } else {
          setState(null);
        }
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    // Request initial state
    channel.postMessage({ type: 'REQUEST_SYNC' });

    // Monitor fullscreen status
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      channel.removeEventListener('message', handleMessage);
      document.removeEventListener('fullscreenchange', handleFsChange);
      channel.close();
    };
  }, []);

  // Attempt automatic fullscreen when state arrives
  useEffect(() => {
    const tryFullscreen = async () => {
      if (state && !isFullscreen) {
        try {
          // If the Window Management API is available, we can try to find the screen we are on
          if ('getScreenDetails' in window) {
            // @ts-ignore
            const details = await window.getScreenDetails();
            // Try to match the current window's position to a known screen
            const currentScreen = details.screens.find((s: any) => 
              window.screenX >= s.left && window.screenX < s.left + s.width &&
              window.screenY >= s.top && window.screenY < s.top + s.height
            );
            
            if (currentScreen) {
              // @ts-ignore
              await document.documentElement.requestFullscreen({ screen: currentScreen });
              return;
            }
          }
          
          // Fallback
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.warn('Auto-fullscreen bloqueado o fallido:', err);
        }
      }
    };

    tryFullscreen();
  }, [state, isFullscreen]);

  if (error) {
    return (
      <div className="bg-red-900 h-screen w-screen flex flex-col items-center justify-center text-white font-mono text-xs p-8 gap-4">
        <AlertTriangle size={48} className="text-yellow-400" />
        <h2 className="text-xl font-bold uppercase tracking-widest">Error Crítico en Salida</h2>
        <p className="opacity-70 max-w-md text-center bg-black/30 p-4 rounded border border-white/10">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-white/10 hover:bg-white/20 px-6 py-2 rounded border border-white/20 uppercase font-bold tracking-widest transition-all"
        >
          Reiniciar Ventana
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div 
        className="bg-black h-screen w-screen flex flex-col items-center justify-center cursor-none group relative"
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }}
      >
        {!isFullscreen && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 uppercase tracking-[0.4em] font-black pointer-events-none group-hover:text-white/40 transition-colors">
            <span className="text-[20px]">Esperando Señal</span>
            <span className="text-[10px] mt-2 tracking-widest opacity-50">Cerrar: Esc / Pantalla Completa: Clic</span>
          </div>
        )}
      </div>
    );
  }

  try {
    const { programClipId, previewClipId, clips, externalScreenSettings, programVolume, crossfaderValue, transitionType, isLive } = state;
    const settings = externalScreenSettings;
    
    // --- Bus A/B Logic ---
    const busAClip = clips.find((c: any) => c.id === (crossfaderValue === 0 ? programClipId : previewClipId));
    const busBClip = clips.find((c: any) => c.id === (crossfaderValue === 100 ? programClipId : previewClipId));
    
    return (
      <div 
        className="bg-black h-screen w-screen overflow-hidden flex items-center justify-center group relative cursor-none"
        style={{
          filter: `brightness(${settings.brightness}) contrast(${settings.contrast}) saturate(${settings.saturation})`,
          backgroundColor: '#000'
        }}
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }}
      >
        <div 
          className="relative bg-black overflow-hidden flex items-center justify-center"
          style={{ 
            width: settings.width ? `${settings.width}px` : '100%', 
            height: settings.height ? `${settings.height}px` : '100%',
          }}
        >
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `scale(${settings.scalingW ?? 1}, ${settings.scalingH ?? 1})`
            }}
          >
            {/* SVG Filter for RGB Balance */}
            <svg width="0" height="0" className="absolute">
              <filter id="rgbBalance">
                <feColorMatrix 
                  type="matrix" 
                  values={`${settings.colorBalance.r} 0 0 0 0
                          0 ${settings.colorBalance.g} 0 0 0
                          0 0 ${settings.colorBalance.b} 0 0
                          0 0 0 1 0`} 
                />
              </filter>
            </svg>

            {isLive ? (
              <div 
                className="w-full h-full flex items-center justify-center relative"
                style={{
                  transform: `scale(${settings.scalingW}, ${settings.scalingH})`,
                  filter: `brightness(${settings.brightness ?? 1}) contrast(${settings.contrast ?? 1}) saturate(${settings.saturation ?? 1}) url(#rgbBalance)`
                }}
              >
                {/* Bus A Layer */}
                {busAClip && (
                  <VideoLayer 
                    key={`bus-A-${busAClip.id}`}
                    clip={busAClip}
                    volume={programVolume}
                    opacity={(busAClip.opacity || 1) * (busAClip.master || 1) * (transitionType === 'fade' ? (crossfaderValue === 0 ? 1 : (100 - crossfaderValue) / 100) : 1)}
                    isProgram={crossfaderValue === 0}
                    crossfaderValue={crossfaderValue}
                    transitionType={transitionType}
                  />
                )}

                {/* Bus B Layer */}
                {busBClip && (
                  <VideoLayer 
                    key={`bus-B-${busBClip.id}`}
                    clip={busBClip}
                    volume={programVolume}
                    opacity={(busBClip.opacity || 1) * (busBClip.master || 1) * (transitionType === 'fade' ? (crossfaderValue === 100 ? 1 : crossfaderValue / 100) : 1)}
                    isProgram={crossfaderValue === 100}
                    crossfaderValue={crossfaderValue}
                    transitionType={transitionType}
                  />
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-black" />
            )}
          </div>
        </div>
      </div>
    );
  } catch (e: any) {
    console.error("Error crítico en OutputView:", e);
    setError(e.message);
    return null;
  }
};

const Inspector = React.memo(({ 
  selectedItem,
  selectedItemType,
  externalScreenSettings,
  externalScreens,
  hasDetailedScreens,
  isIframe,
  onUpdate, 
  onUpdateExternalScreen,
  onLaunchOutput,
  onDetectScreens,
  isDarkMode 
}: { 
  selectedItem: Clip | Playlist | null, 
  selectedItemType: 'clip' | 'playlist' | 'program' | null,
  externalScreenSettings: any,
  externalScreens: Screen[],
  hasDetailedScreens: boolean,
  isIframe: boolean,
  onUpdate: (id: string, updates: any) => void, 
  onUpdateExternalScreen: (updates: any) => void,
  onLaunchOutput: () => void,
  onDetectScreens: () => void,
  isDarkMode: boolean 
}) => {
  const handleReset = () => {
    if ((selectedItemType === 'clip' || selectedItemType === 'playlist') && selectedItem) {
      onUpdate(selectedItem.id, {
        transform: { ...DEFAULT_TRANSFORM },
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        mask: 'none',
        filter: 'none'
      });
    } else if (selectedItemType === 'program') {
      onUpdateExternalScreen({
        ...externalScreenSettings,
        resolution: '1920x1080',
        width: 1920,
        height: 1080,
        scalingW: 1,
        scalingH: 1,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 }
      });
    }
  };

  if (selectedItemType === 'program') {
    const selectedScreen = externalScreens.find(s => s.id === externalScreenSettings.selectedScreenId);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    return (
      <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
        <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
          <div className="flex items-center gap-2">
            <MonitorIcon size={12} className="text-obs-accent" />
            <span className="text-[11px] font-semibold text-obs-text uppercase tracking-widest">Configuración Desktop</span>
          </div>
          <button 
            onClick={handleReset}
            className="p-1.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white transition-colors"
            title="Restablecer Ajustes"
          >
            <RotateCcw size={12} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Installation Status / Guide */}
          {!isStandalone && !isIframe && (
            <div className="p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Settings size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Modo Escritorio Nativo</span>
              </div>
              <p className="text-[9px] text-blue-100/70 leading-relaxed">
                Para una experiencia nativa sin barras de navegador (estilo Resolume):
              </p>
              <div className="bg-black/20 p-2 rounded text-[9px] text-white/90 font-mono">
                Menú Chrome &gt; Guardar y compartir &gt; Instalar página como Aplicación
              </div>
              <p className="text-[8px] text-blue-300/50 italic mt-2 border-t border-blue-500/20 pt-2">
                Nota: Para que sea una app .exe de escritorio instalable, este código se puede empaquetar con Electron muy fácilmente, manteniendo exactamente esta misma lógica de doble monitor.
              </p>
            </div>
          )}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Destino de Salida</div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] text-obs-muted uppercase font-bold">Monitor Seleccionado</label>
                <div className="flex gap-2">
                  <select 
                    value={externalScreenSettings.selectedScreenId || ''}
                    onChange={(e) => onUpdateExternalScreen({ ...externalScreenSettings, selectedScreenId: e.target.value })}
                    className="flex-1 bg-obs-bg border border-obs-border rounded px-2 py-1.5 text-[11px] text-obs-text focus:border-obs-accent outline-none font-medium"
                  >
                    <option value="" disabled>Seleccionar monitor...</option>
                    {externalScreens.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.isPrimary ? '📌' : ''} ({s.width}x{s.height})
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={onDetectScreens}
                    title="Refrescar Pantallas"
                    className={`p-2 border rounded transition-colors ${!hasDetailedScreens ? 'bg-obs-accent/20 border-obs-accent text-obs-accent animate-pulse' : 'bg-obs-bg border-obs-border text-obs-text hover:bg-obs-border'}`}
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              </div>

              {!hasDetailedScreens && (
                <div className="p-3 bg-obs-accent/10 border border-obs-accent/30 rounded text-[9px] text-obs-accent leading-tight space-y-3">
                  {isIframe ? (
                    <div className="space-y-3">
                      <p className="font-bold text-white">⚠️ Múltiples monitores no disponibles en iFrame.</p>
                      <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="w-full py-2 bg-obs-accent text-white rounded font-bold uppercase text-[9px] hover:bg-obs-accent/80 transition-all flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={12} />
                        Abrir Externo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-bold">Habilita "Window Management" para usar el segundo monitor.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between text-[10px] text-obs-text bg-black/40 p-2.5 rounded border border-white/5">
                <span className="text-obs-muted uppercase font-bold">Res. Target:</span>
                <span className="font-mono text-obs-accent">{selectedScreen ? `${selectedScreen.width}x${selectedScreen.height}` : '---'}</span>
              </div>

              <div className="space-y-2">
                <PropertyControl 
                  label="Escala Ancho"
                  value={externalScreenSettings.scalingW * 100}
                  displayValue={`${Math.round(externalScreenSettings.scalingW * 100)}%`}
                  min={50}
                  max={200}
                  step={1}
                  onChange={(val) => onUpdateExternalScreen({ ...externalScreenSettings, scalingW: val / 100 })}
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num)) onUpdateExternalScreen({ ...externalScreenSettings, scalingW: num });
                  }}
                />
                <PropertyControl 
                  label="Escala Alto"
                  value={externalScreenSettings.scalingH * 100}
                  displayValue={`${Math.round(externalScreenSettings.scalingH * 100)}%`}
                  min={50}
                  max={200}
                  step={1}
                  onChange={(val) => onUpdateExternalScreen({ ...externalScreenSettings, scalingH: val / 100 })}
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 100;
                    if (!isNaN(num)) onUpdateExternalScreen({ ...externalScreenSettings, scalingH: num });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Ajustes de Imagen</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Brillo"
                value={(externalScreenSettings.brightness ?? 1) * 50}
                displayValue={`${Math.round((externalScreenSettings.brightness ?? 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdateExternalScreen({ ...externalScreenSettings, brightness: val / 50 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 50;
                  if (!isNaN(num)) onUpdateExternalScreen({ ...externalScreenSettings, brightness: num });
                }}
              />
              <PropertyControl 
                label="Contraste"
                value={(externalScreenSettings.contrast ?? 1) * 50}
                displayValue={`${Math.round((externalScreenSettings.contrast ?? 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdateExternalScreen({ ...externalScreenSettings, contrast: val / 50 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 50;
                  if (!isNaN(num)) onUpdateExternalScreen({ ...externalScreenSettings, contrast: num });
                }}
              />
              <PropertyControl 
                label="Saturación"
                value={(externalScreenSettings.saturation ?? 1) * 50}
                displayValue={`${Math.round((externalScreenSettings.saturation ?? 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdateExternalScreen({ ...externalScreenSettings, saturation: val / 50 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 50;
                  if (!isNaN(num)) onUpdateExternalScreen({ ...externalScreenSettings, saturation: num });
                }}
              />
            </div>
          </div>

          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Balance de Color (RGB)</div>
            <div className="space-y-2">
              {['r', 'g', 'b'].map(channel => (
                <PropertyControl 
                  key={channel}
                  label={channel.toUpperCase()}
                  value={(externalScreenSettings.colorBalance ?? { r: 1, g: 1, b: 1 })[channel as keyof typeof externalScreenSettings.colorBalance] * 50}
                  displayValue={`${Math.round((externalScreenSettings.colorBalance ?? { r: 1, g: 1, b: 1 })[channel as keyof typeof externalScreenSettings.colorBalance] * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) => onUpdateExternalScreen({ 
                    ...externalScreenSettings, 
                    colorBalance: { ...(externalScreenSettings.colorBalance ?? { r: 1, g: 1, b: 1 }), [channel]: val / 50 } 
                  })}
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num)) onUpdateExternalScreen({ 
                      ...externalScreenSettings, 
                      colorBalance: { ...(externalScreenSettings.colorBalance ?? { r: 1, g: 1, b: 1 }), [channel]: num } 
                    });
                  }}
                />
              ))}
            </div>
          </div>

          <button 
            onClick={onLaunchOutput}
            className="w-full py-3 bg-obs-accent hover:bg-obs-accent/80 text-white text-[12px] font-black uppercase tracking-[0.2em] rounded shadow-[0_0_15px_rgba(0,170,255,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={14} />
            Lanzar Salida
          </button>
        </div>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-obs-muted gap-4 bg-obs-bg">
        <Search size={32} strokeWidth={1} />
        <span className="text-[10px] uppercase font-bold tracking-widest">Selecciona un elemento</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-obs-bg">
      <div className="px-3 py-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
        <div className="flex items-center gap-2">
          <Settings size={12} className="text-obs-accent" />
          <span className="text-[11px] font-semibold text-obs-text">Propiedades</span>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-obs-border hover:bg-obs-accent hover:text-white text-[9px] font-medium text-obs-text transition-colors"
        >
          <RotateCcw size={10} />
          Restablecer
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="space-y-4">
          {/* Composición */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Composición</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Máster"
                value={(selectedItem.master || 1) * 100}
                displayValue={`${Math.round((selectedItem.master || 1) * 100)}%`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { master: val / 100 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 100;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { master: num });
                }}
              />
              <PropertyControl 
                label="Velocidad"
                value={(selectedItem.speed || 1) * 100}
                displayValue={`${Math.round((selectedItem.speed || 1) * 100)}%`}
                min={10}
                max={500}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { speed: val / 100 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 100;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { speed: num });
                }}
              />
            </div>
          </div>

          {/* Audio */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Audio</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Volumen"
                value={(selectedItem.volume || 0) * 100}
                displayValue={`${Math.round((selectedItem.volume || 0) * 100)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { volume: val / 100 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 100;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { volume: num });
                }}
              />
              <PropertyControl 
                label="Panorama"
                value={((selectedItem.pan || 0) + 1) * 50}
                displayValue={`${Math.round(((selectedItem.pan || 0) + 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { pan: (val / 50) - 1 })}
                onInputChange={(val) => {
                  const num = (parseFloat(val) / 50) - 1;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { pan: num });
                }}
              />
            </div>
          </div>

          {/* Vídeo */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Vídeo</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Opacidad"
                value={(selectedItem.opacity || 1) * 100}
                displayValue={`${Math.round((selectedItem.opacity || 1) * 100)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { opacity: val / 100 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 100;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { opacity: num });
                }}
              />
            </div>
          </div>

          {/* Ajustes de Imagen */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Ajustes de Imagen</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Brillo"
                value={(selectedItem.brightness ?? 1) * 50}
                displayValue={`${Math.round((selectedItem.brightness ?? 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { brightness: val / 50 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 50;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { brightness: num });
                }}
              />
              <PropertyControl 
                label="Contraste"
                value={(selectedItem.contrast ?? 1) * 50}
                displayValue={`${Math.round((selectedItem.contrast ?? 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { contrast: val / 50 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 50;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { contrast: num });
                }}
              />
              <PropertyControl 
                label="Saturación"
                value={(selectedItem.saturation ?? 1) * 50}
                displayValue={`${Math.round((selectedItem.saturation ?? 1) * 50)}`}
                min={0}
                max={100}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { saturation: val / 50 })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 50;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { saturation: num });
                }}
              />
            </div>
          </div>

          {/* Balance de Color (RGB) */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Balance de Color (RGB)</div>
            <div className="space-y-2">
              {['r', 'g', 'b'].map(channel => (
                <PropertyControl 
                  key={channel}
                  label={channel.toUpperCase()}
                  value={(selectedItem.colorBalance ?? { r: 1, g: 1, b: 1 })[channel as keyof typeof selectedItem.colorBalance] * 50}
                  displayValue={`${Math.round((selectedItem.colorBalance ?? { r: 1, g: 1, b: 1 })[channel as keyof typeof selectedItem.colorBalance] * 50)}`}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) => onUpdate(selectedItem.id, { 
                    colorBalance: { ...(selectedItem.colorBalance ?? { r: 1, g: 1, b: 1 }), [channel]: val / 50 } 
                  })}
                  onInputChange={(val) => {
                    const num = parseFloat(val) / 50;
                    if (!isNaN(num)) onUpdate(selectedItem.id, { 
                      colorBalance: { ...(selectedItem.colorBalance ?? { r: 1, g: 1, b: 1 }), [channel]: num } 
                    });
                  }}
                />
              ))}
            </div>
          </div>

          {/* CrossFader */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">CrossFader</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-obs-muted uppercase font-bold">Blend Mode</label>
                <select 
                  value={selectedItem.blendMode}
                  onChange={(e) => onUpdate(selectedItem.id, { blendMode: e.target.value })}
                  className="bg-obs-bg border border-obs-border rounded px-2 py-0.5 text-[10px] text-obs-text focus:border-obs-accent outline-none"
                >
                  <option value="Alpha">Alpha</option>
                  <option value="Add">Add</option>
                  <option value="Subtract">Subtract</option>
                  <option value="Multiply">Multiply</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-obs-muted uppercase font-bold">Comportamiento</label>
                <select 
                  value={selectedItem.behavior}
                  onChange={(e) => onUpdate(selectedItem.id, { behavior: e.target.value })}
                  className="bg-obs-bg border border-obs-border rounded px-2 py-0.5 text-[10px] text-obs-text focus:border-obs-accent outline-none"
                >
                  <option value="Cortar">Cortar</option>
                  <option value="Mezclar">Mezclar</option>
                  <option value="Deslizar">Deslizar</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-obs-muted uppercase font-bold">Curva</label>
                <select 
                  value={selectedItem.curve}
                  onChange={(e) => onUpdate(selectedItem.id, { curve: e.target.value })}
                  className="bg-obs-bg border border-obs-border rounded px-2 py-0.5 text-[10px] text-obs-text focus:border-obs-accent outline-none"
                >
                  <option value="Lineal">Lineal</option>
                  <option value="Seno">Seno</option>
                  <option value="Exponencial">Exponencial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transformar */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Transformar</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Posición X"
                value={selectedItem.transform.x}
                displayValue={Math.round(selectedItem.transform.x).toString()}
                min={-1920}
                max={1920}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, x: val } })}
                onInputChange={(val) => {
                  const num = parseFloat(val);
                  if (!isNaN(num)) onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, x: num } });
                }}
              />
              <PropertyControl 
                label="Posición Y"
                value={selectedItem.transform.y}
                displayValue={Math.round(selectedItem.transform.y).toString()}
                min={-1080}
                max={1080}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, y: val } })}
                onInputChange={(val) => {
                  const num = parseFloat(val);
                  if (!isNaN(num)) onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, y: num } });
                }}
              />
            </div>
          </div>

          {/* Escala */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Escala</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Escala Ancho"
                value={selectedItem.transform.scaleW * 100}
                displayValue={`${Math.round(selectedItem.transform.scaleW * 100)}%`}
                min={10}
                max={1000}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, scaleW: val / 100 } })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 100;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, scaleW: num } });
                }}
              />
              <PropertyControl 
                label="Escala Alto"
                value={selectedItem.transform.scaleH * 100}
                displayValue={`${Math.round(selectedItem.transform.scaleH * 100)}%`}
                min={10}
                max={1000}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, scaleH: val / 100 } })}
                onInputChange={(val) => {
                  const num = parseFloat(val) / 100;
                  if (!isNaN(num)) onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, scaleH: num } });
                }}
              />
            </div>
          </div>

          {/* Rotación */}
          <div className="bg-obs-surface p-3 rounded border border-obs-border space-y-4">
            <div className="text-[10px] font-bold uppercase text-obs-muted border-b border-obs-border pb-2">Rotación</div>
            <div className="space-y-2">
              <PropertyControl 
                label="Rotación"
                value={selectedItem.transform.rotation}
                displayValue={`${Math.round(selectedItem.transform.rotation)}°`}
                min={0}
                max={360}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, rotation: val } })}
                onInputChange={(val) => {
                  const num = parseFloat(val);
                  if (!isNaN(num)) onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, rotation: num } });
                }}
              />
              <PropertyControl 
                label="Rotación X"
                value={selectedItem.transform.rotationX}
                displayValue={`${Math.round(selectedItem.transform.rotationX)}°`}
                min={0}
                max={360}
                step={1}
                onChange={(val) => onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, rotationX: val } })}
                onInputChange={(val) => {
                  const num = parseFloat(val);
                  if (!isNaN(num)) onUpdate(selectedItem.id, { transform: { ...selectedItem.transform, rotationX: num } });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const Library = React.memo(({ onAddClip, isDarkMode }: { onAddClip: (files: File[]) => void, isDarkMode: boolean }) => {
  const [libraryFiles, setLibraryFiles] = useState<{ name: string, type: string, url: string, file: File }[]>([]);
  const [selectedLibraryUrls, setSelectedLibraryUrls] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<{ name: string, active: boolean }[]>([
    { name: 'Todos', active: true },
    { name: 'Videos', active: false },
    { name: 'Imágenes', active: false },
    { name: 'Generadores', active: false }
  ]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleLibraryLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map(f => ({
      name: f.name,
      type: f.type,
      url: URL.createObjectURL(f),
      file: f
    }));
    setLibraryFiles(prev => [...prev, ...newFiles]);
  };

  const filteredFiles = libraryFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = (url: string, multi: boolean) => {
    setSelectedLibraryUrls(prev => {
      const next = new Set(multi ? prev : []);
      if (next.has(url)) {
        if (multi) next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-obs-border bg-obs-bg">
      <div className="p-2 border-b border-obs-border flex justify-between items-center bg-obs-surface">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-obs-accent" />
          <span className="text-[10px] text-obs-muted uppercase font-bold tracking-wider">Gestión de Contenidos</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-1 text-obs-muted hover:text-obs-text transition-colors"
            title={viewMode === 'list' ? 'Vista Cuadrícula' : 'Vista Lista'}
          >
            {viewMode === 'list' ? <Grid size={12} /> : <List size={12} />}
          </button>
          <button 
            onClick={() => libraryInputRef.current?.click()}
            className="p-1 text-obs-accent hover:scale-110 transition-transform"
            title="Agregar archivos"
          >
            <Plus size={14} />
          </button>
        </div>
        <input 
          type="file" 
          ref={libraryInputRef} 
          className="hidden" 
          accept="video/*,image/*" 
          multiple 
          onChange={handleLibraryLoad}
        />
      </div>

      {/* Folder Simulation */}
      <div className="flex gap-1 p-1 bg-obs-surface/50 border-b border-obs-border overflow-x-auto scrollbar-hide">
        {folders.map(f => (
          <button 
            key={f.name}
            onClick={() => setFolders(prev => prev.map(folder => ({ ...folder, active: folder.name === f.name })))}
            className={`px-2 py-1 rounded text-[9px] font-bold transition-colors whitespace-nowrap ${f.active ? 'bg-obs-accent text-white' : 'text-obs-muted hover:bg-obs-surface'}`}
          >
            {f.name}
          </button>
        ))}
        <button 
          onClick={() => {
            const name = prompt('Nombre de la carpeta:');
            if (name) setFolders([...folders, { name, active: false }]);
          }}
          className="px-2 py-1 rounded text-[9px] font-bold bg-obs-surface text-obs-accent hover:bg-obs-accent hover:text-white transition-colors whitespace-nowrap"
        >
          + Carpeta
        </button>
      </div>

      <div className="p-2 border-b border-obs-border bg-obs-surface">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-obs-muted" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..." 
            className="w-full bg-obs-bg border border-obs-border rounded px-7 py-1 text-[10px] text-obs-text focus:outline-none focus:border-obs-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-obs-muted gap-2 opacity-30">
            <Film size={32} strokeWidth={1} />
            <span className="text-[9px] uppercase font-bold tracking-widest">Biblioteca Vacía</span>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "space-y-1"}>
            {filteredFiles.map((file, i) => (
              <div 
                key={i}
                draggable
                onDragStart={(e) => {
                  const selectedFiles = libraryFiles.filter(f => selectedLibraryUrls.has(f.url));
                  const filesToDrag = selectedFiles.length > 0 && selectedLibraryUrls.has(file.url) 
                    ? selectedFiles 
                    : [file];
                  
                  e.dataTransfer.setData('libraryFiles', JSON.stringify(filesToDrag.map(f => ({
                    name: f.name,
                    url: f.url,
                    type: f.type
                  }))));
                }}
                onClick={(e) => toggleSelection(file.url, e.ctrlKey || e.metaKey || e.shiftKey)}
                onDoubleClick={() => onAddClip([file.file])}
                className={`group relative flex flex-col rounded transition-colors cursor-pointer text-obs-text border ${selectedLibraryUrls.has(file.url) ? 'bg-obs-accent/10 border-obs-accent' : 'hover:bg-obs-surface border-transparent'}`}
              >
                <div className={`${viewMode === 'grid' ? 'aspect-video w-full' : 'w-12 h-8'} bg-black rounded-sm overflow-hidden flex-shrink-0 relative`}>
                  {file.type.startsWith('video') ? (
                    <video src={file.url} className="w-full h-full object-cover opacity-80" muted />
                  ) : (
                    <img src={file.url} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                  )}
                  {viewMode === 'grid' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                      <div className="text-[7px] truncate text-white uppercase font-bold">{file.type.split('/')[1]}</div>
                    </div>
                  )}
                </div>
                {viewMode === 'list' ? (
                  <div className="flex-1 min-w-0 px-2 flex items-center justify-between">
                    <div className="truncate">
                      <div className="text-[10px] truncate leading-tight">{file.name}</div>
                      <div className="text-[8px] text-obs-muted uppercase">{file.type.split('/')[1]}</div>
                    </div>
                    <Plus size={10} className="opacity-0 group-hover:opacity-100 text-obs-accent transition-opacity" />
                  </div>
                ) : (
                  <div className="p-1">
                    <div className="text-[9px] truncate leading-tight font-medium">{file.name}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Library Preview Window */}
      <div className="h-48 border-t border-obs-border bg-black flex flex-col">
        <div className="px-2 py-1 bg-obs-surface border-b border-obs-border flex justify-between items-center">
          <span className="text-[9px] font-bold text-obs-muted uppercase">Vista Previa</span>
          {selectedLibraryUrls.size === 1 && (
            <span className="text-[8px] text-obs-accent truncate max-w-[120px]">
              {libraryFiles.find(f => selectedLibraryUrls.has(f.url))?.name}
            </span>
          )}
          {selectedLibraryUrls.size > 1 && (
            <span className="text-[8px] text-obs-accent truncate max-w-[120px]">
              {selectedLibraryUrls.size} archivos seleccionados
            </span>
          )}
        </div>
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#050505]">
          {selectedLibraryUrls.size === 1 ? (() => {
            const selectedFile = libraryFiles.find(f => selectedLibraryUrls.has(f.url));
            if (!selectedFile) return null;
            return selectedFile.type.startsWith('video') ? (
              <video 
                key={selectedFile.url}
                src={selectedFile.url} 
                className="w-full h-full object-contain" 
                autoPlay 
                muted 
                loop 
              />
            ) : (
              <img src={selectedFile.url} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            );
          })() : selectedLibraryUrls.size > 1 ? (
            <div className="text-obs-muted opacity-20 flex flex-col items-center gap-1">
              <Layers size={24} strokeWidth={1} />
              <span className="text-[8px] uppercase font-bold tracking-widest">{selectedLibraryUrls.size} archivos seleccionados</span>
            </div>
          ) : (
            <div className="text-obs-muted opacity-20 flex flex-col items-center gap-1">
              <Eye size={24} strokeWidth={1} />
              <span className="text-[8px] uppercase font-bold tracking-widest">Selecciona un archivo</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const Sidebar = React.memo(({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className="flex flex-col h-full bg-obs-bg text-obs-text">
    <div className="p-3 border-b border-obs-border bg-obs-surface">
      <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">Controles</span>
    </div>
    <div className="flex-1 p-4 flex flex-col gap-6 overflow-y-auto">
      <div className="space-y-4">
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">Iniciar Transmisión</button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">Iniciar Grabación</button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">Cámara Virtual</button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">Modo Estudio</button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors">Configuración</button>
        <button className="w-full py-2 bg-obs-surface border border-obs-border rounded text-[11px] font-semibold hover:bg-obs-border transition-colors text-red-500">Salir</button>
      </div>
      
      <div className="mt-auto space-y-4 pt-4 border-t border-obs-border">
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-bold text-obs-muted">
            <span>CPU</span>
            <span className="text-obs-accent">12.4%</span>
          </div>
          <div className="h-1 bg-obs-surface rounded-full overflow-hidden">
            <div className="w-[12%] h-full bg-obs-accent" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[9px] font-bold text-obs-muted">
            <span>Disco</span>
            <span className="text-obs-accent">45.2GB Libre</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

const PlaylistsSection = React.memo(({ 
  playlists, 
  onAddPlaylist, 
  onDropOnPlaylist, 
  onSelectPlaylist,
  onSetEditingPlaylist,
  selectedPlaylistId,
  isDarkMode,
  isHorizontal = false
}: { 
  playlists: Playlist[], 
  onAddPlaylist: () => void, 
  onDropOnPlaylist: (e: React.DragEvent, playlistId?: string) => void, 
  onSelectPlaylist: (playlist: Playlist) => void,
  onSetEditingPlaylist: (id: string) => void,
  selectedPlaylistId: string | null,
  isDarkMode: boolean,
  isHorizontal?: boolean
}) => {
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className={`h-full flex ${isHorizontal ? 'flex-row' : 'flex-col'} bg-obs-bg`}>
      <div className={`${isHorizontal ? 'w-32 border-r' : 'w-full border-b'} px-3 py-1.5 border-obs-border flex ${isHorizontal ? 'flex-col' : 'flex-row'} justify-between items-center bg-obs-surface`}>
        <div className="flex items-center gap-2">
          <Layers size={12} className="text-obs-accent" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">Playlists</span>
        </div>
        <button 
          onClick={onAddPlaylist}
          disabled={playlists.length >= 8}
          className="p-1 text-obs-accent hover:scale-110 transition-transform disabled:opacity-30"
          title="Agregar Playlist"
        >
          <Plus size={14} />
        </button>
      </div>
      
      {isHorizontal ? (
        <div className="flex-1 flex overflow-hidden">
          {/* List of Playlists */}
          <div className="w-48 border-r border-obs-border overflow-y-auto p-1 space-y-1 bg-black/10">
            {playlists.map(playlist => (
              <div 
                key={playlist.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('playlistId', playlist.id);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropOnPlaylist(e, playlist.id)}
                onClick={() => onSelectPlaylist(playlist)}
                className={`px-3 py-2 rounded cursor-pointer transition-all border ${
                  selectedPlaylistId === playlist.id 
                    ? 'bg-obs-accent border-obs-accent text-white shadow-lg shadow-obs-accent/20' 
                    : 'bg-obs-surface border-obs-border text-obs-text hover:border-obs-muted'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate text-[10px] font-bold uppercase tracking-tight">{playlist.name}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetEditingPlaylist(playlist.id);
                      }}
                      className={`p-2 rounded hover:bg-black/20 transition-colors ${selectedPlaylistId === playlist.id ? 'text-white' : 'text-obs-muted'}`}
                    >
                      <Settings size={18} />
                    </button>
                    <span className="text-[8px] px-1 rounded bg-black/40 text-obs-muted font-mono">{playlist.clips.length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clips in Selected Playlist */}
          {selectedPlaylist ? (
            <div 
              className="flex-1 overflow-x-auto p-2 flex gap-2 bg-black/5"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropOnPlaylist(e, selectedPlaylist.id)}
            >
              {selectedPlaylist.clips.length > 0 ? (
                selectedPlaylist.clips.map((clip, idx) => (
                  <div 
                    key={`${selectedPlaylist.id}-${clip.id}-${idx}`}
                    className="flex-shrink-0 w-36 aspect-video rounded border border-obs-border bg-obs-surface overflow-hidden relative group"
                  >
                    {clip.type === 'video' ? (
                      <video src={clip.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={clip.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white bg-obs-accent px-2 py-1 rounded shadow-lg">Clip {idx + 1}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                      <span className="text-[8px] text-white truncate block">{clip.name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-obs-border rounded m-2 opacity-30">
                  <Layers size={24} className="mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Playlist Vacía</span>
                  <span className="text-[8px]">Arrastra clips aquí para empezar</span>
                </div>
              )}
            </div>
          ) : (
              <div 
                className="flex-1 flex items-center justify-center opacity-30 border-2 border-dashed border-obs-border rounded-lg m-4 hover:border-obs-accent hover:bg-obs-accent/5 transition-all group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (playlists.length > 0) {
                    onDropOnPlaylist(e, playlists[0].id);
                    onSelectPlaylist(playlists[0]);
                  } else {
                    onDropOnPlaylist(e);
                  }
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Plus size={32} className="text-obs-accent group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Selecciona una Playlist</span>
                  <span className="text-[8px] font-medium text-obs-muted">O arrastra contenido aquí para empezar</span>
                </div>
              </div>
            )}
          </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {playlists.map(playlist => (
            <div 
              key={playlist.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('playlistId', playlist.id);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropOnPlaylist(e, playlist.id)}
              onClick={() => onSelectPlaylist(playlist)}
              className={`px-3 py-1.5 rounded cursor-pointer transition-colors text-[11px] font-medium flex justify-between items-center ${
                selectedPlaylistId === playlist.id 
                  ? 'bg-obs-accent text-white' 
                  : 'text-obs-text hover:bg-obs-surface'
              }`}
            >
              <span className="truncate">{playlist.name}</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetEditingPlaylist(playlist.id);
                  }}
                  className={`p-1 rounded hover:bg-black/20 transition-colors ${selectedPlaylistId === playlist.id ? 'text-white' : 'text-obs-muted'}`}
                >
                  <Settings size={16} />
                </button>
                <span className={`text-[8px] px-1 rounded ${selectedPlaylistId === playlist.id ? 'bg-white/20' : 'bg-obs-surface text-obs-muted'}`}>
                  {playlist.clips.length}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const GridSection = React.memo(({ 
  currentDeck, 
  onSetDeck, 
  deckClips, 
  onSelectClip, 
  onDragStart, 
  isDarkMode,
  selectedClipId
}: { 
  currentDeck: string, 
  onSetDeck: (d: string) => void, 
  deckClips: Record<string, Clip[]>, 
  onSelectClip: (clip: Clip) => void, 
  onDragStart: (e: React.DragEvent, clip: Clip) => void, 
  isDarkMode: boolean,
  selectedClipId: string | null
}) => (
  <div className="h-full flex flex-col bg-obs-bg">
    <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
      <div className="flex items-center gap-2">
        <Grid size={12} className="text-obs-accent" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">Fuentes</span>
      </div>
      <div className="flex gap-2">
        {['Deck 1', 'Deck 2', 'Deck 3'].map(deck => (
          <button 
            key={deck} 
            onClick={() => onSetDeck(deck)}
            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${deck === currentDeck ? 'bg-obs-accent text-white' : 'text-obs-muted hover:text-obs-text'}`}
          >
            {deck}
          </button>
        ))}
      </div>
    </div>
    
    <div className="flex-1 overflow-y-auto p-4">
      {deckClips[currentDeck].length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-obs-muted opacity-30 gap-2">
          <Plus size={24} strokeWidth={1} />
          <span className="text-[9px] uppercase font-bold tracking-widest">Agrega fuentes a esta baraja</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {deckClips[currentDeck].map(clip => (
            <ClipCard 
              key={clip.id} 
              clip={clip} 
              onSelect={() => onSelectClip(clip)}
              onDragStart={(e) => onDragStart(e, clip)}
              isDarkMode={isDarkMode}
              isSelected={selectedClipId === clip.id}
            />
          ))}
        </div>
      )}
    </div>
  </div>
));
;

const TransitionsSection = React.memo(({ 
  duration, 
  onDurationChange, 
  onTake,
  transitionType,
  onTransitionTypeChange
}: { 
  duration: number, 
  onDurationChange: (val: number) => void, 
  onTake: (type?: 'fade' | 'wipe' | 'slide' | 'cut') => void,
  transitionType: 'fade' | 'wipe' | 'slide',
  onTransitionTypeChange: (type: 'fade' | 'wipe' | 'slide') => void
}) => (
  <div className="flex flex-col h-full bg-obs-bg border-r border-obs-border">
    <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
      <div className="flex items-center gap-2">
        <Zap size={12} className="text-obs-accent" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">Transiciones</span>
      </div>
    </div>
    <div className="flex-1 p-4 flex flex-col gap-4">
      <div className="space-y-2">
        <span className="text-[9px] font-bold text-obs-muted uppercase">Transición</span>
        <select 
          value={transitionType}
          onChange={(e) => onTransitionTypeChange(e.target.value as any)}
          className="w-full bg-obs-surface border border-obs-border rounded text-[10px] px-2 py-1.5 outline-none focus:border-obs-accent text-obs-text"
        >
          <option value="fade">Desvanecimiento</option>
          <option value="wipe">Barrido</option>
          <option value="slide">Deslizar</option>
        </select>
      </div>
      <div className="space-y-2">
        <span className="text-[9px] font-bold text-obs-muted uppercase">Duración (ms)</span>
        <div className="flex items-center gap-2 bg-obs-surface border border-obs-border rounded px-2 py-1.5">
          <input 
            type="number" 
            min="100" 
            max="5000" 
            step="100"
            value={duration}
            onChange={(e) => onDurationChange(parseFloat(e.target.value))}
            className="w-full bg-transparent text-[10px] text-obs-accent text-center focus:outline-none"
          />
          <span className="text-[9px] text-obs-muted">ms</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button 
          onClick={() => onTake()}
          className="py-2 bg-obs-surface border border-obs-border rounded text-[10px] font-bold hover:bg-obs-accent hover:text-white transition-colors"
        >
          Transición
        </button>
        <button 
          onClick={() => onTake('cut')}
          className="py-2 bg-obs-surface border border-obs-border rounded text-[10px] font-bold hover:bg-obs-accent hover:text-white transition-colors"
        >
          Corte
        </button>
      </div>
    </div>
  </div>
));

const MixerSection = React.memo(({ 
  previewLevel, 
  programLevel, 
  previewVolume, 
  programVolume,
  masterVolume,
  usbInVolume,
  usbOutVolume,
  onPreviewVolumeChange, 
  onProgramVolumeChange,
  onMasterVolumeChange,
  onUsbInVolumeChange,
  onUsbOutVolumeChange
}: { 
  previewLevel: number, 
  programLevel: number,
  previewVolume: number,
  programVolume: number,
  masterVolume: number,
  usbInVolume: number,
  usbOutVolume: number,
  onPreviewVolumeChange: (v: number) => void,
  onProgramVolumeChange: (v: number) => void,
  onMasterVolumeChange: (v: number) => void,
  onUsbInVolumeChange: (v: number) => void,
  onUsbOutVolumeChange: (v: number) => void
}) => (
  <div className="flex flex-col h-full bg-obs-bg border-r border-obs-border">
    <div className="px-3 py-1.5 border-b border-obs-border flex justify-between items-center bg-obs-surface">
      <div className="flex items-center gap-2">
        <Volume2 size={12} className="text-obs-accent" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-obs-muted">Mezclador de Audio</span>
      </div>
      <button className="p-1 text-obs-muted hover:text-obs-text transition-colors">
        <Settings size={12} />
      </button>
    </div>
    <div className="flex-1 p-3 flex gap-4 overflow-x-auto justify-start">
      {[
        { name: 'Master', level: programLevel, volume: masterVolume, onChange: onMasterVolumeChange },
        { name: 'Programa', level: programLevel, volume: programVolume, onChange: onProgramVolumeChange },
        { name: 'USB IN', level: 0, volume: usbInVolume, onChange: onUsbInVolumeChange },
        { name: 'USB Out', level: 0, volume: usbOutVolume, onChange: onUsbOutVolumeChange }
      ].map((source, i) => (
        <div key={source.name} className="flex gap-2 h-full items-end min-w-[60px]">
          {/* VU Meter */}
          <div className="w-1.5 h-full max-h-[120px] bg-black/40 rounded-sm border border-white/5 relative overflow-hidden flex flex-col justify-end">
            <div 
              className="w-full bg-green-500/50 border-t border-green-400 transition-all duration-75" 
              style={{ 
                height: `${source.level * 100}%`,
                boxShadow: '0 0-10px rgba(34, 197, 94, 0.3)' 
              }}
            />
          </div>
          
          {/* Fader */}
          <div className="flex flex-col items-center gap-1.5 h-full">
            <div 
              className="w-4 h-full max-h-[120px] relative bg-black/60 rounded-sm border border-white/5 cursor-ns-resize overflow-hidden group"
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const updateValue = (clientY: number) => {
                  const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
                  const percent = 1 - (y / rect.height);
                  const newValue = Math.max(0, Math.min(1, percent));
                  source.onChange(newValue);
                };
                const handleMove = (moveEvent: MouseEvent) => updateValue(moveEvent.clientY);
                const handleUp = () => {
                  window.removeEventListener('mousemove', handleMove);
                  window.removeEventListener('mouseup', handleUp);
                };
                window.addEventListener('mousemove', handleMove);
                window.addEventListener('mouseup', handleUp);
                updateValue(e.clientY);
              }}
            >
              <div 
                className="absolute inset-x-0 bottom-0 bg-obs-accent/30 transition-all duration-75"
                style={{ height: `${source.volume * 100}%` }}
              />
              <div 
                className="absolute inset-x-0 bg-obs-accent h-1 shadow-[0_0_10px_rgba(0,170,255,0.8)] transition-all duration-75"
                style={{ bottom: `calc(${source.volume * 100}% - 2px)` }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] text-obs-muted uppercase font-bold tracking-tighter leading-none mb-0.5">{source.name}</span>
              <span className="text-[8px] font-mono text-obs-accent leading-none">{(source.volume * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
));

// --- Main App ---

export default function App() {
  const [clips, setClips] = useState<Clip[]>(MOCK_CLIPS);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: 'playlist-1', name: 'Playlist 1', clips: [], opacity: 1, isVisible: true, transform: { ...DEFAULT_TRANSFORM }, mask: 'none', master: 1, speed: 1, volume: 1, pan: 0, blendMode: 'Alpha', behavior: 'Cortar', curve: 'Lineal', filter: 'none', brightness: 1, contrast: 1, saturation: 1, colorBalance: { r: 1, g: 1, b: 1 } },
    { id: 'playlist-2', name: 'Playlist 2', clips: [], opacity: 1, isVisible: true, transform: { ...DEFAULT_TRANSFORM }, mask: 'none', master: 1, speed: 1, volume: 1, pan: 0, blendMode: 'Alpha', behavior: 'Cortar', curve: 'Lineal', filter: 'none', brightness: 1, contrast: 1, saturation: 1, colorBalance: { r: 1, g: 1, b: 1 } },
  ]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'clip' | 'playlist' | 'program' | null>(null);
  const [previewVolume, setPreviewVolume] = useState(1);
  const [programVolume, setProgramVolume] = useState(1);
  const [masterVolume, setMasterVolume] = useState(1);
  const [usbInVolume, setUsbInVolume] = useState(0.8);
  const [usbOutVolume, setUsbOutVolume] = useState(0.8);
  const [externalScreenSettings, setExternalScreenSettings] = useState<ExternalScreenSettings>({
    resolution: '1920x1080',
    width: 1920,
    height: 1080,
    scalingW: 1,
    scalingH: 1,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 6500,
    colorBalance: { r: 1, g: 1, b: 1 },
    selectedScreenId: null
  });
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);
  const [programClipId, setProgramClipId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isPixelMapOpen, setIsPixelMapOpen] = useState(false);
  const [slices, setSlices] = useState([
    { id: 'slice-1', name: 'Main Screen', x: 0, y: 0, width: 1920, height: 1080, outputX: 0, outputY: 0, outputWidth: 1920, outputHeight: 1080 },
  ]);
  const [crossfaderValue, setCrossfaderValue] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(1000);
  const [transitionType, setTransitionType] = useState<'fade' | 'wipe' | 'slide'>('fade');
  const [externalScreens, setExternalScreens] = useState<Screen[]>([]);
  const [hasDetailedScreens, setHasDetailedScreens] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const outputWindowRef = useRef<Window | null>(null);
  const outputChannel = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    outputChannel.current = new BroadcastChannel('lumina-output');
    
    return () => {
      outputChannel.current?.close();
    };
  }, []);

  // Sync state to output window
  useEffect(() => {
    if (outputChannel.current) {
      outputChannel.current.postMessage({
        type: 'SYNC_STATE',
        payload: {
          programClipId,
          previewClipId,
          clips,
          crossfaderValue,
          externalScreenSettings,
          isLive,
          isTransmitting,
          programVolume,
          transitionType
        }
      });
    }
  }, [programClipId, previewClipId, clips, crossfaderValue, externalScreenSettings, isLive, isTransmitting, programVolume, transitionType]);

  // Screen Detection Logic
  const detectScreens = async (requestPermission = false) => {
    try {
      console.log("Detectando pantallas...");
      
      // Intentar detección nativa vía Bridge Python (Puerto 3001)
      try {
        const response = await fetch('http://localhost:3001/monitors');
        if (response.ok) {
          const nativeScreens = await response.json();
          if (nativeScreens && nativeScreens.length > 0) {
            console.log("Pantallas detectadas vía Native Bridge:", nativeScreens);
            setExternalScreens(nativeScreens);
            setHasDetailedScreens(true);
            if (!externalScreenSettings.selectedScreenId) {
              setExternalScreenSettings(prev => ({ ...prev, selectedScreenId: nativeScreens[0].id }));
            }
            return; // Éxito con detección nativa
          }
        }
      } catch (e) {
        console.log("Native Bridge no disponible, usando APIs de navegador");
      }

      // Check if in iframe
      setIsIframe(window.self !== window.top);

      // Check permission status if API exists
      if ('permissions' in navigator) {
        try {
          // @ts-ignore
          const status = await navigator.permissions.query({ name: 'window-management' });
          setPermissionStatus(status.state);
          status.onchange = () => setPermissionStatus(status.state);
        } catch (e) {
          // Fallback to 'window-placement' if 'window-management' is not supported
          try {
            // @ts-ignore
            const status = await navigator.permissions.query({ name: 'window-placement' });
            setPermissionStatus(status.state);
            status.onchange = () => setPermissionStatus(status.state);
          } catch (e2) {}
        }
      }

      if ('getScreenDetails' in window) {
        // @ts-ignore
        const details = await window.getScreenDetails();
        console.log("Pantallas detectadas (detalladas):", details.screens);
        const screens = details.screens.map((s: any, index: number) => ({
          id: s.id || `screen-${index}`,
          name: s.label || `Pantalla ${index + 1}`,
          isActive: true,
          width: s.width,
          height: s.height,
          left: s.left,
          top: s.top,
          isPrimary: s.isPrimary
        }));
        setExternalScreens(screens);
        setHasDetailedScreens(true);
        if (!externalScreenSettings.selectedScreenId && screens.length > 0) {
          setExternalScreenSettings(prev => ({ ...prev, selectedScreenId: screens[0].id }));
        }
      } else {
        throw new Error("API no soportada");
      }
    } catch (err) {
      console.warn("Error detectando pantallas detalladas, usando fallback:", err);
      setHasDetailedScreens(false);
      // Fallback to basic screen info
      const fallback = [{
        id: 'primary',
        name: 'Pantalla Principal',
        isActive: true,
        width: window.screen.width,
        height: window.screen.height,
        isPrimary: true,
        left: 0,
        top: 0
      }];
      console.log("Usando fallback de pantalla:", fallback);
      setExternalScreens(fallback);
      if (!externalScreenSettings.selectedScreenId) {
        setExternalScreenSettings(prev => ({ ...prev, selectedScreenId: 'primary' }));
      }
    }
  };

  useEffect(() => {
    // Initial silent attempt
    detectScreens();
    
    // Listen for screen changes if supported
    if ('getScreenDetails' in window) {
      // @ts-ignore
      window.getScreenDetails().then(details => {
        details.addEventListener('screenschange', () => detectScreens());
      }).catch(() => {});
    }
  }, []);

  const handleLaunchOutput = () => {
    const selectedScreen = externalScreens.find(s => s.id === externalScreenSettings.selectedScreenId);
    
    // Construct the URL
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'output');
    
    // Features for a clean output window
    // Scrollbars=no and status=no are important for a "clean" look
    let features = 'menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no,popup=yes';
    
    // Use the screen's coordinates and dimensions if available
    if (selectedScreen && hasDetailedScreens) {
      features += `,left=${selectedScreen.left},top=${selectedScreen.top},width=${selectedScreen.width},height=${selectedScreen.height}`;
    } else {
      // Default to a reasonable size and position
      features += `,width=1280,height=720,left=100,top=100`;
    }

    // Try to open the output window
    try {
      const win = window.open(url.toString(), 'LuminaOutput', features);
      outputWindowRef.current = win;

      if (win) {
        win.focus();
        
        // Ensure transmission is ON when launching output manually
        setIsTransmitting(true);
        
        // Initial sync
        setTimeout(() => {
          outputChannel.current?.postMessage({
            type: 'SYNC_STATE',
            payload: {
              programClipId,
              previewClipId,
              clips,
              crossfaderValue,
              externalScreenSettings,
              isLive,
              isTransmitting: true, // Force it to be active
              programVolume,
              transitionType
            }
          });
        }, 500);
      } else {
        alert("El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.");
      }
    } catch (err) {
      console.error("Error al lanzar salida:", err);
    }
  };
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [currentDeck, setCurrentDeck] = useState('Deck 1');
  const [previewPlaylistState, setPreviewPlaylistState] = useState<{ id: string, index: number } | null>(null);
  const [programPlaylistState, setProgramPlaylistState] = useState<{ id: string, index: number } | null>(null);
  const [deckClips, setDeckClips] = useState<Record<string, Clip[]>>({
    'Deck 1': [],
    'Deck 2': [],
    'Deck 3': [],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddClips = (files: File[]) => {
    const newClips: Clip[] = files.map((file, index) => ({
      id: `clip-${Date.now()}-${index}`,
      name: file.name,
      thumbnail: URL.createObjectURL(file),
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      status: 'idle',
      transform: { ...DEFAULT_TRANSFORM },
      mask: 'none',
      opacity: 1,
      master: 1,
      speed: 1,
      volume: 1,
      pan: 0,
      blendMode: 'Alpha',
      behavior: 'Cortar',
      curve: 'Lineal',
      filter: 'none',
      brightness: 1,
      contrast: 1,
      saturation: 1,
      colorBalance: { r: 1, g: 1, b: 1 },
      isPlaying: true,
      loop: true
    }));
    setClips(prev => [...prev, ...newClips]);
    setDeckClips(prev => ({
      ...prev,
      [currentDeck]: [...prev[currentDeck], ...newClips]
    }));
  };

  const [previewLevel, setPreviewLevel] = useState(0);
  const [programLevel, setProgramLevel] = useState(0);

  const handleUpdateItem = (id: string, updates: any) => {
    if (selectedItemType === 'clip') {
      setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      setDeckClips(prev => {
        const newDecks = { ...prev };
        Object.keys(newDecks).forEach(deck => {
          newDecks[deck] = newDecks[deck].map(c => c.id === id ? { ...c, ...updates } : c);
        });
        return newDecks;
      });
      setPlaylists(prev => prev.map(p => ({
        ...p,
        clips: p.clips.map(c => c.id === id ? { ...c, ...updates } : c)
      })));
    } else if (selectedItemType === 'playlist') {
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  };

  const handleSelectClip = (clip: Clip) => {
    setSelectedItemId(clip.id);
    setSelectedItemType('clip');
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    setSelectedItemId(playlist.id);
    setSelectedItemType('playlist');
  };

  const handlePreviewClip = (clip: Clip) => {
    setPreviewClipId(clip.id);
    setPreviewPlaylistState(null);
  };

  const handlePreviewPlaylist = (playlist: Playlist) => {
    if (playlist.clips.length > 0) {
      setPreviewPlaylistState({ id: playlist.id, index: 0 });
      setPreviewClipId(playlist.clips[0].id);
    }
  };

  const handleTake = (type?: 'fade' | 'wipe' | 'slide' | 'cut') => {
    const tType = type || transitionType;
    
    if (previewClipId && crossfaderValue === 0) {
      if (tType === 'cut') {
        setProgramClipId(previewClipId);
        setProgramPlaylistState(previewPlaylistState);
        return;
      }

      // Start transition
      animate(0, 100, {
        duration: transitionDuration / 1000,
        ease: "easeInOut",
        onUpdate: (latest) => setCrossfaderValue(latest),
        onComplete: () => {
          // Perform swap
          setProgramClipId(previewClipId);
          setProgramPlaylistState(previewPlaylistState);
          // Wait a tiny bit to ensure the new program layer is rendered before resetting crossfader
          setTimeout(() => {
            setCrossfaderValue(0);
          }, 50);
        }
      });
    }
  };

  const handlePreviewNext = () => {
    if (previewPlaylistState) {
      const playlist = playlists.find(p => p.id === previewPlaylistState.id);
      if (playlist && playlist.clips.length > 0) {
        const nextIndex = (previewPlaylistState.index + 1) % playlist.clips.length;
        setPreviewPlaylistState({ ...previewPlaylistState, index: nextIndex });
        setPreviewClipId(playlist.clips[nextIndex].id);
      }
    }
  };

  const handleProgramNext = () => {
    if (programPlaylistState) {
      const playlist = playlists.find(p => p.id === programPlaylistState.id);
      if (playlist && playlist.clips.length > 0) {
        const nextIndex = (programPlaylistState.index + 1) % playlist.clips.length;
        setProgramPlaylistState({ ...programPlaylistState, index: nextIndex });
        setProgramClipId(playlist.clips[nextIndex].id);
      }
    }
  };

  const handleStop = () => {
    setProgramClipId(null);
    setProgramPlaylistState(null);
    setCrossfaderValue(0);
  };

  const handleTogglePlay = (id: string) => {
    const clip = clips.find(c => c.id === id);
    if (clip) {
      handleUpdateItem(id, { isPlaying: !clip.isPlaying });
    }
  };

  const handleToggleLoop = (id: string) => {
    const clip = clips.find(c => c.id === id);
    if (clip) {
      handleUpdateItem(id, { loop: !clip.loop });
    }
  };

  const handleRewind = (id: string) => {
    handleUpdateItem(id, { currentTime: 0 });
  };

  const handleSkip = (id: string, amount: number) => {
    const clip = clips.find(c => c.id === id);
    if (clip) {
      // Note: This only updates the state, the Monitor component's useEffect 
      // will sync this to the actual video element if needed, 
      // but for skip we might want to directly manipulate the video ref 
      // if we had access to it. However, updating state is the "React way" here.
      // Actually, Monitor component handles currentTime sync in its useEffect.
      const newTime = Math.max(0, (clip.currentTime || 0) + amount);
      handleUpdateItem(id, { currentTime: newTime });
    }
  };

  const handleReset = () => {
    if (programClipId) {
      handleUpdateItem(programClipId, { currentTime: 0 });
    }
  };

  const onDragStart = (e: React.DragEvent, clip: Clip) => {
    e.dataTransfer.setData('clipId', clip.id);
  };

  const onDropOnPreview = (e: React.DragEvent) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData('clipId');
    const playlistId = e.dataTransfer.getData('playlistId');
    
    if (clipId) {
      const clip = clips.find(c => c.id === clipId);
      if (clip) handlePreviewClip(clip);
    } else if (playlistId) {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) handlePreviewPlaylist(playlist);
    }
  };

  const onDropOnPlaylist = (e: React.DragEvent, playlistId?: string) => {
    e.preventDefault();
    const clipId = e.dataTransfer.getData('clipId');
    const libraryFileData = e.dataTransfer.getData('libraryFile');
    const libraryFilesData = e.dataTransfer.getData('libraryFiles');
    
    let clipsToClone: Clip[] = [];

    if (clipId) {
      const found = clips.find(c => c.id === clipId);
      if (found) clipsToClone = [found];
    } else if (libraryFilesData) {
      const filesData = JSON.parse(libraryFilesData);
      clipsToClone = filesData.map((fileData: any) => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: fileData.name,
        thumbnail: fileData.url,
        url: fileData.url,
        type: (fileData.type.startsWith('video') ? 'video' : 'image') as 'video' | 'image',
        status: 'idle' as const,
        transform: { ...DEFAULT_TRANSFORM },
        mask: 'none' as const,
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: 'Alpha' as const,
        behavior: 'Cortar' as const,
        curve: 'Lineal' as const,
        filter: 'none' as const,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        isPlaying: true,
        loop: true
      }));
    } else if (libraryFileData) {
      const fileData = JSON.parse(libraryFileData);
      clipsToClone = [{
        id: `temp-${Date.now()}`,
        name: fileData.name,
        thumbnail: fileData.url,
        url: fileData.url,
        type: (fileData.type.startsWith('video') ? 'video' : 'image') as 'video' | 'image',
        status: 'idle' as const,
        transform: { ...DEFAULT_TRANSFORM },
        mask: 'none' as const,
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: 'Alpha' as const,
        behavior: 'Cortar' as const,
        curve: 'Lineal' as const,
        filter: 'none' as const,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        isPlaying: true,
        loop: true
      }];
    } else if (e.dataTransfer.files.length > 0) {
      // Handle OS files
      const files = Array.from(e.dataTransfer.files);
      clipsToClone = files.map(f => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        name: f.name,
        thumbnail: URL.createObjectURL(f),
        url: URL.createObjectURL(f),
        type: (f.type.startsWith('video') ? 'video' : 'image') as 'video' | 'image',
        status: 'idle' as const,
        transform: { ...DEFAULT_TRANSFORM },
        mask: 'none' as const,
        opacity: 1,
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: 'Alpha' as const,
        behavior: 'Cortar' as const,
        curve: 'Lineal' as const,
        filter: 'none' as const,
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 },
        isPlaying: true,
        loop: true
      }));
    }

    if (clipsToClone.length > 0) {
      const newClips: Clip[] = clipsToClone.map(clipToClone => ({ 
        ...clipToClone, 
        id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'idle' as const,
        isPlaying: true
      }));
      
      setClips(prev => [...prev, ...newClips]);

      if (playlistId) {
        setPlaylists(prev => prev.map(p => 
          p.id === playlistId ? { ...p, clips: [...p.clips, ...newClips] } : p
        ));
      } else {
        const newPlaylist: Playlist = {
          id: `playlist-${playlists.length + 1}`,
          name: `Playlist ${playlists.length + 1}`,
          clips: newClips,
          opacity: 1,
          isVisible: true,
          transform: { ...DEFAULT_TRANSFORM },
          mask: 'none',
          master: 1,
          speed: 1,
          volume: 1,
          pan: 0,
          blendMode: 'Alpha',
          behavior: 'Cortar',
          curve: 'Lineal',
          filter: 'none',
          brightness: 1,
          contrast: 1,
          saturation: 1,
          colorBalance: { r: 1, g: 1, b: 1 }
        };
        setPlaylists(prev => [...prev, newPlaylist]);
        setSelectedItemId(newPlaylist.id);
        setSelectedItemType('playlist');
      }
    }
  };

  const addPlaylist = () => {
    if (playlists.length < 8) {
      const newPlaylist: Playlist = {
        id: `playlist-${playlists.length + 1}`,
        name: `Playlist ${playlists.length + 1}`,
        clips: [],
        opacity: 1,
        isVisible: true,
        transform: { ...DEFAULT_TRANSFORM },
        mask: 'none',
        master: 1,
        speed: 1,
        volume: 1,
        pan: 0,
        blendMode: 'Alpha',
        behavior: 'Cortar',
        curve: 'Lineal',
        filter: 'none',
        brightness: 1,
        contrast: 1,
        saturation: 1,
        colorBalance: { r: 1, g: 1, b: 1 }
      };
      setPlaylists([...playlists, newPlaylist]);
    }
  };

  const addExternalScreen = () => {
    const newScreen: Screen = {
      id: `scr-${Date.now()}`,
      name: `Screen ${externalScreens.length + 1}`,
      isActive: false
    };
    setExternalScreens([...externalScreens, newScreen]);
  };

  const toggleScreen = (id: string) => {
    setExternalScreens(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const selectedItem = selectedItemType === 'clip' 
    ? clips.find(c => c.id === selectedItemId) || null
    : playlists.find(p => p.id === selectedItemId) || null;
  const previewClip = clips.find(c => c.id === previewClipId) || null;
  const programClip = clips.find(c => c.id === programClipId) || null;

  // Check for output mode
  const isOutputMode = new URLSearchParams(window.location.search).get('mode') === 'output';

  if (isOutputMode) {
    return <OutputView />;
  }

  return (
    <div className="flex flex-col h-screen font-sans selection:bg-obs-accent/30 overflow-hidden bg-obs-bg text-obs-text">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="video/*,image/*" 
        multiple 
        onChange={(e) => e.target.files && handleAddClips(Array.from(e.target.files))}
      />

      <PixelMapModal 
        isOpen={isPixelMapOpen} 
        onClose={() => setIsPixelMapOpen(false)} 
        slices={slices}
        onUpdateSlices={setSlices}
      />

      {/* Header / Menu Bar */}
      <header className="h-8 border-b border-obs-border flex items-center justify-between px-3 bg-obs-surface">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-obs-accent" />
            <span className="text-[11px] font-bold tracking-tight">LUMINA OBS</span>
          </div>
          <nav className="flex gap-4">
            {['Archivo', 'Editar', 'Vista', 'Perfil', 'Colección', 'Herramientas', 'Ayuda'].map(item => (
              <button key={item} className="text-[10px] text-obs-text hover:bg-obs-border px-2 py-0.5 rounded transition-colors">{item}</button>
            ))}
            <button 
              onClick={() => setIsPixelMapOpen(true)}
              className="text-[10px] text-obs-text hover:bg-obs-border px-2 py-0.5 rounded transition-colors"
            >
              Output
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1 text-obs-muted hover:text-obs-text transition-colors"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Library */}
        <div className="w-64 flex flex-col">
          <Library onAddClip={handleAddClips} isDarkMode={isDarkMode} />
        </div>

        {/* Center: Monitors & Controls */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Monitors Area */}
          <div className="flex-1 p-4 flex gap-2 items-center justify-center min-h-0 bg-black/20">
            <div className="flex-1 h-full max-w-2xl">
              <Monitor 
                title="Vista Previa" 
                activeClip={previewClip} 
                isDarkMode={isDarkMode} 
                onDrop={onDropOnPreview}
                onLevelChange={setPreviewLevel}
                onEnded={handlePreviewNext}
                isPlaylist={!!previewPlaylistState}
                volume={previewVolume}
                onClick={() => {
                  if (previewClip) {
                    setSelectedItemId(previewClip.id);
                    setSelectedItemType('clip');
                  }
                }}
              />
            </div>
            
            {/* Central Transition Control */}
            <div className="flex flex-col items-center gap-4 px-2">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setIsLive(!isLive)}
                  className={`w-20 py-3 rounded border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${isLive ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-obs-surface border-obs-border text-obs-muted hover:border-obs-muted/50'}`}
                >
                  <Zap size={14} fill={isLive ? "currentColor" : "none"} />
                  LIVE
                </button>
                
                <div className="flex flex-col gap-1.5">
                  <button 
                    onClick={() => handleTake()}
                    className="w-20 py-2 rounded border border-obs-border bg-obs-surface text-obs-text text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 hover:border-obs-muted/50 flex items-center justify-center gap-1"
                  >
                    <Scissors size={12} />
                    TAKE
                  </button>
                  <button 
                    onClick={() => handleTake('cut')}
                    className="w-20 py-2 rounded border border-obs-border bg-obs-surface text-obs-text text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 hover:border-obs-muted/50 flex items-center justify-center gap-1"
                  >
                    <Zap size={12} />
                    CUT
                  </button>
                </div>

                <button 
                  onClick={() => {
                    if (!isTransmitting) {
                      // Launch window if it's not open or was closed
                      if (!outputWindowRef.current || outputWindowRef.current.closed) {
                        handleLaunchOutput();
                      } else {
                        setIsTransmitting(true);
                      }
                    } else {
                      setIsTransmitting(false);
                    }
                  }}
                  className={`w-20 py-3 rounded border-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex flex-col items-center justify-center gap-1 ${isTransmitting ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-obs-surface border-obs-border text-obs-muted hover:border-obs-muted/50'}`}
                >
                  <Radio size={14} />
                  TRANSMITIR
                </button>
              </div>
            </div>
            
            <div className="flex-1 h-full max-w-2xl">
              <Monitor 
                title="Programa" 
                isActive={isLive} 
                activeClip={programClip} 
                isDarkMode={isDarkMode} 
                previewClip={previewClip}
                crossfaderValue={crossfaderValue}
                isProgram={true}
                onEnded={handleProgramNext}
                onTogglePlay={handleTogglePlay}
                onToggleLoop={handleToggleLoop}
                onRewind={handleRewind}
                onSkip={handleSkip}
                onLevelChange={setProgramLevel}
                isPlaylist={!!programPlaylistState}
                volume={programVolume}
                brightness={externalScreenSettings.brightness}
                contrast={externalScreenSettings.contrast}
                saturation={externalScreenSettings.saturation}
                scalingW={externalScreenSettings.scalingW}
                scalingH={externalScreenSettings.scalingH}
                transitionType={transitionType}
                colorBalance={externalScreenSettings.colorBalance}
                onClick={() => {
                  setSelectedItemType('program');
                  setSelectedItemId('program-output');
                }}
              />
            </div>
          </div>

          {/* Playlists Horizontal Bar */}
          <div className="h-32 border-t border-obs-border bg-obs-surface overflow-hidden p-2">
            <div className="h-full border-2 border-dashed border-obs-accent/30 rounded-lg overflow-hidden relative group">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.3em] text-obs-accent/50 pointer-events-none z-10">
                DRAG AND DROP VIDEOS PLAY LIST
              </div>
              <PlaylistsSection 
                playlists={playlists}
                onAddPlaylist={addPlaylist}
                onDropOnPlaylist={onDropOnPlaylist}
                onSelectPlaylist={handleSelectPlaylist}
                onSetEditingPlaylist={setEditingPlaylistId}
                selectedPlaylistId={selectedItemId}
                isDarkMode={isDarkMode}
                isHorizontal={true}
              />
            </div>
          </div>

          {/* Bottom Docks Area */}
          <div className="h-44 flex border-t border-obs-border overflow-hidden">
            <div className="flex-1 border-r border-obs-border h-full">
              <GridSection 
                currentDeck={currentDeck}
                onSetDeck={setCurrentDeck}
                deckClips={deckClips}
                onSelectClip={handleSelectClip}
                onDragStart={onDragStart}
                isDarkMode={isDarkMode}
                selectedClipId={selectedItemId}
              />
            </div>
            <div className="w-80 border-r border-obs-border">
              <MixerSection 
                previewLevel={previewLevel} 
                programLevel={programLevel} 
                previewVolume={previewVolume}
                programVolume={programVolume}
                masterVolume={masterVolume}
                usbInVolume={usbInVolume}
                usbOutVolume={usbOutVolume}
                onPreviewVolumeChange={setPreviewVolume}
                onProgramVolumeChange={setProgramVolume}
                onMasterVolumeChange={setMasterVolume}
                onUsbInVolumeChange={setUsbInVolume}
                onUsbOutVolumeChange={setUsbOutVolume}
              />
            </div>
            <div className="w-64 border-r border-obs-border h-full">
              <TransitionsSection 
                duration={transitionDuration}
                onDurationChange={setTransitionDuration}
                onTake={handleTake}
                transitionType={transitionType}
                onTransitionTypeChange={setTransitionType}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar: Inspector */}
        <div className="w-72 flex flex-col border-l border-obs-border">
          <Inspector 
            selectedItem={selectedItem} 
            selectedItemType={selectedItemType}
            externalScreenSettings={externalScreenSettings}
            externalScreens={externalScreens}
            hasDetailedScreens={hasDetailedScreens}
            isIframe={isIframe}
            onUpdate={handleUpdateItem} 
            onUpdateExternalScreen={setExternalScreenSettings}
            onLaunchOutput={handleLaunchOutput}
            onDetectScreens={() => detectScreens(true)}
            isDarkMode={isDarkMode} 
          />
        </div>
      </main>

      <AnimatePresence>
        {editingPlaylistId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-obs-bg border border-obs-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-obs-border bg-obs-surface flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-obs-accent/20 flex items-center justify-center text-obs-accent">
                    <Settings size={18} />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-obs-text">Editar Playlist: {playlists.find(p => p.id === editingPlaylistId)?.name}</h2>
                </div>
                <button 
                  onClick={() => setEditingPlaylistId(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-obs-muted hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-obs-bg">
                <Reorder.Group 
                  axis="y" 
                  values={playlists.find(p => p.id === editingPlaylistId)?.clips || []} 
                  onReorder={(newClips) => {
                    setPlaylists(prev => prev.map(p => p.id === editingPlaylistId ? { ...p, clips: newClips } : p));
                  }}
                  className="space-y-3"
                >
                  {playlists.find(p => p.id === editingPlaylistId)?.clips.map((clip, i) => (
                    <Reorder.Item 
                      key={clip.id} 
                      value={clip}
                      className="bg-obs-surface border border-obs-border rounded-lg p-3 flex items-center gap-4 group hover:border-obs-accent/50 transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-obs-muted cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} />
                      </div>
                      <div className="w-24 aspect-video rounded overflow-hidden border border-obs-border bg-black/40">
                        {clip.type === 'video' ? (
                          <video src={clip.url} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={clip.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-obs-text truncate">{clip.name}</div>
                        <div className="text-[9px] text-obs-muted uppercase tracking-wider">{clip.type} • {clip.duration}s</div>
                      </div>
                      <button 
                        onClick={() => {
                          setPlaylists(prev => prev.map(p => p.id === editingPlaylistId ? {
                            ...p,
                            clips: p.clips.filter(c => c.id !== clip.id)
                          } : p));
                        }}
                        className="p-2 text-obs-muted hover:text-red-500 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
                
                {(!playlists.find(p => p.id === editingPlaylistId)?.clips.length) && (
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-obs-border rounded-xl text-obs-muted opacity-50">
                    <Plus size={32} className="mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Playlist Vacía</span>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-obs-border bg-obs-surface flex justify-end">
                <button 
                  onClick={() => setEditingPlaylistId(null)}
                  className="px-6 py-2 bg-obs-accent text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-obs-accent/80 transition-all shadow-lg shadow-obs-accent/20"
                >
                  Cerrar y Guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
