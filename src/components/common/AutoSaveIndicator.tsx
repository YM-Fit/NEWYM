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
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-warning/10 px-4 py-2 rounded-xl border border-warning/20 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-warning p-1.5 rounded-lg shadow-md">
            <Clock className="h-4 w-4 text-inverse animate-pulse" />
          </div>
          <span className="text-warning font-semibold">טרם נשמר...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 rtl:space-x-reverse bg-success/10 px-4 py-2 rounded-xl border border-success/20 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="bg-success p-1.5 rounded-lg shadow-md">
            <CheckCircle className="h-4 w-4 text-inverse" />
          </div>
          <span className="text-success font-semibold">
            נשמר אוטומטית בשעה {formatTime(lastSaved)}
          </span>
        </div>
      )}
    </div>
  );
}
