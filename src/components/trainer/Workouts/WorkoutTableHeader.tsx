import { memo } from 'react';

interface WorkoutTableHeaderProps {
  isTablet?: boolean;
}

export const WorkoutTableHeader = memo(({ isTablet }: WorkoutTableHeaderProps) => {
  return (
    <thead className="workout-table-header sticky top-0 z-20 bg-elevated border-b-2 border-emerald-500/30 shadow-lg backdrop-blur-sm">
      <tr className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10">
        <th className="px-2 sm:px-3 py-2 text-right font-bold text-foreground text-[10px] sm:text-xs lg:text-sm sticky right-0 bg-elevated z-10 min-w-[100px] sm:min-w-[120px] border-r-2 border-emerald-500/20">
          תרגיל
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[40px] sm:min-w-[50px]">
          סט
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[60px] sm:min-w-[80px]">
          משקל
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[50px] sm:min-w-[70px]">
          חזרות
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[40px] sm:min-w-[60px]">
          RPE
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[60px] sm:min-w-[80px] hidden sm:table-cell">
          ציוד
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[70px] sm:min-w-[90px]">
          סוג
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[40px] sm:min-w-[50px] hidden sm:table-cell">
          כשל
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[50px] sm:min-w-[70px] hidden md:table-cell">
          נפח
        </th>
        <th className="px-1 sm:px-2 py-2 text-center font-bold text-foreground text-[10px] sm:text-xs lg:text-sm min-w-[70px] sm:min-w-[90px]">
          פעולות
        </th>
      </tr>
    </thead>
  );
});

WorkoutTableHeader.displayName = 'WorkoutTableHeader';
