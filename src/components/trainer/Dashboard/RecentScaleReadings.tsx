import { useState } from 'react';
import { Scale, User, AlertCircle, CheckCircle, HelpCircle, ChevronLeft, Save, Loader2, Calendar, X } from 'lucide-react';
import { IdentifiedReading } from '../../../hooks/useGlobalScaleListener';
import { ScaleReading, TraineeMatch } from '../../../hooks/useScaleListener';

interface RecentScaleReadingsProps {
  readings: IdentifiedReading[];
  isListening: boolean;
  onTraineeClick?: (traineeId: string) => void;
  onSaveMeasurement?: (traineeId: string, traineeName: string, reading: ScaleReading, customDate?: string) => Promise<boolean>;
}

export default function RecentScaleReadings({
  readings,
  isListening,
  onTraineeClick,
  onSaveMeasurement
}: RecentScaleReadingsProps) {
  const [savedReadings, setSavedReadings] = useState<Set<string>>(new Set());
  const [savingReadings, setSavingReadings] = useState<Set<string>>(new Set());
  const [editingDateReadingId, setEditingDateReadingId] = useState<number | null>(null);
  const [editingDateTraineeId, setEditingDateTraineeId] = useState<string | null>(null);
  const [editingDateTraineeName, setEditingDateTraineeName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleSave = async (e: React.MouseEvent, traineeId: string, traineeName: string, reading: ScaleReading) => {
    e.stopPropagation();
    if (!onSaveMeasurement) return;

    const readingDate = new Date(reading.created_at).toISOString().split('T')[0];
    setEditingDateReadingId(reading.id);
    setEditingDateTraineeId(traineeId);
    setEditingDateTraineeName(traineeName);
    setSelectedDate(readingDate);
  };

  const handleConfirmSave = async () => {
    if (!onSaveMeasurement || !editingDateReadingId || !editingDateTraineeId || !editingDateTraineeName) return;

    const reading = readings
      .find(r => r.reading.id === editingDateReadingId)
      ?.reading;

    if (!reading) return;

    const readingKey = `${reading.id}-${editingDateTraineeId}`;
    if (savedReadings.has(readingKey) || savingReadings.has(readingKey)) {
      setEditingDateReadingId(null);
      return;
    }

    setSavingReadings(prev => new Set(prev).add(readingKey));

    const success = await onSaveMeasurement(editingDateTraineeId, editingDateTraineeName, reading, selectedDate);

    setSavingReadings(prev => {
      const next = new Set(prev);
      next.delete(readingKey);
      return next;
    });

    if (success) {
      setSavedReadings(prev => new Set(prev).add(readingKey));
    }

    setEditingDateReadingId(null);
    setEditingDateTraineeId(null);
    setEditingDateTraineeName(null);
    setSelectedDate('');
  };

  const getReadingKey = (readingId: number, traineeId: string) => `${readingId}-${traineeId}`;

  const renderSaveButton = (reading: ScaleReading, match: TraineeMatch) => {
    const readingKey = getReadingKey(reading.id, match.traineeId);
    const isSaved = savedReadings.has(readingKey);
    const isSaving = savingReadings.has(readingKey);

    if (isSaved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
          <CheckCircle className="h-3.5 w-3.5" />
          נשמר
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => handleSave(e, match.traineeId, match.traineeName, reading)}
        disabled={isSaving}
        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        {isSaving ? 'שומר...' : 'שמור'}
      </button>
    );
  };
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'היום';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'אתמול';
    }
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-gray-500 bg-gray-50';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 70) return <CheckCircle className="h-4 w-4" />;
    if (score >= 50) return <AlertCircle className="h-4 w-4" />;
    return <HelpCircle className="h-4 w-4" />;
  };

  if (readings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Scale className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">שקילות אחרונות</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`inline-flex items-center gap-1 ${isListening ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                {isListening ? 'מאזין' : 'לא מחובר'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Scale className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p>אין שקילות אחרונות</p>
          <p className="text-sm mt-1">שקילות חדשות יופיעו כאן אוטומטית</p>
        </div>
      </div>
    );
  }

  const dateEditorModal = editingDateReadingId !== null && (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">בחירת תאריך</h3>
          </div>
          <button
            onClick={() => {
              setEditingDateReadingId(null);
              setEditingDateTraineeId(null);
              setEditingDateTraineeName(null);
              setSelectedDate('');
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {editingDateTraineeName && (
          <p className="text-sm text-gray-600 mb-4">שמירה למתאמן: <span className="font-medium">{editingDateTraineeName}</span></p>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">תאריך המדידה</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingDateReadingId(null);
              setEditingDateTraineeId(null);
              setEditingDateTraineeName(null);
              setSelectedDate('');
            }}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            ביטול
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={savingReadings.has(`${editingDateReadingId}-${editingDateTraineeId}`)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {savingReadings.has(`${editingDateReadingId}-${editingDateTraineeId}`) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                שמור
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {dateEditorModal}
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Scale className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">שקילות אחרונות</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className={`inline-flex items-center gap-1 ${isListening ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`h-2 w-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                {isListening ? 'מאזין' : 'לא מחובר'}
              </span>
            </div>
          </div>
        </div>
        <span className="text-sm text-gray-500">{readings.length} שקילות</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {readings.map((item, index) => (
          <div
            key={`${item.reading.id}-${index}`}
            className={`p-4 rounded-lg border transition-all ${
              item.bestMatch
                ? 'border-green-200 bg-green-50/50 hover:bg-green-50'
                : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100'
            } ${item.bestMatch && onTraineeClick ? 'cursor-pointer' : ''}`}
            onClick={() => item.bestMatch && onTraineeClick?.(item.bestMatch.traineeId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${item.bestMatch ? 'bg-green-100' : 'bg-gray-200'}`}>
                  {item.bestMatch ? (
                    <User className="h-5 w-5 text-green-600" />
                  ) : (
                    <HelpCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  {item.bestMatch ? (
                    <>
                      <p className="font-medium text-gray-900">{item.bestMatch.traineeName}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{item.reading.weight_kg?.toFixed(1)} ק"ג</span>
                        {item.reading.body_fat_percent && (
                          <span className="text-gray-400">|</span>
                        )}
                        {item.reading.body_fat_percent && (
                          <span>{item.reading.body_fat_percent?.toFixed(1)}% שומן</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-gray-700">לא זוהה</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{item.reading.weight_kg?.toFixed(1)} ק"ג</span>
                        {item.reading.body_fat_percent && (
                          <>
                            <span className="text-gray-400">|</span>
                            <span>{item.reading.body_fat_percent?.toFixed(1)}% שומן</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-left">
                  <p className="text-sm text-gray-500">{formatDate(item.timestamp)}</p>
                  <p className="text-xs text-gray-400">{formatTime(item.timestamp)}</p>
                </div>
                {item.bestMatch && (
                  <>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(item.bestMatch.confidenceScore)}`}>
                      {getConfidenceIcon(item.bestMatch.confidenceScore)}
                      {item.bestMatch.confidenceScore}%
                    </span>
                    {onSaveMeasurement && renderSaveButton(item.reading, item.bestMatch)}
                    {onTraineeClick && (
                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                    )}
                  </>
                )}
              </div>
            </div>

            {item.matches.length > 1 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">התאמות נוספות:</p>
                <div className="flex flex-wrap gap-2">
                  {item.matches.slice(1, 4).map((match) => (
                    <div key={match.traineeId} className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTraineeClick?.(match.traineeId);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                      >
                        <span>{match.traineeName}</span>
                        <span className="text-gray-400">({match.confidenceScore}%)</span>
                      </button>
                      {onSaveMeasurement && renderSaveButton(item.reading, match)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
