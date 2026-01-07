import { CheckCircle, Clock } from 'lucide-react';

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  isDirty: boolean;
}

export default function AutoSaveIndicator({ lastSaved, isDirty }: AutoSaveIndicatorProps) {
  if (!lastSaved) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex items-center space-x-3 rtl:space-x-reverse text-sm transition-all duration-300">
      {isDirty ? (
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-lg shadow-md">
            <Clock className="h-4 w-4 text-white animate-pulse" />
          </div>
          <span className="text-amber-700 font-semibold">טרם נשמר...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-1.5 rounded-lg shadow-md">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          <span className="text-emerald-700 font-semibold">
            נשמר אוטומטית בשעה {formatTime(lastSaved)}
          </span>
        </div>
      )}
    </div>
  );
}
