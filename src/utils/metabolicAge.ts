/**
 * חישוב גיל מטבולי משופר המבוסס על כל נתוני Tanita
 * משתמש בנתונים: BMR, אחוז שומן, מסת שריר, אחוז מים, BMI
 */
export interface MetabolicAgeInputs {
  actualAge: number;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  bmr?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  waterPercentage?: number;
  bmi?: number;
}

export function calculateMetabolicAge(inputs: MetabolicAgeInputs): number {
  const {
    actualAge,
    gender,
    weight,
    height,
    bmr,
    bodyFatPercentage,
    muscleMass,
    waterPercentage,
    bmi,
  } = inputs;

  let ageAdjustment = 0;
  let factorsCount = 0;

  // 1. חישוב לפי BMR (משקל 35%)
  if (bmr) {
    const expectedBMR =
      gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * actualAge + 5
        : 10 * weight + 6.25 * height - 5 * actualAge - 161;

    const bmrRatio = bmr / expectedBMR;
    // BMR גבוה = מטבוליזם טוב = גיל נמוך יותר
    const bmrAdjustment = (bmrRatio - 1) * 15;
    ageAdjustment += bmrAdjustment * 0.35;
    factorsCount++;
  }

  // 2. חישוב לפי אחוז שומן (משקל 25%)
  if (bodyFatPercentage) {
    const idealBodyFat = gender === 'male' ? 15 : 22; // אחוז שומן אידיאלי
    const fatDeviation = bodyFatPercentage - idealBodyFat;
    // שומן גבוה = גיל מטבולי גבוה יותר
    const fatAdjustment = fatDeviation * 0.6;
    ageAdjustment += fatAdjustment * 0.25;
    factorsCount++;
  }

  // 3. חישוב לפי מסת שריר (משקל 20%)
  if (muscleMass && weight) {
    const musclePercentage = (muscleMass / weight) * 100;
    const idealMusclePercentage = gender === 'male' ? 42 : 36;
    const muscleDeviation = musclePercentage - idealMusclePercentage;
    // שריר גבוה = גיל מטבולי נמוך יותר
    const muscleAdjustment = -muscleDeviation * 0.5;
    ageAdjustment += muscleAdjustment * 0.2;
    factorsCount++;
  }

  // 4. חישוב לפי אחוז מים (משקל 10%)
  if (waterPercentage) {
    const idealWaterPercentage = gender === 'male' ? 60 : 55;
    const waterDeviation = waterPercentage - idealWaterPercentage;
    // מים גבוה = הידרציה טובה = גיל מטבולי נמוך יותר
    const waterAdjustment = -waterDeviation * 0.4;
    ageAdjustment += waterAdjustment * 0.1;
    factorsCount++;
  }

  // 5. חישוב לפי BMI (משקל 10%)
  if (bmi) {
    const idealBMI = 22;
    const bmiDeviation = Math.abs(bmi - idealBMI);
    // BMI קרוב ל-22 = גיל מטבולי טוב יותר
    const bmiAdjustment = bmiDeviation * 0.5;
    ageAdjustment += bmiAdjustment * 0.1;
    factorsCount++;
  }

  // חישוב הגיל המטבולי הסופי
  const metabolicAge = Math.round(actualAge + ageAdjustment);

  // הגבלה בטווח סביר
  return Math.max(18, Math.min(80, metabolicAge));
}

/**
 * חישוב גיל מטבולי - פונקציה ישנה לתאימות לאחור
 */
export function calculateMetabolicAgeSimple(
  actualAge: number,
  bmr: number,
  gender: string,
  weight: number,
  height: number
): number {
  return calculateMetabolicAge({
    actualAge,
    gender: gender as 'male' | 'female',
    weight,
    height,
    bmr,
  });
}

export interface MetabolicAgeMessage {
  text: string;
  status: 'excellent' | 'good' | 'needs-improvement';
  recommendations: string[];
}

export function getMetabolicAgeMessage(
  metabolicAge: number,
  actualAge: number,
  inputs?: MetabolicAgeInputs
): MetabolicAgeMessage {
  const difference = metabolicAge - actualAge;
  const recommendations: string[] = [];

  // המלצות לפי הנתונים
  if (inputs) {
    if (inputs.bodyFatPercentage) {
      const idealBodyFat = inputs.gender === 'male' ? 15 : 22;
      if (inputs.bodyFatPercentage > idealBodyFat + 5) {
        recommendations.push('הפחת אחוז שומן באמצעות דיאטה קלורית שלילית ואימוני כוח');
      }
    }

    if (inputs.muscleMass && inputs.weight) {
      const musclePercentage = (inputs.muscleMass / inputs.weight) * 100;
      const idealMusclePercentage = inputs.gender === 'male' ? 42 : 36;
      if (musclePercentage < idealMusclePercentage - 5) {
        recommendations.push('הגבר מסת שריר באמצעות אימוני התנגדות וצריכת חלבון מספקת');
      }
    }

    if (inputs.waterPercentage) {
      const idealWaterPercentage = inputs.gender === 'male' ? 60 : 55;
      if (inputs.waterPercentage < idealWaterPercentage - 3) {
        recommendations.push('שפר הידרציה - שתה לפחות 2-3 ליטר מים ביום');
      }
    }

    if (inputs.bmi) {
      if (inputs.bmi > 25) {
        recommendations.push('הפחת משקל כולל לשיפור BMI ובריאות כללית');
      } else if (inputs.bmi < 18.5) {
        recommendations.push('הגבר משקל בריא באמצעות תזונה מאוזנת ואימוני כוח');
      }
    }

    if (!inputs.bmr && recommendations.length === 0) {
      recommendations.push('המשך לשמור על אורח חיים פעיל ותזונה מאוזנת');
    }
  }

  // הודעות לפי הפער
  if (difference <= -10) {
    return {
      text: `הגיל המטבולי שלך נמוך ב-${Math.abs(difference)} שנים! מעולה! המשך כך!`,
      status: 'excellent',
      recommendations: recommendations.length > 0 ? recommendations : ['המשך את אורח החיים הפעיל והבריא שלך!'],
    };
  } else if (difference <= -5) {
    return {
      text: `הגיל המטבולי שלך נמוך ב-${Math.abs(difference)} שנים - מצוין מאוד!`,
      status: 'excellent',
      recommendations: recommendations.length > 0 ? recommendations : ['תוצאות מעולות! שמור על הקצב'],
    };
  } else if (difference < 0) {
    return {
      text: `הגיל המטבולי שלך נמוך מהגיל האמיתי שלך - מצוין!`,
      status: 'excellent',
      recommendations: recommendations.length > 0 ? recommendations : ['עבודה נהדרת! המשך כך'],
    };
  } else if (difference === 0) {
    return {
      text: 'הגיל המטבולי שלך תואם את הגיל האמיתי שלך - טוב מאוד!',
      status: 'good',
      recommendations: recommendations.length > 0 ? recommendations : ['שמור על רמה זו ושפר בהדרגה'],
    };
  } else if (difference <= 3) {
    return {
      text: `הגיל המטבולי שלך גבוה ב-${difference} שנים - יש מקום קל לשיפור`,
      status: 'good',
      recommendations: recommendations.length > 0 ? recommendations : ['התמקד באימונים ותזונה נכונה'],
    };
  } else if (difference <= 7) {
    return {
      text: `הגיל המטבולי שלך גבוה ב-${difference} שנים - יש מקום לשיפור`,
      status: 'needs-improvement',
      recommendations: recommendations.length > 0 ? recommendations : ['שפר תזונה, הגבר פעילות גופנית ושינה'],
    };
  } else {
    return {
      text: `הגיל המטבולי שלך גבוה ב-${difference} שנים - דורש שיפור משמעותי`,
      status: 'needs-improvement',
      recommendations: recommendations.length > 0 ? recommendations : ['התייעץ עם מאמן ודיאטן לשיפור מהותי'],
    };
  }
}

/**
 * חישוב אחוז שומן אידיאלי לפי גיל ומין
 */
export function getIdealBodyFatRange(age: number, gender: 'male' | 'female'): {
  min: number;
  max: number;
  optimal: number;
} {
  if (gender === 'male') {
    if (age < 30) return { min: 8, max: 19, optimal: 14 };
    if (age < 40) return { min: 11, max: 21, optimal: 16 };
    if (age < 50) return { min: 13, max: 23, optimal: 18 };
    if (age < 60) return { min: 15, max: 25, optimal: 20 };
    return { min: 17, max: 27, optimal: 22 };
  } else {
    if (age < 30) return { min: 14, max: 24, optimal: 19 };
    if (age < 40) return { min: 16, max: 26, optimal: 21 };
    if (age < 50) return { min: 18, max: 28, optimal: 23 };
    if (age < 60) return { min: 20, max: 30, optimal: 25 };
    return { min: 22, max: 32, optimal: 27 };
  }
}
