import { memo } from 'react';

interface WorkoutTableHeaderProps {
  isTablet?: boolean;
}

export const WorkoutTableHeader = memo(({ isTablet }: WorkoutTableHeaderProps) => {
  return (
    <thead className="workout-table-header sticky top-0 z-20 bg-elevated border-b-2 border-emerald-500/30 shadow-lg backdrop-blur-sm">
      <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <th className="px-3 py-2 text-right font-bold text-foreground text-xs lg:text-sm sticky right-0 bg-elevated z-10 min-w-[120px] border-r-2 border-emerald-500/20">
          תרגיל
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[50px]">
          סט
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[80px]">
          משקל
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[70px]">
          חזרות
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[60px]">
          RPE
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[80px]">
          ציוד
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[90px]">
          סוג
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[50px]">
          כשל
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[70px]">
          נפח
        </th>
        <th className="px-2 py-2 text-center font-bold text-foreground text-xs lg:text-sm min-w-[90px]">
          פעולות
        </th>
      </tr>
    </thead>
  );
});

WorkoutTableHeader.displayName = 'WorkoutTableHeader';
