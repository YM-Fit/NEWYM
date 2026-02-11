export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const RANGES = {
  calories: { min: 0, max: 20000 },
  macros: { min: 0, max: 2000 }, // גרם
  weight: { min: 1, max: 500 }, // ק"ג
  height: { min: 50, max: 300 }, // ס"מ
  age: { min: 1, max: 150 }, // שנים
  water: { min: 0, max: 10000 }, // מ"ל
};

export function validateCalories(calories: number): ValidationResult {
  if (calories < RANGES.calories.min) {
    return { isValid: false, error: 'קלוריות לא יכול להיות שלילי' };
  }
  if (calories > RANGES.calories.max) {
    return { 
      isValid: false, 
      error: `קלוריות לא יכול להיות מעל ${RANGES.calories.max}` 
    };
  }
  return { isValid: true };
}

export function validateMacro(grams: number, name: string): ValidationResult {
  if (grams < RANGES.macros.min) {
    return { isValid: false, error: `${name} לא יכול להיות שלילי` };
  }
  if (grams > RANGES.macros.max) {
    return { 
      isValid: false, 
      error: `${name} לא יכול להיות מעל ${RANGES.macros.max} גרם` 
    };
  }
  return { isValid: true };
}

export function validateWeight(weight: number): ValidationResult {
  if (weight < RANGES.weight.min || weight > RANGES.weight.max) {
    return { 
      isValid: false, 
      error: `משקל חייב להיות בין ${RANGES.weight.min} ל-${RANGES.weight.max} ק"ג` 
    };
  }
  return { isValid: true };
}

export function validateHeight(height: number): ValidationResult {
  if (height < RANGES.height.min || height > RANGES.height.max) {
    return { 
      isValid: false, 
      error: `גובה חייב להיות בין ${RANGES.height.min} ל-${RANGES.height.max} ס"מ` 
    };
  }
  return { isValid: true };
}

export function validateAge(age: number): ValidationResult {
  if (age < RANGES.age.min || age > RANGES.age.max) {
    return { 
      isValid: false, 
      error: `גיל חייב להיות בין ${RANGES.age.min} ל-${RANGES.age.max} שנים` 
    };
  }
  return { isValid: true };
}

export function validateWater(waterMl: number): ValidationResult {
  if (waterMl < RANGES.water.min) {
    return { isValid: false, error: 'כמות מים לא יכולה להיות שלילית' };
  }
  if (waterMl > RANGES.water.max) {
    return { 
      isValid: false, 
      error: `כמות מים לא יכולה להיות מעל ${RANGES.water.max} מ"ל` 
    };
  }
  return { isValid: true };
}

/**
 * ולידציה כללית למספר - בודק אם הוא מספר תקין ולא NaN/Infinity
 */
export function validateNumber(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: false, error: 'ערך לא יכול להיות ריק' };
  }
  if (isNaN(value)) {
    return { isValid: false, error: 'ערך חייב להיות מספר תקין' };
  }
  if (!isFinite(value)) {
    return { isValid: false, error: 'ערך חייב להיות מספר סופי' };
  }
  return { isValid: true };
}

/**
 * ולידציה משולבת - בודק מספר ואז טווח
 */
export function validateNumberInRange(
  value: number | null | undefined,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const numberValidation = validateNumber(value);
  if (!numberValidation.isValid) {
    return numberValidation;
  }
  
  if (value! < min || value! > max) {
    return { 
      isValid: false, 
      error: `${fieldName} חייב להיות בין ${min} ל-${max}` 
    };
  }
  
  return { isValid: true };
}
