export const MEAL_NAMES = [
  { value: 'breakfast', label: 'ארוחת בוקר', icon: '🌅' },
  { value: 'morning_snack', label: 'ביניים בוקר', icon: '🍎' },
  { value: 'lunch', label: 'ארוחת צהריים', icon: '🌞' },
  { value: 'afternoon_snack', label: 'ביניים אחה"צ', icon: '🥤' },
  { value: 'dinner', label: 'ארוחת ערב', icon: '🌙' },
  { value: 'evening_snack', label: 'ביניים ערב', icon: '🍵' },
] as const;

export const DEFAULT_NOTE_TEMPLATES = [
  { title: 'Drink Water', content: 'Drink a glass of water before each meal' },
  { title: 'Stop Eating', content: 'No eating 3 hours before sleep' },
  { title: 'Slow Eating', content: 'Eat slowly and chew each bite thoroughly' },
  { title: 'Protein in Every Meal', content: 'Include a protein source in every meal' },
] as const;
