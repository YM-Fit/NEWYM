/*
  # הוספת שדה הוראות ביצוע לתרגילים
  
  1. הוספת עמודה instructions לטבלת exercises
  2. עדכון RLS policies (לא נדרש שינוי)
*/

-- הוספת עמודת הוראות ביצוע
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS instructions text;

-- יצירת אינדקס לחיפוש (אופציונלי)
CREATE INDEX IF NOT EXISTS idx_exercises_instructions ON exercises USING gin(to_tsvector('hebrew', COALESCE(instructions, '')));

-- הערה: RLS policies לא צריכים שינוי כי זה רק עמודה נוספת בטבלה קיימת
