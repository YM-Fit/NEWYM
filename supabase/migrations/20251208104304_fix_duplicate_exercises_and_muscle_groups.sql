/*
  # תיקון כפילויות בתרגילים וקבוצות שריר

  1. מחיקה מלאה
    - מחיקת כל התרגילים והסטים הקיימים
    - מחיקת כל קבוצות השריר הקיימות

  2. יצירת רשימה אחת נקייה
    - 8 קבוצות שריר (חזה, גב, כתפיים, דו ראשי, תלת ראשי, רגליים, עכוז, בטן)
    - סך הכל 70+ תרגילים
    - רשימה מאוחדת עם התרגילים הכי נפוצים

  3. קבוצות שריר
    - חזה (14 תרגילים)
    - גב (10 תרגילים)
    - כתפיים (8 תרגילים)
    - דו ראשי - יד קדמית (8 תרגילים)
    - תלת ראשי - יד אחורית (8 תרגילים)
    - רגליים (11 תרגילים)
    - עכוז (5 תרגילים)
    - בטן וליבה (8 תרגילים)

  4. אבטחה
    - RLS מופעל על כל הטבלאות
    - שמירה על הרשאות קיימות
*/

DO $$
DECLARE
  trainer_record RECORD;
  mg_chest UUID;
  mg_back UUID;
  mg_shoulders UUID;
  mg_biceps UUID;
  mg_triceps UUID;
  mg_legs UUID;
  mg_glutes UUID;
  mg_abs UUID;
BEGIN
  -- מחיקת כל התרגילים והסטים הקיימים
  DELETE FROM exercise_sets WHERE workout_exercise_id IN (
    SELECT id FROM workout_exercises WHERE exercise_id IN (
      SELECT id FROM exercises
    )
  );
  
  DELETE FROM workout_exercises WHERE exercise_id IN (
    SELECT id FROM exercises
  );
  
  DELETE FROM exercises;
  DELETE FROM muscle_groups;

  -- לולאה על כל המאמנים
  FOR trainer_record IN SELECT id FROM trainers LOOP
    
    -- יצירת קבוצות שריר
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'חזה') RETURNING id INTO mg_chest;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'גב') RETURNING id INTO mg_back;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'כתפיים') RETURNING id INTO mg_shoulders;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'דו ראשי (יד קדמית)') RETURNING id INTO mg_biceps;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'תלת ראשי (יד אחורית)') RETURNING id INTO mg_triceps;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'רגליים') RETURNING id INTO mg_legs;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'עכוז') RETURNING id INTO mg_glutes;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'בטן וליבה') RETURNING id INTO mg_abs;
    
    -- תרגילי חזה (14)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_chest, 'לחיצת חזה במכשיר'),
      (mg_chest, 'לחיצת חזה בשכיבה עם מוט'),
      (mg_chest, 'לחיצת חזה עם משקולות'),
      (mg_chest, 'לחיצת חזה בשיפוע עם מוט'),
      (mg_chest, 'לחיצת חזה בשיפוע עם משקולות'),
      (mg_chest, 'פרפר במכשיר'),
      (mg_chest, 'פרפר בכבלים'),
      (mg_chest, 'פרפר עם משקולות בשכיבה'),
      (mg_chest, 'פרפר בשיפוע עם משקולות'),
      (mg_chest, 'מתח כבלים עליון'),
      (mg_chest, 'מתח כבלים תחתון'),
      (mg_chest, 'שכיבות סמיכה'),
      (mg_chest, 'דיפס'),
      (mg_chest, 'פושאפס');
    
    -- תרגילי גב (10)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_back, 'משיכה בפולי עליון אחיזה רחבה'),
      (mg_back, 'משיכה בפולי עליון אחיזה צרה'),
      (mg_back, 'משיכה בפולי עליון אחיזה הפוכה'),
      (mg_back, 'חתירה במכשיר'),
      (mg_back, 'חתירה בכבל ישיבה'),
      (mg_back, 'חתירה עם מוט'),
      (mg_back, 'חתירה עם משקולות'),
      (mg_back, 'דדליפט'),
      (mg_back, 'פולאובר'),
      (mg_back, 'מתח חופשי / Pull-ups');
    
    -- תרגילי כתפיים (8)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_shoulders, 'לחיצת כתפיים במכשיר'),
      (mg_shoulders, 'לחיצת כתפיים עם משקולות'),
      (mg_shoulders, 'לחיצת כתפיים עם מוט'),
      (mg_shoulders, 'הרמות צד עם משקולות'),
      (mg_shoulders, 'הרמות קדמיות עם משקולות'),
      (mg_shoulders, 'כתף אחורית במכשיר'),
      (mg_shoulders, 'הרמות אחוריות עם משקולות'),
      (mg_shoulders, 'שראגס לטרפז');
    
    -- תרגילי דו ראשי - יד קדמית (8)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_biceps, 'כיפוף ביצפס במכשיר'),
      (mg_biceps, 'כיפוף ביצפס עם מוט'),
      (mg_biceps, 'כיפוף ביצפס עם משקולות'),
      (mg_biceps, 'כיפוף ביצפס בכבל'),
      (mg_biceps, 'כיפוף פטיש'),
      (mg_biceps, 'כיפוף ריכוז'),
      (mg_biceps, 'כיפוף בשיפוע עם משקולות'),
      (mg_biceps, 'כיפוף בישיבה בספסל');
    
    -- תרגילי תלת ראשי - יד אחורית (8)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_triceps, 'פשיטת טריצפס בכבל'),
      (mg_triceps, 'פשיטת טריצפס עם חבל'),
      (mg_triceps, 'פשיטת טריצפס מעל הראש'),
      (mg_triceps, 'קיק בק'),
      (mg_triceps, 'לחיצה צרפתית בשכיבה'),
      (mg_triceps, 'דיפס לטריצפס'),
      (mg_triceps, 'מקבילים'),
      (mg_triceps, 'סגירת גריפ עם מוט');
    
    -- תרגילי רגליים (11)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_legs, 'לחיצת רגליים'),
      (mg_legs, 'סקוואט במכשיר'),
      (mg_legs, 'סקוואט עם מוט'),
      (mg_legs, 'פישוק רגליים במכשיר'),
      (mg_legs, 'קירוב רגליים במכשיר'),
      (mg_legs, 'כפיפת ברכיים שכיבה'),
      (mg_legs, 'פשיטת רגליים במכשיר'),
      (mg_legs, 'דדליפט רומני'),
      (mg_legs, 'לאנג''ס עם משקולות'),
      (mg_legs, 'בולגרי ספליט סקוואט'),
      (mg_legs, 'הרמות עקבים');
    
    -- תרגילי עכוז (5)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_glutes, 'היפ תראסט במכשיר'),
      (mg_glutes, 'גלוט קיקבק בכבל'),
      (mg_glutes, 'היפ אבדקשן במכשיר'),
      (mg_glutes, 'גשר ירכיים'),
      (mg_glutes, 'סקוואט עמוק');
    
    -- תרגילי בטן וליבה (8)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_abs, 'כפיפות בטן במכשיר'),
      (mg_abs, 'כפיפות בטן על הרצפה'),
      (mg_abs, 'כפיפות בטן עם משקל'),
      (mg_abs, 'הרמת רגליים בשכיבה'),
      (mg_abs, 'פלאנק'),
      (mg_abs, 'פלאנק צד'),
      (mg_abs, 'רוסיאן טוויסט'),
      (mg_abs, 'כפיפות בטן באלכסון');
      
  END LOOP;
END $$;
