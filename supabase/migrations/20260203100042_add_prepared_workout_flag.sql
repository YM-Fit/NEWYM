/*
  # הוספת שדה is_prepared לאימונים

  1. שינויים
    - הוספת עמודה `is_prepared` לטבלת `workouts`
      - ברירת מחדל: `false` (אימון דינמי - המצב הקיים)
      - מאפשר להבדיל בין אימונים דינמיים (שמתמלאים תוך כדי) לאימונים שהוכנו מראש
    
  2. עדכון
    - כל האימונים הקיימים יישארו `is_prepared = false` (דינמיים)
*/

-- הוסף עמודת is_prepared
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS is_prepared BOOLEAN DEFAULT false NOT NULL;

-- עדכן כל האימונים הקיימים להיות דינמיים (ברירת מחדל)
UPDATE workouts 
SET is_prepared = false 
WHERE is_prepared IS NULL;

-- הוסף הערה לעמודה
COMMENT ON COLUMN workouts.is_prepared IS 'האם האימון הוכן מראש (prepared) או דינמי (מתמלא תוך כדי)';

-- הוסף אינדקס לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_workouts_is_prepared ON workouts(is_prepared);
