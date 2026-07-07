import React, { useState } from 'react';
import {
  ZoomIn, ZoomOut, RotateCw, Download, Maximize2, Minimize2, FileText
} from 'lucide-react';

interface DocumentViewerProps {
  url: string | null | undefined;
  mimeType?: string | null;
  title?: string;
}

const isPdf = (url?: string | null, mime?: string | null) =>
  mime?.includes('pdf') || url?.toLowerCase().includes('.pdf');

const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, mimeType, title }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (!url) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50">
        <div className="text-center text-slate-400">
          <FileText className="mx-auto h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No document uploaded</p>
        </div>
      </div>
    );
  }

  const pdf = isPdf(url, mimeType);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 p-2">
      {!pdf && (
        <>
          <button onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} className="toolbar-btn" title="Zoom in"><ZoomIn className="h-4 w-4" /></button>
          <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} className="toolbar-btn" title="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <button onClick={() => setRotation((r) => r + 90)} className="toolbar-btn" title="Rotate"><RotateCw className="h-4 w-4" /></button>
        </>
      )}
      <a href={url} download target="_blank" rel="noreferrer" className="toolbar-btn" title="Download"><Download className="h-4 w-4" /></a>
      <button onClick={() => setFullscreen((f) => !f)} className="toolbar-btn" title="Fullscreen">
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      {!pdf && <span className="ml-auto text-xs text-slate-500">{Math.round(zoom * 100)}%</span>}
    </div>
  );

  const content = pdf ? (
    <iframe
      src={`${url}#toolbar=1&navpanes=1`}
      title={title || 'Document'}
      className="h-full w-full rounded-lg border border-slate-200 dark:border-slate-700"
    />
  ) : (
    <div className="flex h-full items-center justify-center overflow-auto bg-slate-900/5 dark:bg-slate-950/30 rounded-lg">
      <img
        src={url}
        alt={title || 'Document'}
        style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-950">
        <div className="p-3">{toolbar}</div>
        <div className="flex-1 p-4">{content}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toolbar}
      <div className="h-80 md:h-96">{content}</div>
    </div>
  );
};

export default DocumentViewer;
