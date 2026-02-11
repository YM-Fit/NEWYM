/*
  חישובי BMR (Basal Metabolic Rate) ו-TDEE (Total Daily Energy Expenditure)
  כולל המלצות קלוריות לפי מטרה
*/

export interface CalorieData {
  bmr: number;
  tdee: number;
  weightLossAggressive: number; // -25%
  weightLossModerate: number;   // -20%
  weightLossMild: number;        // -15%
  maintenance: number;           // TDEE
  muscleGainMild: number;        // +10%
  muscleGainModerate: number;    // +15%
  recommendations: {
    cutting: { calories: number; description: string };
    maintenance: { calories: number; description: string };
    bulking: { calories: number; description: string };
  };
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'cutting' | 'maintenance' | 'bulking';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // עבודה משרדית, ללא פעילות
  light: 1.375,        // פעילות קלה 1-3 פעמים בשבוע
  moderate: 1.55,      // פעילות בינונית 3-5 פעמים בשבוע
  active: 1.725,       // פעילות אינטנסיבית 6-7 פעמים בשבוע
  very_active: 1.9,    // פעילות מאוד אינטנסיבית + עבודה פיזית
};

/**
 * חישוב BMR לפי נוסחת Mifflin-St Jeor (מדויקת יותר מ-Harris-Benedict)
 *
 * גברים: BMR = (10 × משקל בק"ג) + (6.25 × גובה בס"מ) - (5 × גיל בשנים) + 5
 * נשים: BMR = (10 × משקל בק"ג) + (6.25 × גובה בס"מ) - (5 × גיל בשנים) - 161
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * חישוב TDEE (BMR × מקדם פעילות)
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * חישוב קלוריות מומלצות לפי מטרה
 */
export function calculateCaloriesByGoal(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'cutting':
      return Math.round(tdee * 0.8); // -20%
    case 'maintenance':
      return tdee;
    case 'bulking':
      return Math.round(tdee * 1.1); // +10%
    default:
      return tdee;
  }
}

/**
 * חישוב מלא של כל נתוני הקלוריות
 */
export function calculateFullCalorieData(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female',
  activityLevel: ActivityLevel = 'moderate'
): CalorieData {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);

  // חישוב טווחי קלוריות לפי מטרות שונות
  const weightLossAggressive = Math.round(tdee * 0.75); // -25%
  const weightLossModerate = Math.round(tdee * 0.8);    // -20%
  const weightLossMild = Math.round(tdee * 0.85);       // -15%
  const maintenance = tdee;
  const muscleGainMild = Math.round(tdee * 1.1);        // +10%
  const muscleGainModerate = Math.round(tdee * 1.15);   // +15%

  return {
    bmr: Math.round(bmr),
    tdee,
    weightLossAggressive,
    weightLossModerate,
    weightLossMild,
    maintenance,
    muscleGainMild,
    muscleGainModerate,
    recommendations: {
      cutting: {
        calories: weightLossModerate,
        description: `ירידה במשקל בריאה: ${weightLossModerate} קלוריות ביום. צפי ירידה: 0.5-0.7 ק"ג בשבוע`,
      },
      maintenance: {
        calories: maintenance,
        description: `שמירה על משקל: ${maintenance} קלוריות ביום. חיטוב והגדרה`,
      },
      bulking: {
        calories: muscleGainMild,
        description: `בניית שריר: ${muscleGainMild} קלוריות ביום. צפי עלייה: 0.25-0.5 ק"ג בשבוע`,
      },
    },
  };
}

/**
 * חישוב חלוקת מקרו-נוטריינטים מומלצת
 * @param totalCalories - סך הקלוריות היומיות (חייב להיות > 0)
 * @param weight - משקל בק"ג (חייב להיות > 0)
 * @param goal - מטרת התזונה (cutting/maintenance/bulking)
 * @returns חלוקת מקרו-נוטריינטים מומלצת
 * @throws {Error} אם totalCalories <= 0 או weight <= 0
 */
export interface MacroSplit {
  protein: { grams: number; calories: number; percentage: number };
  carbs: { grams: number; calories: number; percentage: number };
  fat: { grams: number; calories: number; percentage: number };
}

export function calculateMacros(
  totalCalories: number,
  weight: number,
  goal: Goal
): MacroSplit {
  // ולידציה
  if (totalCalories <= 0) {
    throw new Error('totalCalories חייב להיות גדול מ-0');
  }
  if (weight <= 0) {
    throw new Error('weight חייב להיות גדול מ-0');
  }
  if (weight > 500) {
    throw new Error('weight לא יכול להיות גדול מ-500 ק"ג');
  }
  if (totalCalories > 20000) {
    throw new Error('totalCalories לא יכול להיות גדול מ-20000');
  }

  let proteinPerKg: number;
  let fatPercentage: number;

  // חלבון לפי מטרה
  switch (goal) {
    case 'cutting':
      proteinPerKg = 2.2; // חלבון גבוה לשמירה על שריר
      fatPercentage = 0.25; // 25% שומן
      break;
    case 'bulking':
      proteinPerKg = 2.0;
      fatPercentage = 0.25; // 25% שומן
      break;
    case 'maintenance':
    default:
      proteinPerKg = 2.0;
      fatPercentage = 0.25; // 25% שומן
      break;
  }

  const proteinGrams = Math.round(weight * proteinPerKg);
  const proteinCalories = proteinGrams * 4; // 4 קלוריות לגרם חלבון

  const fatCalories = Math.round(totalCalories * fatPercentage);
  const fatGrams = Math.round(fatCalories / 9); // 9 קלוריות לגרם שומן

  const carbsCalories = totalCalories - proteinCalories - fatCalories;
  const carbsGrams = Math.round(carbsCalories / 4); // 4 קלוריות לגרם פחמימה

  const proteinPercentage = Math.round((proteinCalories / totalCalories) * 100);
  const carbsPercentage = Math.round((carbsCalories / totalCalories) * 100);
  const fatPercentageValue = Math.round((fatCalories / totalCalories) * 100);

  // בדיקת סכום אחוזים (צריך להיות ~100%)
  const totalPercentage = proteinPercentage + carbsPercentage + fatPercentageValue;
  if (Math.abs(totalPercentage - 100) > 1) {
    console.warn(`סכום אחוזים לא שווה ל-100%: ${totalPercentage}%`);
  }

  return {
    protein: {
      grams: proteinGrams,
      calories: proteinCalories,
      percentage: proteinPercentage,
    },
    carbs: {
      grams: carbsGrams,
      calories: carbsCalories,
      percentage: carbsPercentage,
    },
    fat: {
      grams: fatGrams,
      calories: fatCalories,
      percentage: fatPercentageValue,
    },
  };
}

/**
 * חישוב צפי שינוי משקל (ק"ג לשבוע)
 * @param currentCalories - הקלוריות הנוכחיות (יכול להיות שלילי)
 * @param tdee - TDEE (Total Daily Energy Expenditure) - חייב להיות > 0
 * @returns צפי שינוי משקל שבועי וחודשי
 */
export function estimateWeightChange(currentCalories: number, tdee: number): {
  weeklyChange: number;
  monthlyChange: number;
  description: string;
} {
  // ולידציה
  if (tdee <= 0) {
    return {
      weeklyChange: 0,
      monthlyChange: 0,
      description: 'לא ניתן לחשב - TDEE לא תקין',
    };
  }
  
  if (currentCalories < 0) {
    currentCalories = 0; // טיפול בערכים שליליים
  }

  const dailyDeficitOrSurplus = currentCalories - tdee;
  const weeklyCalorieChange = dailyDeficitOrSurplus * 7;

  // 7700 קלוריות = 1 ק"ג שומן בקירוב
  const weeklyChange = weeklyCalorieChange / 7700;
  const monthlyChange = weeklyChange * 4;

  // בדיקת גבולות (שינוי קיצוני)
  if (Math.abs(weeklyChange) > 2) {
    console.warn(`שינוי משקל קיצוני: ${weeklyChange.toFixed(2)} ק"ג לשבוע`);
  }

  let description: string;
  if (weeklyChange < -0.1) {
    description = `צפי ירידה של ${Math.abs(weeklyChange).toFixed(2)} ק"ג בשבוע`;
  } else if (weeklyChange > 0.1) {
    description = `צפי עלייה של ${weeklyChange.toFixed(2)} ק"ג בשבוע`;
  } else {
    description = 'שמירה על משקל';
  }

  return {
    weeklyChange: parseFloat(weeklyChange.toFixed(2)),
    monthlyChange: parseFloat(monthlyChange.toFixed(2)),
    description,
  };
}

/**
 * המלצה לכמות מים ביום (מ"ל)
 * @param weight - משקל בק"ג (חייב להיות > 0)
 * @param activityLevel - רמת פעילות
 * @returns כמות מים מומלצת במ"ל
 * @throws {Error} אם weight <= 0
 */
export function calculateWaterIntake(weight: number, activityLevel: ActivityLevel): number {
  // ולידציה
  if (weight <= 0) {
    throw new Error('weight חייב להיות גדול מ-0');
  }
  if (weight > 500) {
    throw new Error('weight לא יכול להיות גדול מ-500 ק"ג');
  }

  // נוסחה בסיסית: 30-35 מ"ל לכל ק"ג
  let baseWater = weight * 33;

  // תוספת לפי רמת פעילות
  const activityBonus: Record<ActivityLevel, number> = {
    sedentary: 0,
    light: 250,
    moderate: 500,
    active: 750,
    very_active: 1000,
  };

  const totalWater = baseWater + activityBonus[activityLevel];
  
  // בדיקת גבולות (מינימום 500 מ"ל, מקסימום 10000 מ"ל)
  if (totalWater < 500) {
    return 500;
  }
  if (totalWater > 10000) {
    console.warn(`כמות מים גבוהה מאוד: ${totalWater} מ"ל`);
    return 10000;
  }

  return Math.round(totalWater);
}
