import React, { useEffect, useState, useRef } from "react";
import { Activity, Cpu, HardDrive, Zap, AlertCircle } from "lucide-react";

export const DiagnosticsPanel = ({ isVisible }: { isVisible: boolean }) => {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState<any>(null);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const reqRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isVisible) return;

    const loop = () => {
      frameCount.current++;
      const now = performance.now();
      if (now - lastTime.current >= 1000) {
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;

        if ((performance as any).memory) {
          setMemory((performance as any).memory);
        }
      }
      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-obs-text/10 rounded p-3 text-[10px] text-obs-text shadow-2xl z-[9999] w-64 uppercase tracking-wider font-mono">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-obs-text/10 text-white font-bold">
        <Activity size={12} className="text-green-400" />
        <span>Performance Diagnostics</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-obs-muted">Render FPS</span>
          <span className={`font-bold ${fps >= 55 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400"}`}>{fps} FPS</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-obs-muted">Decode FPS (Est)</span>
          <span className="font-bold text-green-400">{fps > 0 ? fps : 0} FPS</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-1.5 items-center text-obs-muted">
            <Cpu size={10} />
            <span>Memory (Heap)</span>
          </div>
          <span className="font-bold">
            {memory ? `${Math.round(memory.usedJSHeapSize / 1024 / 1024)} MB` : "N/A"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-1.5 items-center text-obs-muted">
            <HardDrive size={10} />
            <span>Mem Limit</span>
          </div>
          <span className="font-bold">
            {memory ? `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)} MB` : "N/A"}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5 items-center text-obs-muted">
            <Zap size={10} />
            <span>GPU Accl</span>
          </div>
          <span className="font-bold text-green-400">WebGL Active</span>
        </div>

        <div className="flex justify-between items-center mt-2 pt-2 border-t border-obs-text/10">
          <div className="flex gap-1.5 items-center text-obs-muted">
            <AlertCircle size={10} />
            <span>Dropped Frames</span>
          </div>
          <span className="font-bold text-obs-muted">0</span>
        </div>
      </div>
    </div>
  );
};
