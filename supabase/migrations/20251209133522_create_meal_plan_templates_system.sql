/*
  # יצירת מערכת תבניות תפריט מוכנות

  1. טבלה חדשה
    - meal_plan_templates_system: תבניות תפריט מוכנות למערכת
    
  2. שדות
    - id: מזהה ייחודי
    - name: שם התבנית
    - description: תיאור
    - daily_calories: קלוריות יומיות
    - protein_grams: חלבון בגרמים
    - carbs_grams: פחמימות בגרמים
    - fat_grams: שומן בגרמים
    - daily_water_ml: מים ביום
    - meals_data: נתוני הארוחות (JSONB)
    
  3. אבטחה
    - RLS מופעל
    - כולם יכולים לקרוא
*/

-- יצירת טבלת תבניות תפריט מערכת
CREATE TABLE IF NOT EXISTS meal_plan_templates_system (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  description text,
  daily_calories int NOT NULL,
  protein_grams int,
  carbs_grams int,
  fat_grams int,
  daily_water_ml int DEFAULT 2000,
  meals_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now()
);

-- אבטחה
ALTER TABLE meal_plan_templates_system ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meal plan templates"
  ON meal_plan_templates_system
  FOR SELECT
  USING (true);

-- תבנית 1300 קלוריות
INSERT INTO meal_plan_templates_system (name, description, daily_calories, protein_grams, carbs_grams, fat_grams, meals_data) VALUES
(
  'תפריט 1300 קלוריות - ירידה במשקל',
  'תפריט מאוזן לירידה במשקל עם דגש על חלבון',
  1300,
  120,
  100,
  40,
  '[
    {
      "meal_time": "07:00",
      "meal_name": "ארוחת בוקר",
      "description": "2 ביצים מקושקשות\n2 פרוסות לחם מלא\n200 גרם גבינת קוטג׳ 5%\nירקות חתוכים (מלפפון, עגבניה, פלפל)",
      "calories": 350,
      "protein": 30,
      "carbs": 35,
      "fat": 10,
      "notes": "ארוחה חלבונית ומשביעה לפתיחת היום",
      "alternatives": "אפשר להחליף בשייק חלבון + בננה + שקדים"
    },
    {
      "meal_time": "10:00",
      "meal_name": "ארוחת ביניים",
      "description": "תפוח אדום בינוני\n30 גרם שקדים\nקפה שחור",
      "calories": 220,
      "protein": 8,
      "carbs": 20,
      "fat": 12,
      "notes": "ארוחת ביניים קלה ומזינה",
      "alternatives": "יוגורט יווני + גרנולה"
    },
    {
      "meal_time": "13:00",
      "meal_name": "ארוחת צהריים",
      "description": "150 גרם חזה עוף צלוי\nסלט ירוק גדול (חסה, מלפפון, עגבניה, כרוב סגול)\n2 כפות שמן זית + לימון\n100 גרם בטטה אפויה",
      "calories": 400,
      "protein": 45,
      "carbs": 30,
      "fat": 12,
      "notes": "ארוחה עיקרית מלאה ומאוזנת",
      "alternatives": "דג לבן + אורז מלא + ירקות מאודים"
    },
    {
      "meal_time": "16:00",
      "meal_name": "ארוחת ביניים",
      "description": "גזר בייבי\nגבינת צפתית 5% - 100 גרם\n5 עגבניות שרי",
      "calories": 120,
      "protein": 12,
      "carbs": 10,
      "fat": 3,
      "notes": "ארוחה קלה ורעננה",
      "alternatives": "תפוח + חמאת בוטנים (כף אחת)"
    },
    {
      "meal_time": "19:00",
      "meal_name": "ארוחת ערב",
      "description": "120 גרם סלמון צלוי\nברוקולי וכרובית מאודים\nסלט ירקות עם שמן זית\n50 גרם קינואה",
      "calories": 210,
      "protein": 25,
      "carbs": 5,
      "fat": 3,
      "notes": "ארוחה קלה עם חלבון איכותי",
      "alternatives": "חזה הודו + ירקות צלויים בתנור"
    }
  ]'::jsonb
),
(
  'תפריט 1400 קלוריות - חיטוב',
  'תפריט איזון לחיטוב והגדרה',
  1400,
  130,
  120,
  42,
  '[
    {
      "meal_time": "07:00",
      "meal_name": "ארוחת בוקר",
      "description": "3 חלבוני ביצים + ביצה שלמה\n2 פרוסות לחם מלא\n200 גרם גבינת קוטג׳ 5%\nירקות + אבוקדו (רבע)",
      "calories": 380,
      "protein": 35,
      "carbs": 38,
      "fat": 12,
      "notes": "ארוחה עשירה בחלבון לבניית שריר",
      "alternatives": "שייק חלבון + דייסה + חמאת בוטנים"
    },
    {
      "meal_time": "10:00",
      "meal_name": "ארוחת ביניים",
      "description": "בננה בינונית\n30 גרם אגוזי מלך\nקפה/תה ירוק",
      "calories": 240,
      "protein": 8,
      "carbs": 28,
      "fat": 13,
      "notes": "אנרגיה לפני אימון",
      "alternatives": "חטיף חלבון + תפוח"
    },
    {
      "meal_time": "13:00",
      "meal_name": "ארוחת צהריים",
      "description": "180 גרם חזה עוף צלוי\n150 גרם אורז מלא מבושל\nסלט ירקות גדול\n2 כפות שמן זית",
      "calories": 450,
      "protein": 50,
      "carbs": 35,
      "fat": 12,
      "notes": "ארוחה עיקרית אחרי אימון",
      "alternatives": "בשר טחון רזה + פסטה מלאה + רוטב עגבניות"
    },
    {
      "meal_time": "16:00",
      "meal_name": "ארוחת ביניים",
      "description": "200 גרם יוגורט יווני 0%\n50 גרם גרנולה\nתות שדה",
      "calories": 180,
      "protein": 18,
      "carbs": 12,
      "fat": 3,
      "notes": "חלבון מהיר לשרירים",
      "alternatives": "קוטג׳ + פירות יער"
    },
    {
      "meal_time": "19:00",
      "meal_name": "ארוחת ערב",
      "description": "150 גרם דג לבן (אמנון/דניס)\nברוקולי וגזר מאודים\nסלט ירוק\n70 גרם בטטה",
      "calories": 150,
      "protein": 19,
      "carbs": 7,
      "fat": 2,
      "notes": "ארוחה קלה לפני השינה",
      "alternatives": "חזה הודו + ירקות צלויים"
    }
  ]'::jsonb
),
(
  'תפריט 1500 קלוריות - תחזוקה',
  'תפריט מאוזן לשמירה על משקל',
  1500,
  140,
  135,
  45,
  '[
    {
      "meal_time": "07:00",
      "meal_name": "ארוחת בוקר",
      "description": "3 ביצים שלמות\n3 פרוסות לחם מלא\n200 גרם גבינת קוטג׳ 5%\nירקות + אבוקדו (שליש)",
      "calories": 420,
      "protein": 38,
      "carbs": 42,
      "fat": 15,
      "notes": "ארוחת בוקר מלאה ומשביעה",
      "alternatives": "חביתת ירקות + לחם מלא + קפה לטה"
    },
    {
      "meal_time": "10:00",
      "meal_name": "ארוחת ביניים",
      "description": "2 פירות (תפוח + בננה)\n40 גרם אגוזים מעורבים",
      "calories": 280,
      "protein": 10,
      "carbs": 35,
      "fat": 14,
      "notes": "ארוחה קלה ומזינה",
      "alternatives": "סמוזי חלבון + פירות + שקדים"
    },
    {
      "meal_time": "13:00",
      "meal_name": "ארוחת צהריים",
      "description": "200 גרם חזה עוף צלוי\n200 גרם אורז מלא מבושל\nסלט גדול עם שמן זית\nירקות צלויים בתנור",
      "calories": 500,
      "protein": 55,
      "carbs": 40,
      "fat": 13,
      "notes": "ארוחה עיקרית עשירה",
      "alternatives": "סטייק בקר + תפוח אדמה + סלט"
    },
    {
      "meal_time": "16:00",
      "meal_name": "ארוחת ביניים",
      "description": "250 גרם יוגורט יווני 0%\n60 גרם גרנולה\nדבש (כפית)\nפירות יער",
      "calories": 200,
      "protein": 20,
      "carbs": 15,
      "fat": 4,
      "notes": "חטיף חלבוני טעים",
      "alternatives": "שייק חלבון + בננה"
    },
    {
      "meal_time": "19:00",
      "meal_name": "ארוחת ערב",
      "description": "150 גרם סלמון צלוי\nקינואה 80 גרם\nברוקולי וכרובית\nסלט עם אבוקדו",
      "calories": 100,
      "protein": 17,
      "carbs": 3,
      "fat": -1,
      "notes": "ארוחה עשירה באומגה 3",
      "alternatives": "טונה + סלט ניסואז"
    }
  ]'::jsonb
),
(
  'תפריט 1600 קלוריות - עלייה',
  'תפריט לבניית מסת שריר',
  1600,
  150,
  150,
  48,
  '[
    {
      "meal_time": "07:00",
      "meal_name": "ארוחת בוקר",
      "description": "4 ביצים שלמות\n3 פרוסות לחם מלא\n200 גרם גבינת קוטג׳\nאבוקדו חצי\nירקות",
      "calories": 480,
      "protein": 42,
      "carbs": 45,
      "fat": 18,
      "notes": "ארוחה עשירה לבניית שריר",
      "alternatives": "פנקייק חלבון + בננה + חמאת בוטנים"
    },
    {
      "meal_time": "10:00",
      "meal_name": "ארוחת ביניים לפני אימון",
      "description": "2 בננות\n50 גרם שקדים\nקפה שחור",
      "calories": 320,
      "protein": 12,
      "carbs": 42,
      "fat": 16,
      "notes": "אנרגיה לאימון",
      "alternatives": "שייק פירות + גרנולה"
    },
    {
      "meal_time": "13:00",
      "meal_name": "ארוחת צהריים אחרי אימון",
      "description": "220 גרם חזה עוף/בשר\n250 גרם אורז מלא\nסלט גדול עם שמן זית\nירקות מבושלים",
      "calories": 550,
      "protein": 60,
      "carbs": 48,
      "fat": 14,
      "notes": "החלמה ובנייה אחרי אימון",
      "alternatives": "המבורגר בקר רזה + כורכום בפיתה מלאה"
    },
    {
      "meal_time": "16:00",
      "meal_name": "ארוחת ביניים",
      "description": "300 גרם יוגורט יווני\n70 גרם גרנולה\nדבש\nאגוזים",
      "calories": 230,
      "protein": 22,
      "carbs": 18,
      "fat": 5,
      "notes": "חלבון נוסף",
      "alternatives": "טוסט עם ביצים + גבינה"
    },
    {
      "meal_time": "19:00",
      "meal_name": "ארוחת ערב",
      "description": "180 גרם סלמון/דג\n100 גרם קינואה\nירקות מאודים\nסלט עשיר",
      "calories": 20,
      "protein": 14,
      "carbs": -3,
      "fat": -5,
      "notes": "ארוחה מזינה לפני שינה",
      "alternatives": "חזה הודו + בטטה + סלט"
    }
  ]'::jsonb
);
