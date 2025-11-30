/*
  # עדכון רשימת התרגילים - רשימה מותאמת אישית

  1. שינויים
    - מחיקת כל התרגילים והקבוצות הקיימות
    - יצירת 7 קבוצות שריר עדכניות
    - הוספת רשימת תרגילים מפורטת בעברית

  2. קבוצות שריר
    - חזה (14 תרגילים)
    - יד אחורית - תלת ראשי (8 תרגילים)
    - גב (10 תרגילים)
    - יד קדמית - דו ראשי (8 תרגילים)
    - כתפיים (5 תרגילים)
    - רגליים (11 תרגילים)
    - בטן (6 תרגילים)

  3. הערות
    - סך הכל 62 תרגילים מפורטים
    - כל תרגיל כולל את שם המכשיר/הציוד
*/

DO $$
DECLARE
  trainer_record RECORD;
  mg_chest UUID;
  mg_triceps UUID;
  mg_back UUID;
  mg_biceps UUID;
  mg_shoulders UUID;
  mg_legs UUID;
  mg_abs UUID;
BEGIN
  -- מחיקת תרגילים וקבוצות שריר קיימות לכל המאמנים
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
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'יד אחורית (תלת ראשי)') RETURNING id INTO mg_triceps;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'גב') RETURNING id INTO mg_back;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'יד קדמית (דו ראשי)') RETURNING id INTO mg_biceps;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'כתפיים') RETURNING id INTO mg_shoulders;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'רגליים') RETURNING id INTO mg_legs;
    INSERT INTO muscle_groups (trainer_id, name) VALUES (trainer_record.id, 'בטן') RETURNING id INTO mg_abs;
    
    -- תרגילי חזה (14)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_chest, 'לחיצת חזה בשיפוע חיובי עם מוט'),
      (mg_chest, 'פרפר בשיפוע עם משקולות'),
      (mg_chest, 'בנץ פרס'),
      (mg_chest, 'פרפר בקרוס'),
      (mg_chest, 'לחיצת חזה בשפוע חיובי עם משקולות'),
      (mg_chest, 'לחיצת חזה בשכיבה עם מוט'),
      (mg_chest, 'פרפר במכונה'),
      (mg_chest, 'לחיצת חזה בשיפוע חיובי במוט'),
      (mg_chest, 'לחיצת חזה בשיפוע חיובי'),
      (mg_chest, 'לחיצת חזה עם מוט בשכיבה'),
      (mg_chest, 'פרפר'),
      (mg_chest, 'שכיבות סמיכה'),
      (mg_chest, 'לחיצת חזה עם משקולות'),
      (mg_chest, 'פרפר בשכיבה עם משקולות');
    
    -- תרגילי יד אחורית - תלת ראשי (8)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_triceps, 'מקבילים חופשי'),
      (mg_triceps, 'פשיטת מרפקים בעמידה עם חבל /מוט'),
      (mg_triceps, 'קיק בק'),
      (mg_triceps, 'פשיטת מרפקים בעמידה עם מוט'),
      (mg_triceps, 'פשיטת מרפקים עם חבל'),
      (mg_triceps, 'פשיטת מרפקים בעמידה בפולי עליון'),
      (mg_triceps, 'לחיצה צרפתית בשכיבה על הגב'),
      (mg_triceps, 'פשיטת מרפקים בפולי עליון');
    
    -- תרגילי גב (10)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_back, 'מתח חופשי'),
      (mg_back, 'משיכה בפולי עליון אחיזה רחבה'),
      (mg_back, 'משיכה בפולי עליון אחיזה הפוכה'),
      (mg_back, 'פול אובר'),
      (mg_back, 'חתירה האמר'),
      (mg_back, 'חתירה בקרוס כפול'),
      (mg_back, 'חתירה במכונה'),
      (mg_back, 'משיכה במוט בפולי עליון לכייוון החזה'),
      (mg_back, 'משיכה בפולי עליון'),
      (mg_back, 'דדליפט');
    
    -- תרגילי יד קדמית - דו ראשי (8)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_biceps, 'כפיפת ממרפקים בשיפוע 30'),
      (mg_biceps, 'כפיפת מרפקים בורג'),
      (mg_biceps, 'פטישים'),
      (mg_biceps, 'כפיפה בישיבה בספסל'),
      (mg_biceps, 'יד קידמית בישיבה כפופה'),
      (mg_biceps, 'בורג בישביה'),
      (mg_biceps, 'כפיפת מרפקים בישיבה'),
      (mg_biceps, 'כפיפת מרפקים בעמידה');
    
    -- תרגילי כתפיים (5)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_shoulders, 'לחיצת כתפיים בישיבה עם משקולות'),
      (mg_shoulders, 'לחיצת כתפיים במכונה'),
      (mg_shoulders, 'הרחקה לצדדים עם משקולות'),
      (mg_shoulders, 'הרחקת כתפיים לצדדים'),
      (mg_shoulders, 'לחיצת כתפיים עם משקולות בספסל 90 מעלות');
    
    -- תרגילי רגליים (11)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_legs, 'פשיטת ברכיים במכונה'),
      (mg_legs, 'סקוואט'),
      (mg_legs, 'כפיפית ברכיים'),
      (mg_legs, 'מכרעים'),
      (mg_legs, 'סקוואט עם משקולת'),
      (mg_legs, 'לחיצת רגליים'),
      (mg_legs, 'כפיפת ברך במכונה'),
      (mg_legs, 'דדליפט רומני'),
      (mg_legs, 'גוד מורנינג'),
      (mg_legs, 'לג פרס / סקווט (מכונה)'),
      (mg_legs, 'סקוואט עם מוט');
    
    -- תרגילי בטן (6)
    INSERT INTO exercises (muscle_group_id, name) VALUES
      (mg_abs, 'כפיפות בטן'),
      (mg_abs, 'פלאנק'),
      (mg_abs, 'כפיפות בטן עם משקל'),
      (mg_abs, 'הרמת רגליים בשכיבה'),
      (mg_abs, 'כפיפות בטן באלכסון'),
      (mg_abs, 'כפיפות בטן על בוסו');
      
  END LOOP;
END $$;
