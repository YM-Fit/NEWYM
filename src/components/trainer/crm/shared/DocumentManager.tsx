/**
 * Document Manager Component
 * ניהול מסמכים
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Upload, Trash2, Download, Image, File } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { DocumentService, type Document } from '../../../../services/documentService';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';
import { Modal } from '../../../ui/Modal';

interface DocumentManagerProps {
  traineeId: string;
  onClose?: () => void;
}

export default function DocumentManager({ traineeId, onClose }: DocumentManagerProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!traineeId) return;

    try {
      setLoading(true);
      const result = await DocumentService.getDocuments(traineeId);
      if (result.success && result.data) {
        setDocuments(result.data);
      } else if (result.error) {
        logger.error('Error loading documents', result.error, 'DocumentManager');
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error loading documents', error, 'DocumentManager');
      toast.error('שגיאה בטעינת מסמכים');
    } finally {
      setLoading(false);
    }
  }, [traineeId]);

  useEffect(() => {
    if (traineeId) {
      loadDocuments();
    }
  }, [traineeId, loadDocuments]);

  const handleUpload = async (file: File, category: Document['category'], description?: string) => {
    if (!user || !traineeId) return;

    try {
      setUploading(true);
      const result = await DocumentService.uploadDocument(
        traineeId,
        user.id,
        file,
        category,
        description
      );

      if (result.success) {
        toast.success('מסמך הועלה בהצלחה');
        await loadDocuments();
        setShowUploadModal(false);
      } else {
        toast.error(result.error || 'שגיאה בהעלאת מסמך');
      }
    } catch (error) {
      logger.error('Error uploading document', error, 'DocumentManager');
      toast.error('שגיאה בהעלאת מסמך');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המסמך?')) return;

    try {
      const result = await DocumentService.deleteDocument(documentId);
      if (result.success) {
        toast.success('מסמך נמחק בהצלחה');
        await loadDocuments();
      } else {
        toast.error(result.error || 'שגיאה במחיקת מסמך');
      }
    } catch (error) {
      logger.error('Error deleting document', error, 'DocumentManager');
      toast.error('שגיאה במחיקת מסמך');
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const result = await DocumentService.getDocumentUrl(document.id);
      if (result.success && result.data) {
        window.open(result.data, '_blank');
      } else {
        toast.error(result.error || 'שגיאה בהורדת מסמך');
      }
    } catch (error) {
      logger.error('Error downloading document', error, 'DocumentManager');
      toast.error('שגיאה בהורדת מסמך');
    }
  };

  const getCategoryIcon = (category: Document['category']) => {
    switch (category) {
      case 'photo':
      case 'before_after':
        return Image;
      default:
        return FileText;
    }
  };

  const getCategoryLabel = (category: Document['category']) => {
    const labels: Record<Document['category'], string> = {
      contract: 'חוזה',
      photo: 'תמונה',
      before_after: 'לפני/אחרי',
      other: 'אחר',
    };
    return labels[category];
  };

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ניהול מסמכים</h1>
              <p className="text-sm text-zinc-400">{documents.length} מסמכים</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-all flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              העלה מסמך
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
              >
                סגור
              </button>
            )}
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => {
            const Icon = getCategoryIcon(document.category);
            return (
              <div key={document.id} className="premium-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-emerald-500/20 rounded-lg flex-shrink-0">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{document.file_name}</h3>
                      <p className="text-xs text-zinc-400">{getCategoryLabel(document.category)}</p>
                    </div>
                  </div>
                </div>

                {document.description && (
                  <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{document.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                  <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                  <span>{new Date(document.created_at).toLocaleDateString('he-IL')}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(document)}
                    className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    הורד
                  </button>
                  <button
                    onClick={() => handleDelete(document.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    aria-label="מחק"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {documents.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500">
              אין מסמכים. העלה מסמך כדי להתחיל.
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          uploading={uploading}
        />
      )}
    </div>
  );
}

// Document Upload Modal Component
function DocumentUploadModal({
  onClose,
  onUpload,
  uploading,
}: {
  onClose: () => void;
  onUpload: (file: File, category: Document['category'], description?: string) => void;
  uploading: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Document['category']>('other');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error('נא לבחור קובץ');
      return;
    }

    onUpload(selectedFile, category, description);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="העלה מסמך" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">קובץ</label>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
          />
          {selectedFile && (
            <p className="text-sm text-zinc-400 mt-2">
              נבחר: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">קטגוריה</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Document['category'])}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
          >
            <option value="contract">חוזה</option>
            <option value="photo">תמונה</option>
            <option value="before_after">לפני/אחרי</option>
            <option value="other">אחר</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">תיאור (אופציונלי)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white"
            placeholder="תיאור המסמך..."
          />
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-all"
          >
            ביטול
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || !selectedFile}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-50"
          >
            {uploading ? 'מעלה...' : 'העלה'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
