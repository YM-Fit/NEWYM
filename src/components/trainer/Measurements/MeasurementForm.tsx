import { ArrowRight, Save, Scale, User, CheckCircle, TrendingDown, TrendingUp, Minus, RefreshCw, AlertTriangle, X, Check, Volume2, VolumeX, Wifi, WifiOff, Loader2, Server } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Trainee, BodyMeasurement } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { useScaleListener, findTraineeByWeight, TraineeMatch } from '../../../hooks/useScaleListener';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { useScaleSound } from '../../../hooks/useScaleSound';
import AutoSaveIndicator from '../../common/AutoSaveIndicator';
import DraftModal from '../../common/DraftModal';
import { calculateMetabolicAge, getMetabolicAgeMessage } from '../../../utils/metabolicAge';

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
  const [traineeMatches, setTraineeMatches] = useState<TraineeMatch[]>([]);
  const [showTraineeMatchPopup, setShowTraineeMatchPopup] = useState(false);
  const [waitingForScale, setWaitingForScale] = useState(true);
  const [waitingStartTime] = useState(new Date());
  const [elapsedWaitingTime, setElapsedWaitingTime] = useState(0);

  const { latestReading, isListening, connectionStatus, scriptStatus, lastDataReceived, refreshConnection, isStabilizing, retryAttempt, maxRetries } = useScaleListener();
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
    const color = change > 0 ? 'text-red-300' : 'text-green-300';
    return { text, color };
  };

  const getBodyFatChangeDisplay = (current: number, previous?: number): { text: string; color: string } | null => {
    if (!previous || !current) return null;
    const change = current - previous;
    if (Math.abs(change) < 0.1) return null;
    const text = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
    const color = change > 0 ? 'text-red-300' : 'text-green-300';
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

    // Mifflin-St Jeor Equation
    // Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
    // Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161

    const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
    const bmr = gender === 'male' ? baseBMR + 5 : baseBMR - 161;

    return Number(bmr.toFixed(1));
  };

  const handleSubmit = async () => {
    if (trainee.isPair && !selectedMember) {
      alert('יש לבחור מי מהזוג מתשקל/ת');
      return;
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
      console.error('Error saving measurement:', error);
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
      <span className={`text-sm font-medium ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
        ({change > 0 ? '+' : ''}{change.toFixed(1)})
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Stabilizing Indicator */}
      {isStabilizing && !showScaleDataToast && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-80 bg-blue-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-pulse">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <p className="font-bold">המשקל מתייצב...</p>
              <p className="text-sm opacity-90">אנא המתן</p>
            </div>
          </div>
        </div>
      )}

      {/* Scale Data Received Toast */}
      {showScaleDataToast && pendingScaleData && (
        <div className={`fixed top-4 right-4 left-4 md:left-auto md:right-4 md:w-96 ${
          showValidationWarning ? 'bg-orange-500' : 'bg-green-500'
        } text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-slide-in-top`}>
          <div className="flex items-start space-x-3 rtl:space-x-reverse mb-3">
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
                  <p className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span>{pendingScaleData.weight.toFixed(1)} ק״ג</span>
                    {previousMeasurement?.weight && (() => {
                      const change = getWeightChangeDisplay(pendingScaleData.weight, previousMeasurement.weight);
                      return change ? <span className={change.color}>({change.text})</span> : null;
                    })()}
                  </p>
                )}
                {pendingScaleData.bodyFat > 0 && (
                  <p className="flex items-center space-x-2 rtl:space-x-reverse">
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
                    <p key={idx}>• {warning}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <button
              onClick={acceptScaleData}
              className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1 rtl:space-x-reverse"
            >
              <Check className="h-4 w-4" />
              <span>אשר</span>
            </button>
            <button
              onClick={rejectScaleData}
              className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-1 rtl:space-x-reverse"
            >
              <X className="h-4 w-4" />
              <span>דחה</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 lg:space-x-4 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onBack}
              className="p-3 lg:p-4 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors touch-manipulation"
            >
              <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" />
            </button>
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-gray-900">{trainee.name}</h1>
              <p className="text-base lg:text-lg text-gray-600">{isEditing ? 'עריכת מדידה' : 'מדידה חדשה'}</p>
              {!isEditing && (
                <div className="flex flex-col space-y-2 mt-2">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse flex-wrap gap-2">
                    {/* Realtime Connection Status */}
                    <div className={`flex items-center space-x-1 rtl:space-x-reverse text-sm ${
                      connectionStatus === 'connected' ? 'text-green-600' :
                      connectionStatus === 'stale' ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {connectionStatus === 'connected' ? (
                        <Wifi className="h-4 w-4" />
                      ) : (
                        <WifiOff className="h-4 w-4" />
                      )}
                      <span>
                        {connectionStatus === 'connected' && 'Realtime מחובר'}
                        {connectionStatus === 'stale' && 'לא התקבלו נתונים'}
                        {connectionStatus === 'disconnected' && 'לא מחובר'}
                      </span>
                    </div>

                    {/* Script Status */}
                    <div className={`flex items-center space-x-1 rtl:space-x-reverse text-sm ${
                      scriptStatus.isOnline ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <Server className="h-4 w-4" />
                      <span>
                        {scriptStatus.isOnline ? `${scriptStatus.deviceName} פעיל` : 'סקריפט לא פעיל'}
                      </span>
                    </div>

                    {/* Retry indicator */}
                    {retryAttempt > 0 && connectionStatus === 'disconnected' && (
                      <div className="flex items-center space-x-1 rtl:space-x-reverse text-sm text-orange-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>ניסיון {retryAttempt + 1}/{maxRetries}</span>
                      </div>
                    )}

                    {/* Refresh & Sound Controls */}
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <button
                        onClick={refreshConnection}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="רענן חיבור"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={toggleSound}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title={soundEnabled ? 'השתק צלילים' : 'הפעל צלילים'}
                      >
                        {soundEnabled ? (
                          <Volume2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Waiting for scale indicator */}
                  {waitingForScale && !hasReceivedDataRef.current && formData.weight === 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center space-x-2 rtl:space-x-reverse">
                      <Scale className="h-5 w-5 text-blue-500 animate-bounce" />
                      <span className="text-sm text-blue-700">
                        ממתין לשקילה... ({formatWaitingTime(elapsedWaitingTime)})
                      </span>
                    </div>
                  )}
                </div>
              )}
              {!isEditing && <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />}
            </div>
          </div>

          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Scale className="h-6 w-6 lg:h-7 lg:w-7 text-green-600" />
            <input
              type="date"
              value={measurementDate}
              onChange={(e) => setMeasurementDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base lg:text-lg font-medium"
            />
          </div>
        </div>
      </div>

      {/* Pair Member Selection */}
      {trainee.isPair && (
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">מי מתשקל/ת?</h3>
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <button
              type="button"
              onClick={() => setSelectedMember('both')}
              className={`p-4 lg:p-6 rounded-xl border-2 transition-all touch-manipulation ${
                selectedMember === 'both'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50'
              }`}
            >
              <User className={`h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-3 ${
                selectedMember === 'both' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`font-semibold text-sm lg:text-base text-center ${
                selectedMember === 'both' ? 'text-green-700' : 'text-gray-600'
              }`}>{trainee.pairName1} + {trainee.pairName2}</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMember('member_1')}
              className={`p-4 lg:p-6 rounded-xl border-2 transition-all touch-manipulation ${
                selectedMember === 'member_1'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50'
              }`}
            >
              <User className={`h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-3 ${
                selectedMember === 'member_1' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <p className={`font-semibold text-sm lg:text-base ${
                selectedMember === 'member_1' ? 'text-blue-700' : 'text-gray-600'
              }`}>{trainee.pairName1}</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMember('member_2')}
              className={`p-4 lg:p-6 rounded-xl border-2 transition-all touch-manipulation ${
                selectedMember === 'member_2'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50'
              }`}
            >
              <User className={`h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-2 lg:mb-3 ${
                selectedMember === 'member_2' ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <p className={`font-semibold text-sm lg:text-base ${
                selectedMember === 'member_2' ? 'text-purple-700' : 'text-gray-600'
              }`}>{trainee.pairName2}</p>
            </button>
          </div>
        </div>
      )}

      {/* Source Selection */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6">
        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">מקור המדידה</h3>
        <div className="grid grid-cols-2 gap-3 lg:gap-4">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, source: 'tanita' }))}
            className={`flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 lg:py-5 rounded-lg transition-colors touch-manipulation ${
              formData.source === 'tanita'
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            <Scale className="h-6 w-6 lg:h-7 lg:w-7" />
            <span className="text-base lg:text-lg font-medium">Tanita</span>
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, source: 'manual' }))}
            className={`flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-4 lg:py-5 rounded-lg transition-colors touch-manipulation ${
              formData.source === 'manual'
                ? 'bg-green-100 text-green-700 border-2 border-green-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            <User className="h-6 w-6 lg:h-7 lg:w-7" />
            <span className="text-base lg:text-lg font-medium">מדידה ידנית</span>
          </button>
        </div>
      </div>

      {/* Basic Measurements */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6">
        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">מדידות בסיסיות</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className={`${highlightedFields.includes('weight') ? 'animate-highlight-pulse' : ''}`}>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              משקל (ק״ג) *
              {getChangeIndicator(formData.weight, previousMeasurement?.weight)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.weight || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, weight: Number(e.target.value) }))}
              className={`w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation ${
                highlightedFields.includes('weight') ? 'border-green-500 bg-green-50 ring-2 ring-green-300' : 'border-gray-300'
              }`}
              placeholder="0.0"
              required
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              גובה (ס״מ)
            </label>
            <div className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-200 bg-gray-50 rounded-lg text-gray-700">
              {(() => {
                const height = trainee.isPair
                  ? (selectedMember === 'member_1' ? trainee.pairHeight1 : selectedMember === 'member_2' ? trainee.pairHeight2 : trainee.pairHeight1)
                  : trainee.height;
                return height || 'לא הוגדר';
              })()}
            </div>
            <p className="text-sm text-gray-500 mt-1">הגובה נשמר בפרופיל המתאמן</p>
          </div>

          <div className={`${highlightedFields.includes('bodyFat') ? 'animate-highlight-pulse' : ''}`}>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              אחוז שומן (%)
              {getChangeIndicator(formData.bodyFat, previousMeasurement?.bodyFat)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.bodyFat || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, bodyFat: Number(e.target.value) }))}
              className={`w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation ${
                highlightedFields.includes('bodyFat') ? 'border-green-500 bg-green-50 ring-2 ring-green-300' : 'border-gray-300'
              }`}
              placeholder="0.0"
            />
          </div>

          <div className={`${highlightedFields.includes('muscleMass') ? 'animate-highlight-pulse' : ''}`}>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              מסת שריר (ק״ג)
              {getChangeIndicator(formData.muscleMass, previousMeasurement?.muscleMass)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.muscleMass || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, muscleMass: Number(e.target.value) }))}
              className={`w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation ${
                highlightedFields.includes('muscleMass') ? 'border-green-500 bg-green-50 ring-2 ring-green-300' : 'border-gray-300'
              }`}
              placeholder="0.0"
            />
          </div>

          <div className={`${highlightedFields.includes('waterPercentage') ? 'animate-highlight-pulse' : ''}`}>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              אחוז מים (%)
              {getChangeIndicator(formData.waterPercentage, previousMeasurement?.waterPercentage)}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={formData.waterPercentage || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, waterPercentage: Number(e.target.value) }))}
              className={`w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation ${
                highlightedFields.includes('waterPercentage') ? 'border-green-500 bg-green-50 ring-2 ring-green-300' : 'border-gray-300'
              }`}
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              BMR (קלוריות בסיסיות)
              <span className="text-sm text-gray-500 mr-2">(מחושב אוטומטית)</span>
            </label>
            <div className="w-full p-4 lg:p-5 text-xl lg:text-2xl bg-blue-50 border-2 border-blue-200 rounded-lg text-blue-700 font-semibold">
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
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              גיל מטבולי
              <span className="text-sm text-gray-500 mr-2">(מחושב אוטומטית)</span>
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
                  excellent: 'bg-green-50 border-green-300 text-green-700',
                  good: 'bg-blue-50 border-blue-300 text-blue-700',
                  'needs-improvement': 'bg-orange-50 border-orange-300 text-orange-700'
                };

                const statusIcons = {
                  excellent: <TrendingDown className="h-6 w-6 inline ml-2" />,
                  good: <Minus className="h-6 w-6 inline ml-2" />,
                  'needs-improvement': <TrendingUp className="h-6 w-6 inline ml-2" />
                };

                return (
                  <div>
                    <div className={`w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 rounded-lg font-bold ${statusColors[message.status]}`}>
                      {metabolicAge} שנים
                      {statusIcons[message.status]}
                    </div>
                    <p className={`mt-2 text-sm lg:text-base font-medium ${
                      message.status === 'excellent' ? 'text-green-600' :
                      message.status === 'good' ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {message.text}
                    </p>
                    {message.recommendations && message.recommendations.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {message.recommendations.map((rec, idx) => (
                          <p key={idx} className="text-xs lg:text-sm text-gray-600 flex items-start">
                            <span className="mr-1">•</span>
                            <span>{rec}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="w-full p-4 lg:p-5 text-xl lg:text-2xl bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-400 font-semibold">
                  נדרש משקל וגובה לחישוב
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
              BMI
              <span className="text-sm text-gray-500 mr-2">(מחושב אוטומטית)</span>
            </label>
            <div className="w-full p-4 lg:p-5 text-xl lg:text-2xl bg-gray-50 border-2 border-gray-300 rounded-lg text-gray-600 font-semibold">
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

      {/* Body Measurements */}
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-4 lg:mb-6">
        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">מדידות היקפים (ס״מ)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
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
              className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
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
              className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
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
              className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
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
              className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
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
              className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
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
              className="w-full p-4 lg:p-5 text-xl lg:text-2xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all touch-manipulation"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!formData.weight}
          className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-300 text-white py-5 lg:py-6 px-6 rounded-xl text-xl lg:text-2xl font-semibold flex items-center justify-center space-x-3 rtl:space-x-reverse transition-all shadow-lg hover:shadow-xl touch-manipulation"
        >
          <Save className="h-7 w-7 lg:h-8 lg:w-8" />
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