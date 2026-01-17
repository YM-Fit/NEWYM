/**
 * Data Import Manager Component
 * ניהול ייבוא נתונים
 */

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { DataImportService, type ImportFormat, type ImportDataType } from '../../../../services/dataImportService';
import toast from 'react-hot-toast';
import { logger } from '../../../../utils/logger';

interface ImportPreview {
  total: number;
  valid: number;
  invalid: number;
  sample: Array<{
    row: number;
    data: any;
    isValid: boolean;
    errors: string[];
  }>;
  errors: Array<{
    row: number;
    data: any;
    errors: string[];
  }>;
}

export default function DataImportManager() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [dataType, setDataType] = useState<ImportDataType>('clients');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Detect format from file extension
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') {
      setFormat('csv');
    } else if (extension === 'json') {
      setFormat('json');
    }

    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file || !user) return;

    try {
      setPreviewing(true);
      const result = await DataImportService.previewImport(file, format, dataType, user.id);

      if (result.success && result.data) {
        setPreview(result.data);
        toast.success(`נמצאו ${result.data.total} רשומות: ${result.data.valid} תקינות, ${result.data.invalid} לא תקינות`);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error previewing import', error, 'DataImportManager');
      toast.error('שגיאה בתצוגה מקדימה');
    } finally {
      setPreviewing(false);
    }
  }, [file, format, dataType, user]);

  const handleImport = useCallback(async () => {
    if (!file || !user) return;

    if (!preview) {
      toast.error('יש לבצע תצוגה מקדימה לפני ייבוא');
      return;
    }

    if (preview.valid === 0) {
      toast.error('אין רשומות תקינות לייבא');
      return;
    }

    try {
      setImporting(true);
      const result = await DataImportService.importData({
        file,
        format,
        dataType,
        trainerId: user.id,
        validateBeforeImport: true,
        skipErrors: false,
      });

      if (result.success && result.data) {
        setImportResult(result.data);
        toast.success(`יובאו ${result.data.imported} רשומות בהצלחה`);
        if (result.data.failed > 0) {
          toast.error(`${result.data.failed} רשומות נכשלו`);
        }
        // Reset form
        setFile(null);
        setPreview(null);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      logger.error('Error importing data', error, 'DataImportManager');
      toast.error('שגיאה ביבוא נתונים');
    } finally {
      setImporting(false);
    }
  }, [file, format, dataType, user, preview]);

  const downloadErrorReport = useCallback(() => {
    if (!importResult?.errors || importResult.errors.length === 0) return;

    const errorReport = importResult.errors.map((err: any) => ({
      שורה: err.row,
      נתונים: JSON.stringify(err.data),
      שגיאה: err.error,
    }));

    const csv = [
      Object.keys(errorReport[0]).join(','),
      ...errorReport.map((err: any) => Object.values(err).map(v => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [importResult]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Upload className="h-6 w-6 text-emerald-400" />
          ייבוא נתונים
        </h2>
        <p className="text-zinc-400 mt-1">ייבא לקוחות או אינטראקציות מקובץ CSV או JSON</p>
      </div>

      {/* Import Form */}
      <div className="premium-card p-6 space-y-6">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            בחר קובץ
          </label>
          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer">
              <input
                id="file-input"
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="premium-card p-6 border-2 border-dashed border-zinc-600 hover:border-emerald-500 transition-colors text-center">
                {file ? (
                  <div className="flex items-center gap-3 justify-center">
                    <FileText className="h-6 w-6 text-emerald-400" />
                    <div className="text-left">
                      <div className="text-white font-medium">{file.name}</div>
                      <div className="text-zinc-400 text-sm">
                        {(file.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                    <div className="text-zinc-400">לחץ לבחירת קובץ או גרור לכאן</div>
                    <div className="text-zinc-500 text-sm mt-1">CSV או JSON</div>
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Format Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              פורמט קובץ
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ImportFormat)}
              className="w-full premium-input"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              סוג נתונים
            </label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as ImportDataType)}
              className="w-full premium-input"
            >
              <option value="clients">לקוחות</option>
              <option value="interactions">אינטראקציות</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePreview}
            disabled={!file || previewing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Eye className="h-5 w-5" />
            {previewing ? 'טוען...' : 'תצוגה מקדימה'}
          </button>

          <button
            onClick={handleImport}
            disabled={!file || !preview || preview.valid === 0 || importing}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="h-5 w-5" />
            {importing ? 'מייבא...' : 'ייבא נתונים'}
          </button>
        </div>
      </div>

      {/* Preview Results */}
      {preview && (
        <div className="premium-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-400" />
            תוצאות תצוגה מקדימה
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-zinc-800 rounded-lg">
              <div className="text-2xl font-bold text-white">{preview.total}</div>
              <div className="text-zinc-400 text-sm">סה"כ רשומות</div>
            </div>
            <div className="text-center p-4 bg-green-500/20 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{preview.valid}</div>
              <div className="text-zinc-400 text-sm">תקינות</div>
            </div>
            <div className="text-center p-4 bg-red-500/20 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{preview.invalid}</div>
              <div className="text-zinc-400 text-sm">לא תקינות</div>
            </div>
          </div>

          {/* Sample Data */}
          {preview.sample.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-white mb-2">דוגמאות (10 ראשונות)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-right p-2 text-zinc-400">שורה</th>
                      <th className="text-right p-2 text-zinc-400">סטטוס</th>
                      <th className="text-right p-2 text-zinc-400">שגיאות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((item) => (
                      <tr key={item.row} className="border-b border-zinc-800">
                        <td className="p-2 text-white">{item.row}</td>
                        <td className="p-2">
                          {item.isValid ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-400" />
                          )}
                        </td>
                        <td className="p-2 text-red-400 text-xs">
                          {item.errors.length > 0 ? item.errors.join(', ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {preview.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">שגיאות (20 ראשונות)</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {preview.errors.map((error) => (
                  <div key={error.row} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-white font-medium">שורה {error.row}</span>
                    </div>
                    <div className="text-red-400 text-sm">
                      {error.errors.join('; ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="premium-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            {importResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            תוצאות ייבוא
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-500/20 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{importResult.imported}</div>
              <div className="text-zinc-400 text-sm">יובאו בהצלחה</div>
            </div>
            <div className="text-center p-4 bg-red-500/20 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{importResult.failed}</div>
              <div className="text-zinc-400 text-sm">נכשלו</div>
            </div>
            <div className="text-center p-4 bg-zinc-800 rounded-lg">
              <div className="text-2xl font-bold text-white">
                {importResult.imported + importResult.failed}
              </div>
              <div className="text-zinc-400 text-sm">סה"כ</div>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-white">שגיאות ייבוא</h4>
                <button
                  onClick={downloadErrorReport}
                  className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  הורד דוח שגיאות
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {importResult.errors.slice(0, 20).map((error: any, index: number) => (
                  <div key={index} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <span className="text-white font-medium">שורה {error.row}</span>
                    </div>
                    <div className="text-red-400 text-sm">{error.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
