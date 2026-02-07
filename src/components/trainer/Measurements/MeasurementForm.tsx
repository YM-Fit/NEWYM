import { ArrowRight, Save, Scale, User, CheckCircle, TrendingDown, TrendingUp, Minus, RefreshCw, AlertTriangle, X, Check, Volume2, VolumeX, Wifi, WifiOff, Loader2, Server, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Trainee, BodyMeasurement } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { useScaleListener } from '../../../hooks/useScaleListener';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { useScaleSound } from '../../../hooks/useScaleSound';
import AutoSaveIndicator from '../../common/AutoSaveIndicator';
import DraftModal from '../../common/DraftModal';
import { calculateMetabolicAge, getMetabolicAgeMessage } from '../../../utils/metabolicAge';
import { logger } from '../../../utils/logger';

interface MeasurementFormProps {
  trainee: Trainee;
  onBack: () => void;
  onSave: (measurement: BodyMeasurement) => void;
  previousMeasurement?: BodyMeasurement;
  editingMeasurement?: BodyMeasurement;
}

export default function MeasurementForm({ trainee, onBack, onSave, previousMeasurement, editingMeasurement }: MeasurementFormProps) {
  const isEditing = !!editingMeasurement;
  const sourceMeasurement = editingMeasurement || previousMeasurement;

  const [selectedMember, setSelectedMember] = useState<'member_1' | 'member_2' | 'both' | null>(
    trainee.isPair
      ? (sourceMeasurement?.pairMember === null
          ? 'both'
          : sourceMeasurement?.pairMember || 'both')
      : null
  );
  const [measurementDate, setMeasurementDate] = useState<string>(
    sourceMeasurement?.date || new Date().toISOString().split('T')[0]
  );
  const [formData, setFormData] = useState({
    weight: sourceMeasurement?.weight || 0,
    bodyFat: sourceMeasurement?.bodyFat || 0,
    muscleMass: sourceMeasurement?.muscleMass || 0,
    waterPercentage: sourceMeasurement?.waterPercentage || 0,
    bmr: sourceMeasurement?.bmr || 0,
    source: (sourceMeasurement?.source || 'manual') as 'tanita' | 'manual',
    notes: sourceMeasurement?.notes || '',
    measurements: {
      chestBack: sourceMeasurement?.measurements?.chestBack || 0,
      belly: sourceMeasurement?.measurements?.belly || 0,
      glutes: sourceMeasurement?.measurements?.glutes || 0,
      thigh: sourceMeasurement?.measurements?.thigh || 0,
      rightArm: sourceMeasurement?.measurements?.rightArm || 0,
      leftArm: sourceMeasurement?.measurements?.leftArm || 0,
    }
  });

  const [showScaleDataToast, setShowScaleDataToast] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);
  const [pendingScaleData, setPendingScaleData] = useState<any>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [waitingForScale, setWaitingForScale] = useState(true);
  const [waitingStartTime] = useState(new Date());
  const [elapsedWaitingTime, setElapsedWaitingTime] = useState(0);

  const { latestReading, connectionStatus, scriptStatus, refreshConnection, isStabilizing, retryAttempt, maxRetries } = useScaleListener();
  const { playDataReceived, playWarning, setEnabled: setSoundEnabledHook, isEnabled: isSoundEnabled } = useScaleSound();
  const hasReceivedDataRef = useRef(false);

  const { lastSaved, isDirty, clearSaved, loadSaved } = useAutoSave({
    data: { formData, selectedMember, measurementDate },
    localStorageKey: `measurement_draft_${trainee.id}`,
    enabled: !isEditing,
  });

  useEffect(() => {
    if (!isEditing) {
      const saved = loadSaved();
      if (saved && saved.formData && saved.formData.weight > 0) {
        setDraftData(saved);
        setShowDraftModal(true);
      }
    }
  }, []);

  const handleRestoreDraft = () => {
    if (draftData) {
      setFormData(draftData.formData);
      if (draftData.selectedMember) {
        setSelectedMember(draftData.selectedMember);
      }
      if (draftData.measurementDate) {
        setMeasurementDate(draftData.measurementDate);
      }
      setShowDraftModal(false);
      setDraftData(null);
    }
  };

  const handleDiscardDraft = () => {
    clearSaved();
    setShowDraftModal(false);
    setDraftData(null);
  };

  useEffect(() => {
    if (isEditing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && formData.weight > 0) {
        e.preventDefault();
        e.returnValue = 'יש שינויים שלא נשמרו. בטוח שברצונך לצאת?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, formData.weight, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    const interval = setInterval(() => {
      if (waitingForScale) {
        setElapsedWaitingTime(Math.floor((Date.now() - waitingStartTime.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [waitingForScale, waitingStartTime, isEditing]);

  useEffect(() => {
    setSoundEnabled(isSoundEnabled());
  }, [isSoundEnabled]);

  useEffect(() => {
    if (latestReading && !isEditing) {
      const fatFreeMass = latestReading.fat_free_mass_kg || 0;
      const calculatedMuscleMass = fatFreeMass > 0 ? fatFreeMass : 0;

      const warnings: string[] = [];
      if (latestReading.weight_kg && (latestReading.weight_kg < 20 || latestReading.weight_kg > 300)) {
        warnings.push(`משקל חריג: ${latestReading.weight_kg} ק"ג`);
      }
      if (latestReading.body_fat_percent && (latestReading.body_fat_percent < 3 || latestReading.body_fat_percent > 60)) {
        warnings.push(`אחוז שומן חריג: ${latestReading.body_fat_percent}%`);
      }

      const newData = {
        weight: latestReading.weight_kg || 0,
        bodyFat: latestReading.body_fat_percent || 0,
        muscleMass: calculatedMuscleMass || 0,
        waterPercentage: latestReading.water_percent || 0,
      };

      if (warnings.length > 0) {
        playWarning();
      } else {
        playDataReceived();
      }

      setPendingScaleData(newData);
      setValidationWarnings(warnings);
      setShowValidationWarning(warnings.length > 0);
      setShowScaleDataToast(true);
      setWaitingForScale(false);
      hasReceivedDataRef.current = true;
    }
  }, [latestReading, isEditing, playDataReceived, playWarning]);

  const acceptScaleData = () => {
    if (pendingScaleData) {
      const fieldsToHighlight: string[] = [];
      if (pendingScaleData.weight) fieldsToHighlight.push('weight');
      if (pendingScaleData.bodyFat) fieldsToHighlight.push('bodyFat');
      if (pendingScaleData.muscleMass) fieldsToHighlight.push('muscleMass');
      if (pendingScaleData.waterPercentage) fieldsToHighlight.push('waterPercentage');

      setFormData(prev => ({
        ...prev,
        ...pendingScaleData,
        source: 'tanita',
      }));

      setHighlightedFields(fieldsToHighlight);
      setTimeout(() => setHighlightedFields([]), 2500);

      setPendingScaleData(null);
      setShowScaleDataToast(false);
      setShowValidationWarning(false);
    }
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    setSoundEnabledHook(newValue);
  };

  const formatWaitingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs} שניות`;
  };

  const getWeightChangeDisplay = (current: number, previous?: number): { text: string; color: string } | null => {
    if (!previous || !current) return null;
    const change = current - previous;
    if (Math.abs(change) < 0.1) return null;
    const text = `${change > 0 ? '+' : ''}${change.toFixed(1)} ק"ג`;
    const color = change > 0 ? 'text-red-300' : 'text-emerald-300';
    return { text, color };
  };

  const getBodyFatChangeDisplay = (current: number, previous?: number): { text: string; color: string } | null => {
    if (!previous || !current) return null;
    const change = current - previous;
    if (Math.abs(change) < 0.1) return null;
    const text = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    const color = change > 0 ? 'text-red-300' : 'text-emerald-300';
    return { text, color };
  };

  const rejectScaleData = () => {
    setPendingScaleData(null);
    setShowScaleDataToast(false);
    setShowValidationWarning(false);
  };

  const calculateBMI = (weight: number, height: number) => {
    if (weight && height) {
      return Number((weight / Math.pow(height / 100, 2)).toFixed(1));
    }
    return 0;
  };

  const calculateBMR = (weight: number, height: number, age: number, gender: 'male' | 'female') => {
    if (!weight || !height || !age) return 0;
    const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
    const bmr = gender === 'male' ? baseBMR + 5 : baseBMR - 161;
    return Number(bmr.toFixed(1));
  };

  const handleSubmit = async () => {
    // ולידציה למתאמנים זוגיים
    if (trainee.isPair) {
      if (!selectedMember || selectedMember === 'both') {
        alert('יש לבחור בן זוג ספציפי למדידה (member_1 או member_2)');
        return;
      }
      if (selectedMember !== 'member_1' && selectedMember !== 'member_2') {
        alert('יש לבחור בן זוג תקין למדידה');
        return;
      }
    }

    const height = trainee.isPair
      ? (selectedMember === 'member_1' ? trainee.pairHeight1 : selectedMember === 'member_2' ? trainee.pairHeight2 : trainee.pairHeight1)
      : trainee.height;

    const age = trainee.isPair
      ? (selectedMember === 'member_1' ? trainee.pairAge1 : selectedMember === 'member_2' ? trainee.pairAge2 : trainee.pairAge1)
      : trainee.age;

    const gender = trainee.isPair
      ? (selectedMember === 'member_1' ? trainee.pairGender1 : selectedMember === 'member_2' ? trainee.pairGender2 : trainee.pairGender1)
      : trainee.gender;

    const bmi = calculateBMI(formData.weight, height || 0);
    const bmr = calculateBMR(formData.weight, height || 0, age || 0, gender as 'male' | 'female');
    const metabolicAge = bmr > 0 && age && height && formData.weight ? calculateMetabolicAge({
      actualAge: age,
      gender: gender as 'male' | 'female',
      weight: formData.weight,
      height: height,
      bmr: bmr,
      bodyFatPercentage: formData.bodyFat || undefined,
      muscleMass: formData.muscleMass || undefined,
      waterPercentage: formData.waterPercentage || undefined,
      bmi: bmi || undefined,
    }) : null;

    const measurementData = {
      trainee_id: trainee.id,
      measurement_date: measurementDate,
      weight: formData.weight || null,
      body_fat_percentage: formData.bodyFat || null,
      muscle_mass: formData.muscleMass || null,
      water_percentage: formData.waterPercentage || null,
      bmr: bmr || null,
      bmi: bmi || null,
      metabolic_age: metabolicAge,
      source: formData.source,
      notes: formData.notes || null,
      chest_back: formData.measurements.chestBack || null,
      belly: formData.measurements.belly || null,
      glutes: formData.measurements.glutes || null,
      thigh: formData.measurements.thigh || null,
      right_arm: formData.measurements.rightArm || null,
      left_arm: formData.measurements.leftArm || null,
      pair_member: trainee.isPair ? (selectedMember === 'both' ? null : selectedMember) : null,
    };

    const { data, error } = isEditing
      ? await supabase
          .from('measurements')
          .update(measurementData)
          .eq('id', editingMeasurement.id)
          .select()
          .single()
      : await supabase
          .from('measurements')
          .insert([measurementData])
      .select()
      .single();

    if (error) {
      logger.error('Error saving measurement', error, 'MeasurementForm');
      alert('שגיאה בשמירת המדידה');
      return;
    }

    if (data) {
      const responseData = data;
      const measurement: BodyMeasurement = {
        id: responseData.id,
        traineeId: trainee.id,
        date: responseData.measurement_date,
        weight: responseData.weight || 0,
        bodyFat: responseData.body_fat_percentage || undefined,
        muscleMass: responseData.muscle_mass || undefined,
        waterPercentage: responseData.water_percentage || undefined,
        bmr: responseData.bmr || undefined,
        bmi: responseData.bmi || undefined,
        metabolicAge: responseData.metabolic_age || undefined,
        source: responseData.source as 'tanita' | 'manual',
        notes: responseData.notes || undefined,
        pairMember: responseData.pair_member || undefined,
        measurements: {
          chestBack: responseData.chest_back || 0,
          belly: responseData.belly || 0,
          glutes: responseData.glutes || 0,
          thigh: responseData.thigh || 0,
          rightArm: responseData.right_arm || 0,
          leftArm: responseData.left_arm || 0,
        }
      };

      clearSaved();
      onSave(measurement);
    }
  };

  const getChangeIndicator = (current: number, previous?: number) => {
    if (!previous || !current) return null;
    const change = current - previous;
    if (Math.abs(change) < 0.1) return null;

    return (
      <span className={`text-sm font-medium ${change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
        ({change > 0 ? '+' : ''}{change.toFixed(1)})
      </span>
    );
  };

  const inputClass = (hasHighlight: boolean) =>
    `w-full p-4 text-xl bg-surface border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 transition-all ${
      hasHighlight
        ? 'border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30'
        : 'border-border focus:border-emerald-500/50 focus:ring-emerald-500/20'
    }`;

  const labelClass = "block text-sm font-medium text-muted mb-2";

  return (
    <div className="space-y-6 animate-fade-in">
      {isStabilizing && !showScaleDataToast && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-80 bg-blue-500/90 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-pulse border border-blue-400/50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <p className="font-bold">המשקל מתייצב...</p>
              <p className="text-sm opacity-90">אנא המתן</p>
            </div>
          </div>
        </div>
      )}

      {showScaleDataToast && pendingScaleData && (
        <div className={`fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-96 ${
          showValidationWarning ? 'bg-amber-500/90' : 'bg-emerald-500/90'
        } backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-slide-in-top border ${
          showValidationWarning ? 'border-amber-400/50' : 'border-emerald-400/50'
        }`}>
          <div className="flex items-start gap-3 mb-3">
            {showValidationWarning ? (
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-6 w-6 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-bold text-lg">
                {showValidationWarning ? 'התקבלו נתונים חריגים!' : 'נתונים התקבלו מהמשקל'}
              </p>
              <div className="text-sm mt-1 space-y-1">
                {pendingScaleData.weight > 0 && (
                  <p className="flex items-center gap-2">
                    <span>{pendingScaleData.weight.toFixed(1)} ק״ג</span>
                    {previousMeasurement?.weight && (() => {
                      const change = getWeightChangeDisplay(pendingScaleData.weight, previousMeasurement.weight);
                      return change ? <span className={change.color}>({change.text})</span> : null;
                    })()}
                  </p>
                )}
                {pendingScaleData.bodyFat > 0 && (
                  <p className="flex items-center gap-2">
                    <span>{pendingScaleData.bodyFat.toFixed(1)}% שומן</span>
                    {previousMeasurement?.bodyFat && (() => {
                      const change = getBodyFatChangeDisplay(pendingScaleData.bodyFat, previousMeasurement.bodyFat);
                      return change ? <span className={change.color}>({change.text})</span> : null;
                    })()}
                  </p>
                )}
              </div>
              {showValidationWarning && validationWarnings.length > 0 && (
                <div className="mt-2 text-xs opacity-90">
                  {validationWarnings.map((warning, idx) => (
                    <p key={idx}>* {warning}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptScaleData}
              className="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <Check className="h-4 w-4" />
              <span>אשר</span>
            </button>
            <button
              onClick={rejectScaleData}
              className="flex-1 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
            >
              <X className="h-4 w-4" />
              <span>דחה</span>
            </button>
          </div>
        </div>
      )}

      <div className="premium-card-static p-6 sticky top-0 z-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="p-3 rounded-xl bg-surface text-muted hover:text-foreground hover:bg-elevated/50 transition-all"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  {isEditing ? 'עריכת מדידה' : 'מדידה חדשה'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{trainee.name}</h1>
              {!isEditing && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`flex items-center gap-1 text-xs ${
                      connectionStatus === 'connected' ? 'text-emerald-400' :
                      connectionStatus === 'stale' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {connectionStatus === 'connected' ? (
                        <Wifi className="h-3.5 w-3.5" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {connectionStatus === 'connected' && 'Realtime מחובר'}
                        {connectionStatus === 'stale' && 'לא התקבלו נתונים'}
                        {connectionStatus === 'disconnected' && 'לא מחובר'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-1 text-xs ${
                      scriptStatus.isOnline ? 'text-emerald-400' : 'text-muted'
                    }`}>
                      <Server className="h-3.5 w-3.5" />
                      <span>
                        {scriptStatus.isOnline ? `${scriptStatus.deviceName} פעיל` : 'סקריפט לא פעיל'}
                      </span>
                    </div>

                    {retryAttempt > 0 && connectionStatus === 'disconnected' && (
                      <div className="flex items-center gap-1 text-xs text-amber-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>ניסיון {retryAttempt + 1}/{maxRetries}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={refreshConnection}
                        className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                        title="רענן חיבור"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-muted hover:text-foreground" />
                      </button>
                      <button
                        onClick={toggleSound}
                        className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                        title={soundEnabled ? 'השתק צלילים' : 'הפעל צלילים'}
                      >
                        {soundEnabled ? (
                          <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <VolumeX className="h-3.5 w-3.5 text-muted" />
                        )}
                      </button>
                    </div>
                  </div>

                  {waitingForScale && !hasReceivedDataRef.current && formData.weight === 0 && (
                    <div className="bg-blue-500/15 border border-blue-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-blue-400 animate-bounce" />
                      <span className="text-sm text-blue-400">
                        ממתין לשקילה... ({formatWaitingTime(elapsedWaitingTime)})
                      </span>
                    </div>
                  )}
                </div>
              )}
              {!isEditing && <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-emerald-400" />
            <input
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-foreground text-sm transition-all"
            />
          </div>
        </div>
      </div>

      {trainee.isPair && (
        <div className="premium-card-static p-5">
          <h3 className="text-sm font-medium text-muted mb-4">מי מתשקל/ת?</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedMember('both')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMember === 'both'
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-border bg-surface/30 hover:border-border-hover'
              }`}
            >
              <User className={`h-8 w-8 mx-auto mb-2 ${
                selectedMember === 'both' ? 'text-emerald-400' : 'text-muted'
              }`} />
              <p className={`font-semibold text-sm text-center ${
                selectedMember === 'both' ? 'text-emerald-400' : 'text-muted'
              }`}>{trainee.pairName1} + {trainee.pairName2}</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMember('member_1')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMember === 'member_1'
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-border bg-surface/30 hover:border-border-hover'
              }`}
            >
              <User className={`h-8 w-8 mx-auto mb-2 ${
                selectedMember === 'member_1' ? 'text-blue-400' : 'text-muted'
              }`} />
              <p className={`font-semibold text-sm ${
                selectedMember === 'member_1' ? 'text-blue-400' : 'text-muted'
              }`}>{trainee.pairName1}</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMember('member_2')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMember === 'member_2'
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-border bg-surface/30 hover:border-border-hover'
              }`}
            >
              <User className={`h-8 w-8 mx-auto mb-2 ${
                selectedMember === 'member_2' ? 'text-amber-400' : 'text-muted'
              }`} />
              <p className={`font-semibold text-sm ${
                selectedMember === 'member_2' ? 'text-amber-400' : 'text-muted'
              }`}>{trainee.pairName2}</p>
            </button>
          </div>
        </div>
      )}

      <div className="premium-card-static p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">מקור המדידה</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, source: 'tanita' }))}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all ${
              formData.source === 'tanita'
                ? 'bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/50'
                : 'bg-surface/30 text-muted border-2 border-border hover:border-border-hover'
            }`}
          >
            <Scale className="h-5 w-5" />
            <span className="font-medium">Tanita</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, source: 'manual' }))}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all ${
              formData.source === 'manual'
                ? 'bg-emerald-500/15 text-emerald-400 border-2 border-emerald-500/50'
                : 'bg-surface/30 text-muted border-2 border-border hover:border-border-hover'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="font-medium">מדידה ידנית</span>
          </button>
        </div>
      </div>

      <div className="premium-card-static p-5">
        <h3 className="text-lg font-semibold text-foreground mb-6">מדידות בסיסיות</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className={highlightedFields.includes('weight') ? 'animate-highlight-pulse' : ''}>
            <label className={labelClass}>
              משקל (ק״ג) *
              {getChangeIndicator(formData.weight, previousMeasurement?.weight)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.weight || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: Number(e.target.value) }))}
              className={inputClass(highlightedFields.includes('weight'))}
              placeholder="0.0"
              required
            />
          </div>

          <div>
            <label className={labelClass}>גובה (ס״מ)</label>
            <div className="w-full p-4 text-xl bg-surface/30 border border-border rounded-xl text-muted">
              {(() => {
                const height = trainee.isPair
                  ? (selectedMember === 'member_1' ? trainee.pairHeight1 : selectedMember === 'member_2' ? trainee.pairHeight2 : trainee.pairHeight1)
                  : trainee.height;
                return height || 'לא הוגדר';
              })()}
            </div>
            <p className="text-xs text-muted mt-1">הגובה נשמר בפרופיל המתאמן</p>
          </div>

          <div className={highlightedFields.includes('bodyFat') ? 'animate-highlight-pulse' : ''}>
            <label className={labelClass}>
              אחוז שומן (%)
              {getChangeIndicator(formData.bodyFat, previousMeasurement?.bodyFat)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.bodyFat || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bodyFat: Number(e.target.value) }))}
              className={inputClass(highlightedFields.includes('bodyFat'))}
              placeholder="0.0"
            />
          </div>

          <div className={highlightedFields.includes('muscleMass') ? 'animate-highlight-pulse' : ''}>
            <label className={labelClass}>
              מסת שריר (ק״ג)
              {getChangeIndicator(formData.muscleMass, previousMeasurement?.muscleMass)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.muscleMass || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, muscleMass: Number(e.target.value) }))}
              className={inputClass(highlightedFields.includes('muscleMass'))}
              placeholder="0.0"
            />
          </div>

          <div className={highlightedFields.includes('waterPercentage') ? 'animate-highlight-pulse' : ''}>
            <label className={labelClass}>
              אחוז מים (%)
              {getChangeIndicator(formData.waterPercentage, previousMeasurement?.waterPercentage)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.waterPercentage || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, waterPercentage: Number(e.target.value) }))}
              className={inputClass(highlightedFields.includes('waterPercentage'))}
              placeholder="0.0"
            />
          </div>

          <div>
            <label className={labelClass}>
              BMR (קלוריות בסיסיות)
              <span className="text-xs text-muted mr-2">(מחושב אוטומטית)</span>
            </label>
            <div className="w-full p-4 text-xl bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 font-semibold">
              {(() => {
                const height = trainee.isPair
                  ? (selectedMember === 'member_1' ? trainee.pairHeight1 : selectedMember === 'member_2' ? trainee.pairHeight2 : trainee.pairHeight1)
                  : trainee.height;
                const age = trainee.isPair
                  ? (selectedMember === 'member_1' ? trainee.pairAge1 : selectedMember === 'member_2' ? trainee.pairAge2 : trainee.pairAge1)
                  : trainee.age;
                const gender = trainee.isPair
                  ? (selectedMember === 'member_1' ? trainee.pairGender1 : selectedMember === 'member_2' ? trainee.pairGender2 : trainee.pairGender1)
                  : trainee.gender;
                return calculateBMR(formData.weight, height || 0, age || 0, gender as 'male' | 'female') || '0';
              })()}
            </div>
          </div>

          <div>
            <label className={labelClass}>
              גיל מטבולי
              <span className="text-xs text-muted mr-2">(מחושב אוטומטית)</span>
            </label>
            {(() => {
              const height = trainee.isPair
                ? (selectedMember === 'member_1' ? trainee.pairHeight1 : selectedMember === 'member_2' ? trainee.pairHeight2 : trainee.pairHeight1)
                : trainee.height;
              const age = trainee.isPair
                ? (selectedMember === 'member_1' ? trainee.pairAge1 : selectedMember === 'member_2' ? trainee.pairAge2 : trainee.pairAge1)
                : trainee.age;
              const gender = trainee.isPair
                ? (selectedMember === 'member_1' ? trainee.pairGender1 : selectedMember === 'member_2' ? trainee.pairGender2 : trainee.pairGender1)
                : trainee.gender;

              const bmr = calculateBMR(formData.weight, height || 0, age || 0, gender as 'male' | 'female');

              if (bmr > 0 && age && formData.weight && height) {
                const inputs = {
                  actualAge: age,
                  gender: gender as 'male' | 'female',
                  weight: formData.weight,
                  height: height,
                  bmr: bmr,
                  bodyFatPercentage: formData.bodyFat || undefined,
                  muscleMass: formData.muscleMass || undefined,
                  waterPercentage: formData.waterPercentage || undefined,
                  bmi: calculateBMI(formData.weight, height),
                };
                const metabolicAge = calculateMetabolicAge(inputs);
                const message = getMetabolicAgeMessage(metabolicAge, age, inputs);

                const statusColors = {
                  excellent: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
                  good: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                  'needs-improvement': 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                };

                const statusIcons = {
                  excellent: <TrendingDown className="h-5 w-5 inline mr-2" />,
                  good: <Minus className="h-5 w-5 inline mr-2" />,
                  'needs-improvement': <TrendingUp className="h-5 w-5 inline mr-2" />
                };

                return (
                  <div>
                    <div className={`w-full p-4 text-xl border rounded-xl font-bold ${statusColors[message.status]}`}>
                      {metabolicAge} שנים
                      {statusIcons[message.status]}
                    </div>
                    <p className={`mt-2 text-sm font-medium ${
                      message.status === 'excellent' ? 'text-emerald-400' :
                      message.status === 'good' ? 'text-blue-400' :
                      'text-amber-400'
                    }`}>
                      {message.text}
                    </p>
                    {message.recommendations && message.recommendations.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {message.recommendations.map((rec, idx) => (
                          <p key={idx} className="text-xs text-muted flex items-start">
                            <span className="mr-1">*</span>
                            <span>{rec}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="w-full p-4 text-xl bg-surface/30 border border-border rounded-xl text-muted font-semibold">
                  נדרש משקל וגובה לחישוב
                </div>
              );
            })()}
          </div>

          <div>
            <label className={labelClass}>
              BMI
              <span className="text-xs text-muted mr-2">(מחושב אוטומטית)</span>
            </label>
            <div className="w-full p-4 text-xl bg-surface/30 border border-border rounded-xl text-foreground font-semibold">
              {(() => {
                const height = trainee.isPair
                  ? (selectedMember === 'member_1' ? trainee.pairHeight1 : selectedMember === 'member_2' ? trainee.pairHeight2 : trainee.pairHeight1)
                  : trainee.height;
                return calculateBMI(formData.weight, height || 0) || '0.0';
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card-static p-5">
        <h3 className="text-lg font-semibold text-foreground mb-4">הערות למדידה</h3>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full p-4 bg-surface border border-border rounded-xl text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all resize-none"
          rows={3}
          placeholder="הערות על השקילה, התקדמות, מצב כללי..."
        />
      </div>

      <div className="premium-card-static p-5">
        <h3 className="text-lg font-semibold text-foreground mb-6">מדידות היקפים (ס״מ)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className={labelClass}>
              חזה/גב
              {getChangeIndicator(formData.measurements.chestBack, previousMeasurement?.measurements?.chestBack)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={formData.measurements.chestBack || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                measurements: { ...prev.measurements, chestBack: Number(e.target.value) }
              }))}
              className={inputClass(false)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelClass}>
              פופיק
              {getChangeIndicator(formData.measurements.belly, previousMeasurement?.measurements?.belly)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={formData.measurements.belly || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                measurements: { ...prev.measurements, belly: Number(e.target.value) }
              }))}
              className={inputClass(false)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelClass}>
              ישבן
              {getChangeIndicator(formData.measurements.glutes, previousMeasurement?.measurements?.glutes)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={formData.measurements.glutes || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                measurements: { ...prev.measurements, glutes: Number(e.target.value) }
              }))}
              className={inputClass(false)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelClass}>
              ירך
              {getChangeIndicator(formData.measurements.thigh, previousMeasurement?.measurements?.thigh)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={formData.measurements.thigh || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                measurements: { ...prev.measurements, thigh: Number(e.target.value) }
              }))}
              className={inputClass(false)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelClass}>
              יד ימין
              {getChangeIndicator(formData.measurements.rightArm, previousMeasurement?.measurements?.rightArm)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={formData.measurements.rightArm || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                measurements: { ...prev.measurements, rightArm: Number(e.target.value) }
              }))}
              className={inputClass(false)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelClass}>
              יד שמאל
              {getChangeIndicator(formData.measurements.leftArm, previousMeasurement?.measurements?.leftArm)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={formData.measurements.leftArm || ''}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                measurements: { ...prev.measurements, leftArm: Number(e.target.value) }
              }))}
              className={inputClass(false)}
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!formData.weight}
          className="w-full btn-primary py-5 rounded-xl text-xl font-semibold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-6 w-6" />
          <span>שמור מדידה</span>
        </button>
      </div>

      {showDraftModal && (
        <DraftModal
          title="נמצאה טיוטה"
          message="נמצאה טיוטת מדידה שנשמרה מהפעם הקודמת. האם ברצונך לטעון אותה או להתחיל מדידה חדשה?"
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
    </div>
  );
}
