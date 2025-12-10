export function validateRPE(rpe: number | null | undefined): number | null {
  if (!rpe) return null;
  if (rpe >= 1 && rpe <= 10) return rpe;
  return null;
}

export function validateSource(source: string | null | undefined): 'tanita' | 'manual' {
  if (source === 'tanita') return 'tanita';
  return 'manual';
}

export function validateGender(gender: string | null | undefined): 'male' | 'female' {
  if (gender === 'female') return 'female';
  return 'male';
}

export function validateStatus(status: string | null | undefined): 'active' | 'inactive' | 'vacation' | 'new' {
  if (status === 'inactive') return 'inactive';
  if (status === 'vacation') return 'vacation';
  if (status === 'new') return 'new';
  return 'active';
}

export function validateSetType(setType: string | null | undefined): 'regular' | 'superset' | 'dropset' {
  if (setType === 'superset') return 'superset';
  if (setType === 'dropset') return 'dropset';
  return 'regular';
}

export function validateWorkoutType(workoutType: string | null | undefined): 'personal' | 'pair' {
  if (workoutType === 'pair') return 'pair';
  return 'personal';
}

export function validateResistanceLevel(level: number | null | undefined): number | null {
  if (!level) return null;
  if (level >= 1 && level <= 5) return level;
  return null;
}

export function validateEquipmentCategory(category: string | null | undefined): string | null {
  const validCategories = [
    'resistance_band',
    'leg_band',
    'bar',
    'pulley_attachment',
    'suspension',
    'balance',
    'ball',
    'other'
  ];

  if (category && validCategories.includes(category)) return category;
  return null;
}

export function validatePairMember(pairMember: string | null | undefined): 'member_1' | 'member_2' | null {
  if (pairMember === 'member_1') return 'member_1';
  if (pairMember === 'member_2') return 'member_2';
  return null;
}
