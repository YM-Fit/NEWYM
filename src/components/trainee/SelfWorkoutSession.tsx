import { useState, useEffect } from 'react';
import { ArrowRight, Plus, Save, Clock, Dumbbell, BookMarked } from 'lucide-react';
import { useWorkoutSession } from '../../hooks/useWorkoutSession';
import ExerciseSelector from '../trainer/Workouts/ExerciseSelector';
import QuickNumericPad from '../trainer/Workouts/QuickNumericPad';
import EquipmentSelector from '../trainer/Equipment/EquipmentSelector';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import DraftModal from '../common/DraftModal';
import ExerciseInstructionsModal from '../common/ExerciseInstructionsModal';
import { formatTime } from './utils/selfWorkoutUtils';
import { useSelfWorkoutState } from './hooks/useSelfWorkoutState';
import { useSelfWorkoutNumericPads } from './hooks/useSelfWorkoutNumericPads';
import { useSelfWorkoutSave } from './hooks/useSelfWorkoutSave';
import WorkoutExerciseCard from './components/WorkoutExerciseCard';
import WorkoutSummaryModal from './components/WorkoutSummaryModal';
import WorkoutTemplateModal from './components/WorkoutTemplateModal';
import type { SelfWorkoutSessionProps, InstructionsExerciseState } from './types/selfWorkoutTypes';

export default function SelfWorkoutSession({ traineeId, traineeName, trainerId, onBack, onSave }: SelfWorkoutSessionProps) {
  const {
    exercises,
    setExercises,
    minimizedExercises,
    collapsedSets,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    duplicateSet,
    calculateTotalVolume,
    calculateExerciseVolume,
    toggleMinimizeExercise,
    getExerciseSummary,
    toggleCollapseSet,
    completeSetAndMoveNext,
  } = useWorkoutSession();

  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [instructionsExercise, setInstructionsExercise] = useState<InstructionsExerciseState | null>(null);

  const {
    notes,
    setNotes,
    workoutDate,
    startTime,
    elapsedTime,
    showDraftModal,
    setShowDraftModal,
    draftData,
    setDraftData,
    autoSaved,
    setAutoSaved,
    showSummary,
    setShowSummary,
    showTemplateModal,
    setShowTemplateModal,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    savingTemplate,
    setSavingTemplate,
    lastSaved,
    isDirty,
    clearSaved,
    loadSaved,
  } = useSelfWorkoutState({ exercises, traineeId });

  const {
    numericPad,
    setNumericPad,
    equipmentSelector,
    setEquipmentSelector,
    supersetSelector,
    setSupersetSelector,
    supersetNumericPad,
    setSupersetNumericPad,
    dropsetNumericPad,
    setDropsetNumericPad,
    supersetEquipmentSelector,
    setSupersetEquipmentSelector,
    openNumericPad,
    handleNumericPadConfirm,
    handleEquipmentSelect,
    handleSupersetExerciseSelect,
    openSupersetNumericPad,
    handleSupersetEquipmentSelect,
    handleSupersetNumericPadConfirm,
    openDropsetNumericPad,
    handleDropsetNumericPadConfirm,
  } = useSelfWorkoutNumericPads({ exercises, updateSet });

  const {
    saving,
    handleSave,
    handleAutoSave,
    handleLoadLastWorkout,
    handleSaveTemplate,
  } = useSelfWorkoutSave({
    exercises,
    notes,
    workoutDate,
    traineeId,
    traineeName,
    trainerId,
    setExercises,
    setShowSummary,
    clearSaved,
    setAutoSaved,
    setShowTemplateModal,
    setTemplateName,
    setTemplateDescription,
    templateName,
    templateDescription,
    setSavingTemplate,
  });

  useEffect(() => {
    const saved = loadSaved();
    if (saved && saved.exercises && saved.exercises.length > 0) {
      setDraftData(saved);
      setShowDraftModal(true);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      if (elapsed >= 7200 && !autoSaved && exercises.length > 0) {
        handleAutoSave(handleSave);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, autoSaved, exercises.length, handleAutoSave, handleSave]);

  const handleRestoreDraft = () => {
    if (draftData) {
      setExercises(draftData.exercises);
      setNotes(draftData.notes || '');
      setShowDraftModal(false);
      setDraftData(null);
    }
  };

  const handleDiscardDraft = () => {
    clearSaved();
    setShowDraftModal(false);
    setDraftData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-dark transition-colors duration-300 p-3 md:p-4">
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 mb-3 md:mb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 hover:bg-white/20 rounded-lg transition-all text-white flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95"
              aria-label="חזור"
            >
              <ArrowRight className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="text-white flex-1 min-w-0">
              <h1 className="text-lg md:text-xl font-bold truncate">אימון עצמאי</h1>
              <p className="text-xs md:text-sm text-primary-100 truncate">{traineeName}</p>
              {exercises.length > 0 && (
                <p className="text-xs text-white/90 font-semibold mt-1 bg-white/15 px-2 py-0.5 rounded-md inline-block">
                  נפח: {calculateTotalVolume().toLocaleString()} ק"ג
                </p>
              )}
              <AutoSaveIndicator lastSaved={lastSaved} isDirty={isDirty} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || exercises.length === 0}
            className="bg-white text-primary-600 px-4 md:px-5 py-2.5 md:py-3 rounded-lg md:rounded-xl flex items-center space-x-1.5 rtl:space-x-reverse transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm md:text-base flex-shrink-0 ml-2 min-h-[44px] active:scale-95"
          >
            <Save className="h-4 w-4 md:h-5 md:w-5" />
            <span className="font-semibold md:font-bold">{saving ? 'שומר...' : 'סיים'}</span>
          </button>
        </div>

        <div className="flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-lg md:rounded-xl p-2.5 md:p-3">
          <Clock className="h-4 w-4 md:h-5 md:w-5 text-white ml-1.5 md:ml-2" />
          <span className="text-lg md:text-xl font-bold text-white">{formatTime(elapsedTime)}</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {exercises.length === 0 && (
              <button
                type="button"
                onClick={handleLoadLastWorkout}
                className="px-3 py-1.5 rounded-lg bg-primary-500/20 text-primary-50 text-xs md:text-sm font-semibold border border-primary-500/40 hover:bg-primary-500/30 transition-all"
              >
                טען אימון עצמאי אחרון
              </button>
            )}
            {exercises.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-50 text-xs md:text-sm font-semibold border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <BookMarked className="h-3.5 w-3.5" />
                שמור כתבנית
              </button>
            )}
          </div>
        </div>
      </div>

      {exercises.map((workoutExercise, exerciseIndex) => {
        const isMinimized = minimizedExercises.includes(workoutExercise.tempId);
        const summary = getExerciseSummary(workoutExercise);

        return (
          <WorkoutExerciseCard
            key={workoutExercise.tempId}
            workoutExercise={workoutExercise}
            exerciseIndex={exerciseIndex}
            isMinimized={isMinimized}
            collapsedSets={collapsedSets}
            summary={summary}
            exerciseVolume={calculateExerciseVolume(workoutExercise)}
            onToggleMinimize={() => toggleMinimizeExercise(workoutExercise.tempId)}
            onRemove={() => removeExercise(exerciseIndex)}
            onShowInstructions={() => setInstructionsExercise({
              name: workoutExercise.exercise.name,
              instructions: workoutExercise.exercise.instructions || null,
            })}
            onAddSet={() => addSet(exerciseIndex)}
            onToggleCollapseSet={toggleCollapseSet}
            onUpdateSet={(setIndex, field, value) => updateSet(exerciseIndex, setIndex, field, value)}
            onDuplicateSet={(setIndex) => duplicateSet(exerciseIndex, setIndex)}
            onRemoveSet={(setIndex) => removeSet(exerciseIndex, setIndex)}
            onOpenNumericPad={(setIndex, field, label) => openNumericPad(exerciseIndex, setIndex, field, label)}
            onOpenSupersetNumericPad={(setIndex, field, label) => openSupersetNumericPad(exerciseIndex, setIndex, field, label)}
            onOpenDropsetNumericPad={(setIndex, field, label) => openDropsetNumericPad(exerciseIndex, setIndex, field, label)}
            onSetEquipmentSelector={(state) => setEquipmentSelector({ exerciseIndex: state.exerciseIndex, setIndex: state.setIndex })}
            onSetSupersetSelector={(state) => setSupersetSelector({ exerciseIndex: state.exerciseIndex, setIndex: state.setIndex })}
            onSetSupersetEquipmentSelector={(state) => setSupersetEquipmentSelector({ exerciseIndex: state.exerciseIndex, setIndex: state.setIndex })}
            onCompleteSet={(setIndex) => completeSetAndMoveNext(exerciseIndex, setIndex)}
          />
        );
      })}

      {exercises.length === 0 && (
        <div className="premium-card-static p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Dumbbell className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">התחל אימון עצמאי</h3>
          <p className="text-[var(--color-text-muted)] mb-4">הוסף תרגילים ורשום את הסטים שלך</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowExerciseSelector(true)}
        className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 md:py-4 rounded-lg md:rounded-xl flex items-center justify-center space-x-2 rtl:space-x-reverse transition-all shadow-md hover:shadow-lg text-sm md:text-base font-semibold md:font-bold"
      >
        <Plus className="h-5 w-5 md:h-6 md:w-6" />
        <span>{exercises.length === 0 ? 'התחל אימון' : 'הוסף תרגיל'}</span>
      </button>

      {showExerciseSelector && (
        <ExerciseSelector
          traineeId={traineeId}
          traineeName={traineeName}
          onSelect={addExercise}
          onClose={() => setShowExerciseSelector(false)}
        />
      )}

      {numericPad && (
        <QuickNumericPad
          value={numericPad.value}
          label={numericPad.label}
          onConfirm={handleNumericPadConfirm}
          onClose={() => setNumericPad(null)}
          allowDecimal={numericPad.field === 'weight'}
        />
      )}

      {equipmentSelector && (
        <EquipmentSelector
          currentEquipmentId={exercises[equipmentSelector.exerciseIndex]?.sets[equipmentSelector.setIndex]?.equipment_id || null}
          onSelect={handleEquipmentSelect}
          onClose={() => setEquipmentSelector(null)}
        />
      )}

      {supersetSelector && (
        <ExerciseSelector
          traineeId={traineeId}
          traineeName={traineeName}
          onSelect={handleSupersetExerciseSelect}
          onClose={() => setSupersetSelector(null)}
        />
      )}

      {supersetNumericPad && (
        <QuickNumericPad
          value={supersetNumericPad.value}
          label={supersetNumericPad.label}
          onConfirm={handleSupersetNumericPadConfirm}
          onClose={() => setSupersetNumericPad(null)}
          allowDecimal={supersetNumericPad.field === 'superset_weight'}
        />
      )}

      {supersetEquipmentSelector && (
        <EquipmentSelector
          currentEquipmentId={
            exercises[supersetEquipmentSelector.exerciseIndex]?.sets[supersetEquipmentSelector.setIndex]?.superset_equipment_id || null
          }
          onSelect={handleSupersetEquipmentSelect}
          onClose={() => setSupersetEquipmentSelector(null)}
        />
      )}

      {dropsetNumericPad && (
        <QuickNumericPad
          value={dropsetNumericPad.value}
          label={dropsetNumericPad.label}
          onConfirm={handleDropsetNumericPadConfirm}
          onClose={() => setDropsetNumericPad(null)}
          allowDecimal={dropsetNumericPad.field === 'dropset_weight'}
        />
      )}

      {showDraftModal && (
        <DraftModal
          title="נמצאה טיוטה"
          message="נמצאה טיוטת אימון שנשמרה מהפעם הקודמת. האם ברצונך לטעון אותה או להתחיל אימון חדש?"
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {instructionsExercise && (
        <ExerciseInstructionsModal
          isOpen={!!instructionsExercise}
          onClose={() => setInstructionsExercise(null)}
          exerciseName={instructionsExercise.name}
          instructions={instructionsExercise.instructions}
        />
      )}
      <WorkoutTemplateModal
        isOpen={showTemplateModal}
        templateName={templateName}
        templateDescription={templateDescription}
        savingTemplate={savingTemplate}
        exercisesCount={exercises.length}
        onClose={() => setShowTemplateModal(false)}
        onNameChange={setTemplateName}
        onDescriptionChange={setTemplateDescription}
        onSave={handleSaveTemplate}
      />

      <WorkoutSummaryModal
        isOpen={showSummary}
        exercises={exercises}
        elapsedTime={elapsedTime}
        formatTime={formatTime}
        calculateTotalVolume={calculateTotalVolume}
        getExerciseSummary={getExerciseSummary}
        onClose={() => setShowSummary(false)}
        onSave={onSave}
      />
    </div>
  );
}
