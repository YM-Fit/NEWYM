export function calculateMetabolicAge(
  actualAge: number,
  bmr: number,
  gender: string,
  weight: number,
  height: number
): number {
  const avgWeight = gender === 'male' ? 70 : 60;
  const avgHeight = gender === 'male' ? 175 : 165;

  const averageBMR = gender === 'male'
    ? 88.362 + (13.397 * avgWeight) + (4.799 * avgHeight) - (5.677 * actualAge)
    : 447.593 + (9.247 * avgWeight) + (3.098 * avgHeight) - (4.330 * actualAge);

  const bmrDifference = ((bmr - averageBMR) / averageBMR) * 100;

  const metabolicAge = Math.round(actualAge - (bmrDifference / 2));

  return Math.max(18, Math.min(80, metabolicAge));
}

export function getMetabolicAgeMessage(metabolicAge: number, actualAge: number): {
  text: string;
  status: 'excellent' | 'good' | 'needs-improvement';
} {
  const difference = metabolicAge - actualAge;

  if (difference <= -5) {
    return {
      text: `הגיל המטבולי שלך נמוך ב-${Math.abs(difference)} שנים מהגיל האמיתי - מצוין מאוד!`,
      status: 'excellent'
    };
  } else if (difference < 0) {
    return {
      text: `הגיל המטבולי שלך נמוך מהגיל האמיתי שלך - מצוין!`,
      status: 'excellent'
    };
  } else if (difference === 0) {
    return {
      text: 'הגיל המטבולי שלך תואם את הגיל האמיתי שלך - טוב מאוד!',
      status: 'good'
    };
  } else if (difference <= 5) {
    return {
      text: `הגיל המטבולי שלך גבוה ב-${difference} שנים - יש מקום לשיפור`,
      status: 'needs-improvement'
    };
  } else {
    return {
      text: `הגיל המטבולי שלך גבוה ב-${difference} שנים מהגיל האמיתי - דורש שיפור`,
      status: 'needs-improvement'
    };
  }
}
