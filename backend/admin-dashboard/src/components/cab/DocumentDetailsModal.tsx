import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import PremiumModal from './PremiumModal';
import DocumentViewer from './DocumentViewer';
import StatusBadge from './StatusBadge';
import { SkeletonRows, ErrorState } from './PageStates';
import AdminAPI from '../../services/api';
import { ActionButton, ActionGroup } from './ActionButtons';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useConfirm } from '../../context/ConfirmContext';

interface Props {
  documentId: string | null;
  open: boolean;
  onClose: () => void;
  onAction?: () => void;
}

const DocumentDetailsModal: React.FC<Props> = ({ documentId, open, onClose, onAction }) => {
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { run, isLoading } = useAsyncAction();
  const { confirm } = useConfirm();

  const load = () => {
    if (!documentId) return;
    setLoading(true);
    AdminAPI.getCabDocumentDetails(documentId)
      .then(setDoc)
      .catch(() => setError('Failed to load document'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open && documentId) load(); }, [open, documentId]);

  const withConfirm = async (action: () => Promise<void>, opts: { title: string; description: string; variant?: 'danger' | 'primary'; key: string; success: string; loading: string }) => {
    const ok = await confirm({ title: opts.title, description: opts.description, variant: opts.variant, confirmLabel: opts.variant === 'danger' ? 'Confirm' : 'Approve' });
    if (!ok) return;
    await run(opts.key, async () => { await action(); onAction?.(); onClose(); }, { successMessage: opts.success, loadingMessage: opts.loading });
  };

  const footer = doc ? (
    <ActionGroup>
      <ActionButton variant="approve" title="Approve" loading={isLoading('approve')} onClick={() => withConfirm(() => AdminAPI.verifyCabDocument(documentId!, 'approved'), { title: 'Approve this document?', description: 'The driver will be notified.', key: 'approve', success: 'Document approved', loading: 'Approving...' })} />
      <ActionButton variant="reject" title="Reject" loading={isLoading('reject')} onClick={() => withConfirm(() => AdminAPI.verifyCabDocument(documentId!, 'rejected', 'Rejected by admin'), { title: 'Reject this document?', description: 'The driver may need to re-upload.', variant: 'danger', key: 'reject', success: 'Document rejected', loading: 'Rejecting...' })} />
      <ActionButton variant="reupload" title="Request Re-upload" loading={isLoading('reupload')} onClick={() => withConfirm(() => AdminAPI.requestCabDocumentReupload(documentId!, 'Please re-upload a clearer copy'), { title: 'Request re-upload?', description: 'Driver will be asked to upload again.', key: 'reupload', success: 'Re-upload requested', loading: 'Processing...' })} />
      <ActionButton variant="delete" title="Delete" loading={isLoading('delete')} onClick={() => withConfirm(() => AdminAPI.deleteCabDocument(documentId!), { title: 'Delete this document?', description: 'File will be removed from storage permanently.', variant: 'danger', key: 'delete', success: 'Document deleted', loading: 'Deleting...' })} />
    </ActionGroup>
  ) : undefined;

  return (
    <PremiumModal
      open={open}
      onClose={onClose}
      title={doc?.docType?.replace(/_/g, ' ') || 'Document Verification'}
      subtitle={
        doc
          ? [
              doc.userId ? `${doc.userId.firstName || ''} ${doc.userId.lastName || ''} · ${doc.userId.phoneNumber || ''}`.trim() : null,
              doc.vehicleNumber ? `Vehicle ${doc.vehicleNumber}` : null,
            ].filter(Boolean).join(' · ') || undefined
          : undefined
      }
      size="xl"
      footer={footer}
    >
      {loading ? <SkeletonRows rows={6} cols={1} /> : error ? <ErrorState message={error} /> : doc ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div><span className="text-slate-500">Type:</span> <span className="font-medium capitalize">{doc.docType?.replace(/_/g, ' ')}</span></div>
            <StatusBadge status={doc.status} />
            <div><span className="text-slate-500">Uploaded:</span> {doc.uploadedAt ? format(new Date(doc.uploadedAt), 'dd MMM yyyy HH:mm') : '—'}</div>
          </div>
          {doc.rejectionReason && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{doc.rejectionReason}</p>}
          <DocumentViewer url={doc.url} mimeType={doc.mimeType} title={doc.docType} />
        </div>
      ) : null}
    </PremiumModal>
  );
};

export default DocumentDetailsModal;
