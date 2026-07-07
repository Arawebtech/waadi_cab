'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentType, VehicleDocument } from '@/types/vehicle';
import { useDeleteVehicleDocument, useUploadVehicleDocument } from '../hooks';
import { DocumentStatusBadge } from './StatusBadge';
import { extractErrorMessage } from '@/lib/api/client';
import { useConfirm } from '@/components/confirm';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdfFile(file: File | { url: string }) {
  if ('type' in file) return file.type === 'application/pdf' || file.name.endsWith('.pdf');
  return file.url.toLowerCase().includes('.pdf');
}

interface PendingFile {
  file: File;
  previewUrl: string;
}

export function DocumentUploadCard({
  vehicleId,
  type,
  label,
  doc,
}: {
  vehicleId: string;
  type: DocumentType;
  label: string;
  doc: VehicleDocument;
}) {
  const upload = useUploadVehicleDocument(vehicleId);
  const remove = useDeleteVehicleDocument(vehicleId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirmAction } = useConfirm();

  const hasExisting = Boolean(doc.url && doc.status !== 'not_uploaded');

  useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    };
  }, [pending?.previewUrl]);

  const handleSelect = (file: File) => {
    setError(null);
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending({ file, previewUrl: URL.createObjectURL(file) });
    if (inputRef.current) inputRef.current.value = '';
  };

  const clearPending = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const handleSubmit = async () => {
    if (!pending) return;
    setError(null);
    try {
      await upload.mutateAsync({ documentType: type, file: pending.file });
      clearPending();
    } catch (err) {
      setError(extractErrorMessage(err, 'Upload failed'));
    }
  };

  const handleRemoveExisting = async () => {
    await confirmAction({
      title: `Remove ${label}?`,
      description: 'You may need to upload this document again.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep',
      variant: 'danger',
      action: async () => {
        setError(null);
        await remove.mutateAsync(type);
      },
    }).catch((err) => setError(extractErrorMessage(err, 'Remove failed')));
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {doc.uploadedAt ? `Uploaded ${formatDate(doc.uploadedAt)}` : 'Not uploaded yet'}
          </p>
        </div>
        <DocumentStatusBadge status={pending ? 'pending' : doc.status} />
      </div>

      {doc.status === 'rejected' && doc.rejectionReason && !pending && (
        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {doc.rejectionReason}
        </p>
      )}

      <AnimatePresence mode="wait">
        {pending ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 space-y-3"
          >
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Pending Preview — not uploaded yet
            </div>

            {hasExisting && doc.url && (
              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewPanel title="Current" url={doc.url} fileName={label} />
                <PreviewPanel
                  title="New"
                  url={pending.previewUrl}
                  fileName={pending.file.name}
                  fileSize={pending.file.size}
                  isNew
                />
              </div>
            )}

            {!hasExisting && (
              <PreviewPanel
                url={pending.previewUrl}
                fileName={pending.file.name}
                fileSize={pending.file.size}
                isNew
              />
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={upload.isPending}>
                {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit Upload
              </Button>
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button size="sm" variant="ghost" onClick={clearPending}>
                <X className="mr-1 h-4 w-4" /> Remove
              </Button>
            </div>
          </motion.div>
        ) : hasExisting && doc.url ? (
          <motion.div
            key="existing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 space-y-3"
          >
            <PreviewPanel url={doc.url} fileName={label} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                Replace Document
              </Button>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View / Download
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                onClick={handleRemoveExisting}
                disabled={remove.isPending}
              >
                {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8',
                'text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600',
                'dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-blue-950/20 dark:hover:text-blue-400'
              )}
            >
              <Upload className="h-8 w-8 opacity-60" />
              <span className="text-sm font-medium">Select document</span>
              <span className="text-xs">Images or PDF · Preview before upload</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSelect(file);
        }}
      />

      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </motion.div>
  );
}

function PreviewPanel({
  title,
  url,
  fileName,
  fileSize,
  isNew,
}: {
  title?: string;
  url: string;
  fileName: string;
  fileSize?: number;
  isNew?: boolean;
}) {
  const pdf = isPdfFile({ url });

  return (
    <div className={cn('rounded-xl border p-3', isNew ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-700')}>
      {title && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>}
      <div className="overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {pdf ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300">
            <FileText className="h-10 w-10" />
            <span className="text-xs">PDF Document</span>
            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
              Open preview
            </a>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={fileName} className="h-36 w-full object-cover" />
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{fileName}</p>
      {fileSize != null && <p className="text-xs text-slate-500">{formatFileSize(fileSize)}</p>}
    </div>
  );
}
