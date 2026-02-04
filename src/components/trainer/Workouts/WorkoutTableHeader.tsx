import { memo } from 'react';

interface WorkoutTableHeaderProps {
  isTablet?: boolean;
}

export const WorkoutTableHeader = memo(({ isTablet }: WorkoutTableHeaderProps) => {
  return (
    <thead className="workout-table-header sticky top-0 z-20 bg-elevated border-b-2 border-emerald-500/30 shadow-lg">
      <tr className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
        <th className="px-4 py-3 text-right font-bold text-foreground text-sm lg:text-base sticky right-0 bg-elevated z-10 min-w-[150px]">
          תרגיל
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[80px]">
          סט
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[100px]">
          משקל (ק״ג)
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[100px]">
          חזרות
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[80px]">
          RPE
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[120px]">
          ציוד
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[100px]">
          סוג סט
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[80px]">
          כשל
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[100px]">
          נפח
        </th>
        <th className="px-4 py-3 text-center font-bold text-foreground text-sm lg:text-base min-w-[120px]">
          פעולות
        </th>
      </tr>
    </thead>
  );
});

WorkoutTableHeader.displayName = 'WorkoutTableHeader';
