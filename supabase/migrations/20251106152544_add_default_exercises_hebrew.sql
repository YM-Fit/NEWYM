/*
  # הוספת תרגילים בעברית לכל המאמנים
  
  1. יצירת תרגילים
    - 7 קבוצות שריר
    - 40+ תרגילים בעברית
    - יצירה עבור כל מאמן שכבר קיים במערכת
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
  mg_abs UUID;
BEGIN
  -- לולאה על כל המאמנים
  FOR trainer_record IN SELECT id FROM trainers LOOP
    
    -- יצירת קבוצות שריר
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'חזה') RETURNING id INTO mg_chest;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'גב') RETURNING id INTO mg_back;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'כתפיים') RETURNING id INTO mg_shoulders;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'ביצפס') RETURNING id INTO mg_biceps;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'טריצפס') RETURNING id INTO mg_triceps;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'רגליים') RETURNING id INTO mg_legs;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'בטן') RETURNING id INTO mg_abs;
    
    -- תרגילי חזה
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_chest, 'פרפר במכשיר'),
      (mg_chest, 'דחיפת חזה במכשיר'),
      (mg_chest, 'מתח כבלים עליון'),
      (mg_chest, 'מתח כבלים תחתון'),
      (mg_chest, 'לחיצת חזה עם משקולות'),
      (mg_chest, 'Push-ups'),
      (mg_chest, 'דחיפות חזה בכבלים');
    
    -- תרגילי גב
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_back, 'משיכת גב עליון'),
      (mg_back, 'משיכת גב תחתון'),
      (mg_back, 'משיכה צרה'),
      (mg_back, 'משיכת פולי רחבה'),
      (mg_back, 'חתירה במכשיר'),
      (mg_back, 'חתירה בכבל ישיבה'),
      (mg_back, 'Pull-ups');
    
    -- תרגילי כתפיים
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_shoulders, 'כתפיים מכשיר לחיצה'),
      (mg_shoulders, 'עפיפון מכשיר'),
      (mg_shoulders, 'עפיפון צד במשקולות'),
      (mg_shoulders, 'כתף אחורית במכשיר'),
      (mg_shoulders, 'כתף קדמית במכשיר'),
      (mg_shoulders, 'שראגס טרפז'),
      (mg_shoulders, 'כתפיים לחיצה עם משקולות');
    
    -- תרגילי ביצפס
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_biceps, 'כיפוף זרועות ישיבה'),
      (mg_biceps, 'כיפוף זרועות במכשיר'),
      (mg_biceps, 'כיפוף זרועות בכבל תחתון'),
      (mg_biceps, 'כיפוף זרועות בכבל עליון'),
      (mg_biceps, 'פטיש במשקולות'),
      (mg_biceps, 'ביצפס במשקולות סגנון');
    
    -- תרגילי טריצפס
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_triceps, 'דחיפת טריצפס בכבל'),
      (mg_triceps, 'פשיטת זרועות מעל הראש'),
      (mg_triceps, 'טריצפס מכשיר דיפס'),
      (mg_triceps, 'טריצפס קיקבק'),
      (mg_triceps, 'דחיפות יהלום');
    
    -- תרגילי רגליים
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_legs, 'כפיפת ברכיים שכיבה'),
      (mg_legs, 'פישוק רגליים במכשיר'),
      (mg_legs, 'קירוב רגליים במכשיר'),
      (mg_legs, 'כפיפת ברכיים ישיבה'),
      (mg_legs, 'לחיצת רגליים'),
      (mg_legs, 'הרמת עקבים'),
      (mg_legs, 'פשיטת רגליים');
    
    -- תרגילי בטן
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_abs, 'בטן עליונה במכשיר'),
      (mg_abs, 'בטן תחתונה במכשיר'),
      (mg_abs, 'פלאנק'),
      (mg_abs, 'רוטציות בטן רוסית'),
      (mg_abs, 'Bicycle Crunches'),
      (mg_abs, 'הרמת רגליים תלויה');
    
  END LOOP;
END $$;
