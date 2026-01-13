/*
  # הוספת קבוצת שריר "ישבן" ותרגילים

  1. שינויים
    - הוספת קבוצת שריר חדשה: "ישבן" לכל המאמנים הקיימים
    - הוספת 7 תרגילים לקבוצת שריר זו:
      * הרחקת ירך
      * היפ טראסט
      * היפ טראסט עם רגל אחת
      * פשיטת ירך
      * עלייה מדרגה
      * קיק בקד
      * דיפ סקוואט
  
  2. אבטחה
    - התרגילים נוצרים רק למאמנים קיימים במערכת
    - RLS מוחל אוטומטית דרך trainer_id
*/

DO $$
DECLARE
  trainer_record RECORD;
  mg_glutes UUID;
BEGIN
  -- לולאה על כל המאמנים הקיימים
  FOR trainer_record IN SELECT id FROM trainers LOOP
    
    -- יצירת קבוצת שריר "ישבן"
    INSERT INTO muscle_groups (trainer_id, name) 
    VALUES (trainer_record.id, 'ישבן') 
    RETURNING id INTO mg_glutes;
    
    -- הוספת תרגילי ישבן
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_glutes, 'הרחקת ירך'),
      (mg_glutes, 'היפ טראסט'),
      (mg_glutes, 'היפ טראסט עם רגל אחת'),
      (mg_glutes, 'פשיטת ירך'),
      (mg_glutes, 'עלייה מדרגה'),
      (mg_glutes, 'קיק בקד'),
      (mg_glutes, 'דיפ סקוואט');
    
  END LOOP;
END $$;
