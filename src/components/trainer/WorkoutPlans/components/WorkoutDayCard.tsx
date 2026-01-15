import React from 'react';
import { Trash2, Copy, Target, Repeat } from 'lucide-react';
import type { WorkoutDay } from '../types';
import { dayColors } from '../constants';

interface WorkoutDayCardProps {
  day: WorkoutDay;
  isMinimized: boolean;
  onSelect: (day: WorkoutDay) => void;
  onRemove: (dayId: string) => void;
  onDuplicate: (day: WorkoutDay) => void;
  onToggleMinimize: (dayId: string) => void;
  onComplete: (dayId: string) => void;
}

export default function WorkoutDayCard({
  day,
  isMinimized,
  onSelect,
  onRemove,
  onDuplicate,
  onToggleMinimize,
  onComplete,
}: WorkoutDayCardProps) {
  const colorIndex = (day.day_number - 1) % dayColors.length;
  const color = dayColors[colorIndex];

  if (isMinimized) {
    return (
      <div
        className="h-full flex items-center justify-between px-4 lg:px-6 cursor-pointer hover:bg-emerald-100/50 transition-all duration-300"
        onClick={() => {
          onSelect(day);
          onToggleMinimize(day.tempId);
        }}
        style={{ height: '88px' }}
      >
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-xl text-white font-bold">{day.day_number}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              יום {day.day_number} {day.day_name ? `- ${day.day_name}` : ''}
            </h3>
            <p className="text-sm text-gray-600">
              {day.exercises.length} תרגילים {day.focus ? `| ${day.focus}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-sm text-emerald-600 font-semibold">לחץ לעריכה</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(day.tempId);
            }}
            className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all duration-300"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className={`bg-gradient-to-br ${color.bg} rounded-2xl p-5 text-white mb-4 shadow-lg transition-all duration-300`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-80 font-medium">יום {day.day_number}</p>
            <h2 className="text-xl font-bold">
              {day.day_name || `יום אימון ${day.day_number}`}
            </h2>
            {day.focus && (
              <p className="flex items-center gap-2 mt-2 text-sm opacity-90">
                <Target className="w-4 h-4" />
                {day.focus}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDuplicate(day)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300"
              title="שכפל יום"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={() => onRemove(day.tempId)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300"
              title="מחק יום"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
          <span className="font-medium">{day.exercises.length} תרגילים</span>
        </div>
      </div>

      {day.exercises.length > 0 && (
        <div className="space-y-2 mb-4">
          {day.exercises.map((exercise, index) => (
            <div key={exercise.tempId} className={`${color.light} ${color.border} border-2 rounded-xl p-4 transition-all duration-300 hover:shadow-md`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 flex items-center gap-3">
                  <div className={`w-8 h-8 bg-gradient-to-br ${color.bg} rounded-lg flex items-center justify-center shadow-md`}>
                    <span className="text-sm text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className={`font-bold ${color.text}`}>{exercise.exercise.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Repeat className="w-3 h-3" />
                        {exercise.sets.length} סטים
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => onSelect(day)}
          className={`flex-1 py-4 px-4 rounded-xl ${color.light} ${color.text} font-bold hover:opacity-80 transition-all duration-300 border-2 ${color.border} shadow-md hover:shadow-lg`}
        >
          {day.exercises.length === 0 ? 'הוסף תרגילים' : 'ערוך יום'}
        </button>
        {day.exercises.length > 0 && (
          <button
            onClick={() => onComplete(day.tempId)}
            className="px-5 py-4 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            סיים יום
          </button>
        )}
      </div>
    </div>
  );
}
