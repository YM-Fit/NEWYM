/*
  # הוספת סטטוס השלמת אימון

  1. שינויים
    - הוספת עמודה `is_completed` לטבלת `workouts`
      - ברירת מחדל: `true` (אימון שנשמר = בוצע)
      - מאפשר מעקב אחר אימונים שתוכננו אך טרם בוצעו
    
  2. עדכון
    - כל האימונים הקיימים יסומנו כ-`completed`
*/

-- הוסף עמודת is_completed
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT true NOT NULL;

-- עדכן כל האימונים הקיימים להיות מושלמים
UPDATE workouts 
SET is_completed = true 
WHERE is_completed IS NULL;

-- הוסף הערה לעמודה
COMMENT ON COLUMN workouts.is_completed IS 'האם האימון בוצע בפועל או רק תוכנן';
