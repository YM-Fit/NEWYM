import { useState, useEffect, useMemo } from 'react';
import { Scale, User, AlertCircle, CheckCircle, HelpCircle, ChevronLeft, Save, Loader2, Calendar, X, FileText, Filter, Search, CheckSquare, Square, Trash2, Download, SortAsc, SortDesc } from 'lucide-react';
import { IdentifiedReading } from '../../../hooks/useGlobalScaleListener';
import { ScaleReading, TraineeMatch } from '../../../hooks/useScaleListener';
import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';

interface SavedNote {
  id: string;
  trainee_id: string;
  trainee_name: string;
  date: string;
  notes: string;
  weight_kg?: number;
  body_fat_percent?: number;
}

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
  const [activeTab, setActiveTab] = useState<'readings' | 'notes'>('readings');
  const [savedReadings, setSavedReadings] = useState<Set<string>>(new Set());
  const [savingReadings, setSavingReadings] = useState<Set<string>>(new Set());
  const [editingDateReadingId, setEditingDateReadingId] = useState<number | null>(null);
  const [editingDateTraineeId, setEditingDateTraineeId] = useState<string | null>(null);
  const [editingDateTraineeName, setEditingDateTraineeName] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  
  // Advanced filtering and bulk operations
  const [hiddenReadings, setHiddenReadings] = useState<Set<string>>(new Set());
  const [selectedReadings, setSelectedReadings] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'identified' | 'unidentified'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'confidence'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  useEffect(() => {
    if (activeTab === 'notes') {
      fetchSavedNotes();
    }
  }, [activeTab]);

  const getReadingKey = (readingId: number, traineeId: string) => `${readingId}-${traineeId}`;

  // Filtered and sorted readings
  const filteredReadings = useMemo(() => {
    let filtered = readings
      // הסתרת שקילות שכבר נשמרו כמדידה – אין צורך להציג אותן בדשבורד
      .filter(r => {
        if (!r.bestMatch) {
          return true;
        }
        const key = getReadingKey(r.reading.id, r.bestMatch.traineeId);
        return !hiddenReadings.has(key);
      });

    // Filter by source
    if (filterSource === 'identified') {
      filtered = filtered.filter(r => r.bestMatch !== null);
    } else if (filterSource === 'unidentified') {
      filtered = filtered.filter(r => r.bestMatch === null);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        if (r.bestMatch) {
          return r.bestMatch.traineeName.toLowerCase().includes(query) ||
                 r.reading.weight_kg?.toString().includes(query) ||
                 r.reading.notes?.toLowerCase().includes(query);
        }
        return r.reading.weight_kg?.toString().includes(query) ||
               r.reading.notes?.toLowerCase().includes(query);
      });
    }

    // Filter by date range
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(r => {
        const readingDate = new Date(r.timestamp);
        if (dateRange.start && readingDate < new Date(dateRange.start)) return false;
        if (dateRange.end && readingDate > new Date(dateRange.end)) return false;
        return true;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.timestamp.getTime() - b.timestamp.getTime();
      } else if (sortBy === 'weight') {
        comparison = (a.reading.weight_kg || 0) - (b.reading.weight_kg || 0);
      } else if (sortBy === 'confidence') {
        comparison = (a.bestMatch?.confidenceScore || 0) - (b.bestMatch?.confidenceScore || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [readings, filterSource, searchQuery, dateRange, sortBy, sortOrder]);

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedReadings.size === filteredReadings.length) {
      setSelectedReadings(new Set());
    } else {
      setSelectedReadings(new Set(filteredReadings.map(r => `${r.reading.id}-${r.bestMatch?.traineeId || 'unknown'}`)));
    }
  };

  const handleSelectReading = (key: string) => {
    setSelectedReadings(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleBulkSave = async () => {
    if (selectedReadings.size === 0 || !onSaveMeasurement) return;
    
    const readingsToSave = filteredReadings.filter(r => {
      const key = `${r.reading.id}-${r.bestMatch?.traineeId || 'unknown'}`;
      return selectedReadings.has(key) && r.bestMatch && !savedReadings.has(key);
    });

    for (const item of readingsToSave) {
      if (item.bestMatch) {
        const readingDate = new Date(item.reading.created_at).toISOString().split('T')[0];
        const success = await onSaveMeasurement(
          item.bestMatch.traineeId,
          item.bestMatch.traineeName,
          item.reading,
          readingDate
        );
        const key = `${item.reading.id}-${item.bestMatch.traineeId}`;
        if (success) {
          setSavedReadings(prev => new Set(prev).add(key));
          setHiddenReadings(prev => new Set(prev).add(key));
        }
      }
    }

    setSelectedReadings(new Set());
  };

  const handleExport = () => {
    const dataToExport = filteredReadings.map(r => ({
      date: r.timestamp.toISOString(),
      trainee: r.bestMatch?.traineeName || 'לא זוהה',
      weight: r.reading.weight_kg,
      bodyFat: r.reading.body_fat_percent,
      confidence: r.bestMatch?.confidenceScore || 0,
      notes: r.reading.notes || ''
    }));

    const csv = [
      ['תאריך', 'מתאמן', 'משקל (ק״ג)', 'אחוז שומן', 'רמת ביטחון', 'הערות'],
      ...dataToExport.map(d => [
        new Date(d.date).toLocaleDateString('he-IL'),
        d.trainee,
        d.weight?.toFixed(1) || '',
        d.bodyFat?.toFixed(1) || '',
        d.confidence.toString(),
        d.notes
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `שקילויות_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const fetchSavedNotes = async () => {
    setLoadingNotes(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myTrainees } = await supabase
        .from('trainees')
        .select('id, full_name')
        .eq('trainer_id', user.id);

      if (!myTrainees || myTrainees.length === 0) {
        setSavedNotes([]);
        return;
      }

      const traineeIds = myTrainees.map(t => t.id);
      const traineeNameMap = new Map(myTrainees.map(t => [t.id, t.full_name]));

      const { data: measurements } = await supabase
        .from('measurements')
        .select('id, trainee_id, measurement_date, weight, body_fat_percentage, notes')
        .in('trainee_id', traineeIds)
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('measurement_date', { ascending: false });

      const notes: SavedNote[] = (measurements || []).map(m => ({
        id: m.id,
        trainee_id: m.trainee_id,
        trainee_name: traineeNameMap.get(m.trainee_id) || 'לא ידוע',
        date: m.measurement_date,
        notes: m.notes || '',
        weight_kg: m.weight,
        body_fat_percent: m.body_fat_percentage
      }));

      setSavedNotes(notes);
    } catch (error) {
      logger.error('Error fetching notes:', error, 'RecentScaleReadings');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSave = async (e: React.MouseEvent, traineeId: string, traineeName: string, reading: ScaleReading) => {
    e.stopPropagation();
    if (!onSaveMeasurement) return;

    const readingDate = new Date(reading.created_at).toISOString().split('T')[0];
    setEditingDateReadingId(reading.id);
    setEditingDateTraineeId(traineeId);
    setEditingDateTraineeName(traineeName);
    setSelectedDate(readingDate);
    setNotesInput(reading.notes || '');
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

    const readingWithNotes = { ...reading, notes: notesInput };
    const success = await onSaveMeasurement(editingDateTraineeId, editingDateTraineeName, readingWithNotes, selectedDate);

    setSavingReadings(prev => {
      const next = new Set(prev);
      next.delete(readingKey);
      return next;
    });
    if (success) {
      setSavedReadings(prev => new Set(prev).add(readingKey));
      setHiddenReadings(prev => new Set(prev).add(readingKey));
      if (activeTab === 'notes') {
        fetchSavedNotes();
      }
    }

    setEditingDateReadingId(null);
    setEditingDateTraineeId(null);
    setEditingDateTraineeName(null);
    setSelectedDate('');
    setNotesInput('');
  };

  const renderSaveButton = (reading: ScaleReading, match: TraineeMatch) => {
    const readingKey = getReadingKey(reading.id, match.traineeId);
    const isSaved = savedReadings.has(readingKey);
    const isSaving = savingReadings.has(readingKey);

    if (isSaved) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 rounded-xl text-xs font-semibold shadow-sm">
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-teal-400 rounded-xl text-xs font-semibold transition-all duration-300 disabled:opacity-50 hover:scale-105 hover:shadow-lg"
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
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 bg-gradient-to-r from-emerald-500/20 to-teal-500/20';
    if (score >= 70) return 'text-teal-400 bg-gradient-to-r from-teal-500/20 to-cyan-500/20';
    if (score >= 50) return 'text-amber-400 bg-gradient-to-r from-amber-500/20 to-orange-500/20';
    return 'text-gray-400 bg-gray-500/20';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 70) return <CheckCircle className="h-4 w-4" />;
    if (score >= 50) return <AlertCircle className="h-4 w-4" />;
    return <HelpCircle className="h-4 w-4" />;
  };

  if (readings.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl p-6 shadow-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-teal-500/30 to-emerald-500/30 rounded-2xl shadow-lg">
            <Scale className="h-6 w-6 text-teal-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">שקילויות אחרונות</h3>
            <div className="flex items-center gap-2 text-sm mt-1">
              <span className={`inline-flex items-center gap-1.5 ${isListening ? 'text-emerald-400' : 'text-gray-500'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-gray-500'}`}></span>
                {isListening ? 'מוקשר' : 'לא מחובר'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="p-4 bg-gray-800/50 rounded-2xl inline-block mb-4">
            <Scale className="h-14 w-14 mx-auto text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium">אין קריאות אחרונות</p>
          <p className="text-sm text-gray-500 mt-2">קריאות חדשות יופיעו כאן באופן אוטומטי</p>
        </div>
      </div>
    );
  }

  const dateEditorModal = editingDateReadingId !== null && (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-sm mx-4 shadow-2xl border border-white/10 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500/30 to-emerald-500/30 shadow-lg">
              <Calendar className="h-6 w-6 text-teal-400" />
            </div>
            <h3 className="text-xl font-bold text-white">בחר תאריך</h3>
          </div>
          <button
            onClick={() => {
              setEditingDateReadingId(null);
              setEditingDateTraineeId(null);
              setEditingDateTraineeName(null);
              setSelectedDate('');
              setNotesInput('');
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {editingDateTraineeName && (
          <p className="text-sm text-gray-400 mb-6">שמירה עבור מתאמן: <span className="font-semibold text-white">{editingDateTraineeName}</span></p>
        )}

        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-300 mb-3">תאריך המדידה</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-800/80 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-300 mb-3">הערות (אופציונלי)</label>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="הוסף הערות על השקילה..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all duration-300 resize-none"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setEditingDateReadingId(null);
              setEditingDateTraineeId(null);
              setEditingDateTraineeName(null);
              setSelectedDate('');
              setNotesInput('');
            }}
            className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-700/50 hover:bg-gray-700 text-gray-300 transition-all duration-300"
          >
            ביטול
          </button>
          <button
            onClick={handleConfirmSave}
            disabled={savingReadings.has(`${editingDateReadingId}-${editingDateTraineeId}`)}
            className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]"
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
      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl p-6 shadow-xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500/30 to-emerald-500/30 rounded-2xl shadow-lg">
              <Scale className="h-6 w-6 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">שקילויות והערות</h3>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className={`inline-flex items-center gap-1.5 ${isListening ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${isListening ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-gray-500'}`}></span>
                  {isListening ? 'מוקשר' : 'לא מחובר'}
                </span>
              </div>
            </div>
          </div>
          <span className="text-sm text-gray-500 bg-gray-800/50 px-3 py-1.5 rounded-xl font-medium">
            {activeTab === 'readings' ? `${readings.length} קריאות` : `${savedNotes.length} הערות`}
          </span>
        </div>

        <div className="flex gap-2 mb-6 bg-gray-800/50 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('readings')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'readings'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Scale className="h-4 w-4" />
            שקילויות אחרונות
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'notes'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            הערות שמורות
          </button>
        </div>

        {activeTab === 'readings' && (
          <div className="mb-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="חיפוש לפי שם, משקל או הערות..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                  />
                </div>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                  showFilters
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-gray-800/50 text-gray-400 border border-gray-700/50 hover:bg-gray-700/50'
                }`}
              >
                <Filter className="h-4 w-4" />
                סינון
              </button>

              {selectedReadings.size > 0 && (
                <>
                  <button
                    onClick={handleBulkSave}
                    className="px-4 py-2 rounded-xl font-semibold text-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    שמור נבחרים ({selectedReadings.size})
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-4 py-2 rounded-xl font-semibold text-sm bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    ייצא
                  </button>
                </>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">מקור</label>
                    <select
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value as any)}
                      className="w-full px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50"
                    >
                      <option value="all">הכל</option>
                      <option value="identified">זוהו</option>
                      <option value="unidentified">לא זוהו</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">מיון לפי</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50"
                    >
                      <option value="date">תאריך</option>
                      <option value="weight">משקל</option>
                      <option value="confidence">רמת ביטחון</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">סדר</label>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="w-full px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white hover:bg-gray-700/50 transition-all flex items-center justify-center gap-2"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      {sortOrder === 'asc' ? 'עולה' : 'יורד'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">תאריך התחלה</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">תאריך סיום</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-4 py-2 rounded-xl bg-gray-800/80 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'readings' ? (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {filteredReadings.length > 0 && (
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {selectedReadings.size === filteredReadings.length ? (
                    <CheckSquare className="h-4 w-4 text-teal-400" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  בחר הכל ({filteredReadings.length})
                </button>
                <span className="text-sm text-gray-500">
                  מוצג {filteredReadings.length} מתוך {readings.length}
                </span>
              </div>
            )}
            {filteredReadings.map((item, index) => {
              const readingKey = `${item.reading.id}-${item.bestMatch?.traineeId || 'unknown'}`;
              const isSelected = selectedReadings.has(readingKey);
              return (
            <div
              key={`${item.reading.id}-${index}`}
              className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl ${
                isSelected
                  ? 'border-teal-500/50 bg-gradient-to-br from-teal-500/10 to-emerald-500/10'
                  : item.bestMatch
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10 hover:border-emerald-500/50'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
              } ${item.bestMatch && onTraineeClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
              onClick={() => item.bestMatch && onTraineeClick?.(item.bestMatch.traineeId)}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectReading(readingKey);
                  }}
                  className="mr-2"
                >
                  {isSelected ? (
                    <CheckSquare className="h-5 w-5 text-teal-400" />
                  ) : (
                    <Square className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl shadow-lg ${item.bestMatch ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30' : 'bg-gray-700/50'}`}>
                    {item.bestMatch ? (
                      <User className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <HelpCircle className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    {item.bestMatch ? (
                      <>
                        <p className="font-semibold text-white text-lg">{item.bestMatch.traineeName}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                          <span className="font-medium">{item.reading.weight_kg?.toFixed(1)} ק״ג</span>
                          {item.reading.body_fat_percent && (
                            <>
                              <span className="text-gray-600">|</span>
                              <span>{item.reading.body_fat_percent?.toFixed(1)}% שומן</span>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-300">לא זוהה</p>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                          <span className="font-medium">{item.reading.weight_kg?.toFixed(1)} ק״ג</span>
                          {item.reading.body_fat_percent && (
                            <>
                              <span className="text-gray-600">|</span>
                              <span>{item.reading.body_fat_percent?.toFixed(1)}% שומן</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-sm text-gray-400 font-medium">{formatDate(item.timestamp)}</p>
                    <p className="text-xs text-gray-500">{formatTime(item.timestamp)}</p>
                  </div>
                  {item.bestMatch && (
                    <>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${getConfidenceColor(item.bestMatch.confidenceScore)}`}>
                        {getConfidenceIcon(item.bestMatch.confidenceScore)}
                        {item.bestMatch.confidenceScore}%
                      </span>
                      {onSaveMeasurement && renderSaveButton(item.reading, item.bestMatch)}
                      {onTraineeClick && (
                        <ChevronLeft className="h-5 w-5 text-gray-500" />
                      )}
                    </>
                  )}
                </div>
              </div>

              {item.matches.length > 1 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-3 font-medium">התאמות נוספות:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.matches.slice(1, 4).map((match) => (
                      <div key={match.traineeId} className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTraineeClick?.(match.traineeId);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl text-xs transition-all duration-300 hover:scale-105"
                        >
                          <span className="text-gray-300 font-medium">{match.traineeName}</span>
                          <span className="text-gray-500">({match.confidenceScore}%)</span>
                        </button>
                        {onSaveMeasurement && renderSaveButton(item.reading, match)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
              );
            })}
            {filteredReadings.length === 0 && readings.length > 0 && (
              <div className="text-center py-12">
                <Filter className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium">אין תוצאות לפי הסינון שנבחר</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterSource('all');
                    setDateRange({ start: '', end: '' });
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  נקה סינון
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {loadingNotes ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 mx-auto text-teal-400 animate-spin mb-4" />
                <p className="text-gray-400 font-medium">טוען הערות...</p>
              </div>
            ) : savedNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gray-800/50 rounded-2xl inline-block mb-4">
                  <FileText className="h-14 w-14 mx-auto text-gray-600" />
                </div>
                <p className="text-gray-400 font-medium">אין הערות שמורות</p>
                <p className="text-sm text-gray-500 mt-2">הערות ששמרת על שקילות יופיעו כאן</p>
              </div>
            ) : (
              savedNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-xl"
                  onClick={() => onTraineeClick?.(note.trainee_id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 shadow-lg">
                        <User className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-lg">{note.trainee_name}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                          <span className="font-medium">{note.weight_kg?.toFixed(1)} ק״ג</span>
                          {note.body_fat_percent && (
                            <>
                              <span className="text-gray-600">|</span>
                              <span>{note.body_fat_percent?.toFixed(1)}% שומן</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-400 font-medium">
                        {new Date(note.date).toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-teal-400 mt-1 flex-shrink-0" />
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{note.notes}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}
