/*
  # הוספת מעקב השלמת יומן אכילה

  1. שינויים
    - הוספת שדה completed למעקב האם המתאמן סיים למלא את היום
    - הוספת שדה completed_at למעקב מתי הושלם
    - הוספת אינדקסים לביצועים
    
  2. שדות חדשים
    - completed: האם היום הושלם
    - completed_at: תאריך ושעת השלמה
    - is_seen_by_trainer: האם המאמן צפה ביומן
*/

-- הוספת שדות השלמה ל-food_diary
ALTER TABLE food_diary
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_seen_by_trainer BOOLEAN DEFAULT false;

-- יצירת אינדקס לשאילתות מהירות
CREATE INDEX IF NOT EXISTS idx_food_diary_completed ON food_diary(trainee_id, completed, diary_date DESC);
CREATE INDEX IF NOT EXISTS idx_food_diary_trainer_view ON food_diary(trainee_id, diary_date DESC, completed);
CREATE INDEX IF NOT EXISTS idx_food_diary_unseen ON food_diary(trainee_id, is_seen_by_trainer, completed) WHERE completed = true AND is_seen_by_trainer = false;
