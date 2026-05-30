import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PDFRenderer = ({ url, pageNumber, onLoadSuccess }: { url: string, pageNumber: number, onLoadSuccess?: (totalPages: number) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  // Cargar documento PDF (solo cuando cambia la URL)
  useEffect(() => {
    let isCancelled = false;
    let loadingTask: any = null;

    const loadPdf = async () => {
      try {
        console.log("Loading PDF from URL:", url, "using vite worker");
        
        loadingTask = pdfjsLib.getDocument({
          url: url,
        });
        
        const pdf = await loadingTask.promise;
        console.log("PDF loaded successfully. Pages:", pdf.numPages);
        
        if (!isCancelled) {
          setPdfDoc(pdf);
          if (onLoadSuccess) onLoadSuccess(pdf.numPages);
        }
      } catch (e: any) {
        if (!isCancelled && !e.message?.includes('Worker was destroyed')) {
          console.error("PDF Load Error details:", e);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [url]);

  // Renderizar la página cuando el documento o el número de página cambien
  useEffect(() => {
    if (!pdfDoc) return;
    
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const numPages = pdfDoc.numPages;
        const validPageNum = Math.min(Math.max(1, pageNumber), numPages);
        
        const page = await pdfDoc.getPage(validPageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale: 2.0 }); 
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
          console.error("PDF Render Error:", e);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none bg-white" />;
};
