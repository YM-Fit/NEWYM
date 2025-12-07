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
    <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
      {isDirty ? (
        <>
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="text-orange-600 font-medium">טרם נשמר...</span>
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-600 font-medium">
            נשמר אוטומטית בשעה {formatTime(lastSaved)}
          </span>
        </>
      )}
    </div>
  );
}
