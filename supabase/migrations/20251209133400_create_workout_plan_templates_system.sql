/*
  # יצירת מערכת תבניות תוכניות אימון

  1. טבלה חדשה
    - workout_plan_templates_system: תבניות מוכנות למערכת
    
  2. שדות
    - id: מזהה ייחודי
    - name: שם התבנית (פול בודי, A-B, וכו')
    - description: תיאור התבנית
    - days_per_week: מספר ימי אימון בשבוע
    - template_data: נתוני התבנית (JSONB)
    - category: קטגוריה (beginner, intermediate, advanced)
    
  3. אבטחה
    - RLS מופעל
    - כולם יכולים לקרוא
*/

-- יצירת טבלת תבניות מערכת
CREATE TABLE IF NOT EXISTS workout_plan_templates_system (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  days_per_week int NOT NULL DEFAULT 3,
  template_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  category varchar(50) DEFAULT 'intermediate',
  created_at timestamp DEFAULT now()
);

-- אבטחה - כולם יכולים לקרוא
ALTER TABLE workout_plan_templates_system ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read workout plan templates"
  ON workout_plan_templates_system
  FOR SELECT
  USING (true);

-- הוספת תבניות מוכנות
INSERT INTO workout_plan_templates_system (name, description, days_per_week, template_data, category) VALUES
(
  'פול בודי - Full Body',
  'אימון גוף מלא 3 פעמים בשבוע. מתאים למתחילים ובינוניים.',
  3,
  '[
    {
      "day_name": "יום א",
      "focus": "גוף מלא",
      "exercises": [
        {"name": "סקוואט", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "לחיצת חזה כנגד מוט", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "חתירה כבלים בישיבה", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "לחיצת כתפיים משקולות יד", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "כפיפת מרפקים כנגד מוט", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "פלאנק", "sets": 3, "reps": "30-60 שניות", "rest": 60}
      ]
    },
    {
      "day_name": "יום ב",
      "focus": "גוף מלא",
      "exercises": [
        {"name": "דדליפט רומני", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "לחיצת חזה כנגד משקולות יד", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "מתח", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "הרחקה לצדדים", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "פשיטת מרפקים כבל עליון", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "כפיפות בטן", "sets": 3, "reps": "15-20", "rest": 60}
      ]
    },
    {
      "day_name": "יום ג",
      "focus": "גוף מלא",
      "exercises": [
        {"name": "לחיצת רגליים", "sets": 3, "reps": "12-15", "rest": 90},
        {"name": "לחיצת חזה בשיפוע חיובי", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "פולי עליון אחיזה רחבה", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "לחיצת כתפיים כנגד מוט", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "כפיפת מרפקים פטישים", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "גלגל בטן", "sets": 3, "reps": "10-15", "rest": 60}
      ]
    }
  ]'::jsonb,
  'beginner'
),
(
  'Upper/Lower - A-B',
  'פיצול גוף עליון ותחתון, 4 פעמים בשבוע. מתאים לבינוניים ומתקדמים.',
  4,
  '[
    {
      "day_name": "Upper A - גוף עליון",
      "focus": "חזה, כתפיים, תלת",
      "exercises": [
        {"name": "לחיצת חזה כנגד מוט", "sets": 4, "reps": "6-8", "rest": 120},
        {"name": "לחיצת כתפיים כנגד מוט", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "לחיצת חזה בשיפוע חיובי", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "הרחקה לצדדים", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "פשיטת מרפקים כבל עליון", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "מקבילים", "sets": 3, "reps": "8-12", "rest": 90}
      ]
    },
    {
      "day_name": "Lower A - גוף תחתון",
      "focus": "רגליים, עכוז",
      "exercises": [
        {"name": "סקוואט", "sets": 4, "reps": "6-8", "rest": 120},
        {"name": "דדליפט רומני", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "לחיצת רגליים", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "כפיפת ברכיים במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "היפ תראסט", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "תאומים בעמידה", "sets": 4, "reps": "12-15", "rest": 60}
      ]
    },
    {
      "day_name": "Upper B - גוף עליון",
      "focus": "גב, דו ראשי",
      "exercises": [
        {"name": "דדליפט קלאסי", "sets": 4, "reps": "5-6", "rest": 120},
        {"name": "פולי עליון אחיזה רחבה", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "חתירה כבלים בישיבה", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "מסור", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "כפיפת מרפקים כנגד מוט", "sets": 3, "reps": "8-10", "rest": 60},
        {"name": "כפיפת מרפקים פטישים", "sets": 3, "reps": "10-12", "rest": 60}
      ]
    },
    {
      "day_name": "Lower B - גוף תחתון",
      "focus": "רגליים, עכוז",
      "exercises": [
        {"name": "מכרעים", "sets": 4, "reps": "8-10", "rest": 120},
        {"name": "לחיצת רגליים", "sets": 3, "reps": "12-15", "rest": 90},
        {"name": "פשיטת ברכיים במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "כפיפת ברכיים במכונה", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "גשר ירכיים", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "פלאנק", "sets": 3, "reps": "45-60 שניות", "rest": 60}
      ]
    }
  ]'::jsonb,
  'intermediate'
),
(
  'Push/Pull/Legs - A-B-C',
  'פיצול דחיפה/משיכה/רגליים, 6 פעמים בשבוע. למתקדמים.',
  6,
  '[
    {
      "day_name": "Push A - דחיפה",
      "focus": "חזה, כתפיים, תלת",
      "exercises": [
        {"name": "לחיצת חזה כנגד מוט", "sets": 4, "reps": "6-8", "rest": 120},
        {"name": "לחיצת כתפיים כנגד מוט", "sets": 4, "reps": "6-8", "rest": 90},
        {"name": "לחיצת חזה בשיפוע חיובי", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "הרחקה לצדדים", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "קרוס אובר כבלים עליון", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "פשיטת מרפקים כבל עליון", "sets": 3, "reps": "10-12", "rest": 60}
      ]
    },
    {
      "day_name": "Pull A - משיכה",
      "focus": "גב, דו ראשי",
      "exercises": [
        {"name": "דדליפט קלאסי", "sets": 4, "reps": "5-6", "rest": 120},
        {"name": "פולי עליון אחיזה רחבה", "sets": 4, "reps": "8-10", "rest": 90},
        {"name": "חתירה כבלים בישיבה", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "מסור", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "כפיפת מרפקים כנגד מוט", "sets": 3, "reps": "8-10", "rest": 60},
        {"name": "כפיפת מרפקים בכיסא כומר", "sets": 3, "reps": "10-12", "rest": 60}
      ]
    },
    {
      "day_name": "Legs A - רגליים",
      "focus": "רגליים, עכוז",
      "exercises": [
        {"name": "סקוואט", "sets": 4, "reps": "6-8", "rest": 120},
        {"name": "דדליפט רומני", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "לחיצת רגליים", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "כפיפת ברכיים במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "פשיטת ברכיים במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "תאומים בעמידה", "sets": 4, "reps": "15-20", "rest": 60}
      ]
    },
    {
      "day_name": "Push B - דחיפה",
      "focus": "חזה, כתפיים, תלת",
      "exercises": [
        {"name": "לחיצת חזה כנגד משקולות יד", "sets": 4, "reps": "8-10", "rest": 90},
        {"name": "לחיצת כתפיים משקולות יד", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "מקבילים", "sets": 3, "reps": "8-12", "rest": 90},
        {"name": "כפיפה מלפנים", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "פרפר במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "לחיצה צרפתית", "sets": 3, "reps": "10-12", "rest": 60}
      ]
    },
    {
      "day_name": "Pull B - משיכה",
      "focus": "גב, דו ראשי",
      "exercises": [
        {"name": "מתח", "sets": 4, "reps": "6-10", "rest": 120},
        {"name": "חתירה כנגד מוט בהטיית גו", "sets": 4, "reps": "8-10", "rest": 90},
        {"name": "פולי עליון אחיזה רחבה", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "פשיטת גו", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "כפיפת מרפקים פטישים", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "כפיפת מרפקים משקולות יד", "sets": 3, "reps": "12-15", "rest": 60}
      ]
    },
    {
      "day_name": "Legs B - רגליים",
      "focus": "רגליים, עכוז",
      "exercises": [
        {"name": "מכרעים", "sets": 4, "reps": "8-10", "rest": 120},
        {"name": "לחיצת רגליים", "sets": 4, "reps": "12-15", "rest": 90},
        {"name": "דדליפט רומני", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "פשיטת ברכיים במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "היפ תראסט", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "כפיפות בטן", "sets": 3, "reps": "15-20", "rest": 60}
      ]
    }
  ]'::jsonb,
  'advanced'
),
(
  'Push/Pull - 2 ימים',
  'פיצול דחיפה/משיכה, 4 פעמים בשבוע. מתאים לבינוניים.',
  4,
  '[
    {
      "day_name": "Push A - דחיפה + רגליים",
      "focus": "חזה, כתפיים, תלת, רגליים",
      "exercises": [
        {"name": "סקוואט", "sets": 4, "reps": "8-10", "rest": 120},
        {"name": "לחיצת חזה כנגד מוט", "sets": 4, "reps": "6-8", "rest": 120},
        {"name": "לחיצת כתפיים משקולות יד", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "לחיצת חזה בשיפוע חיובי", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "הרחקה לצדדים", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "פשיטת מרפקים כבל עליון", "sets": 3, "reps": "10-12", "rest": 60}
      ]
    },
    {
      "day_name": "Pull A - משיכה + רגליים",
      "focus": "גב, דו ראשי, רגליים אחוריות",
      "exercises": [
        {"name": "דדליפט קלאסי", "sets": 4, "reps": "5-6", "rest": 120},
        {"name": "פולי עליון אחיזה רחבה", "sets": 4, "reps": "8-10", "rest": 90},
        {"name": "חתירה כבלים בישיבה", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "כפיפת ברכיים במכונה", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "כפיפת מרפקים כנגד מוט", "sets": 3, "reps": "8-10", "rest": 60},
        {"name": "פלאנק", "sets": 3, "reps": "45-60 שניות", "rest": 60}
      ]
    },
    {
      "day_name": "Push B - דחיפה + רגליים",
      "focus": "חזה, כתפיים, תלת, רגליים",
      "exercises": [
        {"name": "לחיצת רגליים", "sets": 4, "reps": "12-15", "rest": 90},
        {"name": "לחיצת חזה כנגד משקולות יד", "sets": 4, "reps": "8-10", "rest": 90},
        {"name": "לחיצת כתפיים כנגד מוט", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "קרוס אובר כבלים עליון", "sets": 3, "reps": "12-15", "rest": 60},
        {"name": "כפיפה מלפנים", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "תאומים בעמידה", "sets": 4, "reps": "15-20", "rest": 60}
      ]
    },
    {
      "day_name": "Pull B - משיכה + רגליים",
      "focus": "גב, דו ראשי, עכוז",
      "exercises": [
        {"name": "דדליפט רומני", "sets": 4, "reps": "8-10", "rest": 90},
        {"name": "מתח", "sets": 3, "reps": "6-10", "rest": 120},
        {"name": "חתירה כנגד מוט בהטיית גו", "sets": 3, "reps": "8-10", "rest": 90},
        {"name": "היפ תראסט", "sets": 3, "reps": "10-12", "rest": 90},
        {"name": "כפיפת מרפקים פטישים", "sets": 3, "reps": "10-12", "rest": 60},
        {"name": "גלגל בטן", "sets": 3, "reps": "10-15", "rest": 60}
      ]
    }
  ]'::jsonb,
  'intermediate'
);
