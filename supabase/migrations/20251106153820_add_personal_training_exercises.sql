/*
  # תרגילים לאימון פרטי עם משקולות חופשיות
  
  1. יצירת תרגילים
    - תרגילים עם משקולות
    - תרגילים עם מוט
    - תרגילים בקרוס אובר
    - תרגילי משקל גוף
    - יצירה עבור כל מאמן קיים
*/

DO $$
DECLARE
  trainer_record RECORD;
  mg_chest UUID;
  mg_back UUID;
  mg_shoulders UUID;
  mg_arms UUID;
  mg_legs UUID;
  mg_core UUID;
BEGIN
  FOR trainer_record IN SELECT id FROM trainers LOOP
    
    -- יצירת קבוצות שריר
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'חזה') RETURNING id INTO mg_chest;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'גב') RETURNING id INTO mg_back;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'כתפיים') RETURNING id INTO mg_shoulders;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'זרועות') RETURNING id INTO mg_arms;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'רגליים') RETURNING id INTO mg_legs;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'ליבה ובטן') RETURNING id INTO mg_core;
    
    -- תרגילי חזה
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_chest, 'לחיצת חזה עם משקולות'),
      (mg_chest, 'לחיצת חזה משופעת עם משקולות'),
      (mg_chest, 'פיילס עם משקולות'),
      (mg_chest, 'לחיצת חזה עם מוט'),
      (mg_chest, 'לחיצת חזה משופעת עם מוט'),
      (mg_chest, 'שכיבות סמיכה'),
      (mg_chest, 'דיפים'),
      (mg_chest, 'פושאפס');
    
    -- תרגילי גב
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_back, 'חתירה במשקולת בידיים'),
      (mg_back, 'חתירה עם מוט'),
      (mg_back, 'משיכות בקרוס'),
      (mg_back, 'דדליפט'),
      (mg_back, 'דדליפט רומני'),
      (mg_back, 'פולאובר עם משקולת'),
      (mg_back, 'שראגס עם משקולות'),
      (mg_back, 'שראגס עם מוט');
    
    -- תרגילי כתפיים
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_shoulders, 'לחיצת כתפיים עם משקולות'),
      (mg_shoulders, 'לחיצת כתפיים עם מוט'),
      (mg_shoulders, 'הרמות צד עם משקולות'),
      (mg_shoulders, 'הרמות קדמיות עם משקולות'),
      (mg_shoulders, 'הרמות אחוריות עם משקולות'),
      (mg_shoulders, 'ארנולד פרס'),
      (mg_shoulders, 'פייס פול בקרוס'),
      (mg_shoulders, 'שכיבות ראש למטה');
    
    -- תרגילי זרועות
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_arms, 'כיפוף ביצפס עם משקולות'),
      (mg_arms, 'כיפוף ביצפס עם מוט'),
      (mg_arms, 'כיפוף פטיש'),
      (mg_arms, 'כיפוף ריכוז'),
      (mg_arms, 'פשיטות טריצפס עם משקולת'),
      (mg_arms, 'פשיטות טריצפס מעל הראש'),
      (mg_arms, 'דיפים לטריצפס'),
      (mg_arms, 'סגירת גריפ עם מוט');
    
    -- תרגילי רגליים
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_legs, 'סקוואט עם מוט'),
      (mg_legs, 'פרונט סקוואט'),
      (mg_legs, 'גובלט סקוואט עם משקולת'),
      (mg_legs, 'לאנג''ס עם משקולות'),
      (mg_legs, 'בולגרי ספליט סקוואט'),
      (mg_legs, 'דדליפט'),
      (mg_legs, 'רומניאן דדליפט'),
      (mg_legs, 'העלאות על קופסא'),
      (mg_legs, 'הרמות עקבים בעמידה');
    
    -- תרגילי ליבה ובטן
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_core, 'פלאנק'),
      (mg_core, 'פלאנק צד'),
      (mg_core, 'קרנצ''ים'),
      (mg_core, 'הרמות רגליים בשכיבה'),
      (mg_core, 'רוסיאן טוויסט'),
      (mg_core, 'דד באג'),
      (mg_core, 'ברד דוג'),
      (mg_core, 'פלאנק עם משיכת ברכיים');
    
  END LOOP;
END $$;
