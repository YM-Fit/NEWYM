-- =============================================
-- FOODS DATABASE SYSTEM
-- מערכת מאגר מזון עם יחידות מידה והמרות
-- =============================================

-- =============================================
-- 1. טבלת סוגי יחידות מידה
-- =============================================
CREATE TABLE IF NOT EXISTS unit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name_he VARCHAR(50) NOT NULL,           -- שם בעברית: "כף", "כפית", "כוס"
  name_en VARCHAR(50),                     -- שם באנגלית: "tbsp", "tsp", "cup"
  abbreviation VARCHAR(20),                -- קיצור: "כף", "כפית"

  -- המרה בסיסית
  base_grams DECIMAL(8,2),                 -- כמה גרם ביחידה (ברירת מחדל)
  base_ml DECIMAL(8,2),                    -- כמה מ"ל ביחידה

  -- סוג יחידה
  unit_category VARCHAR(20) NOT NULL,      -- 'weight', 'volume', 'piece', 'serving'

  -- סדר הצגה
  display_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. טבלת מאגר המזון
-- =============================================
CREATE TABLE IF NOT EXISTS foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- פרטי המזון
  name VARCHAR(150) NOT NULL,              -- שם המזון
  category VARCHAR(20) NOT NULL,           -- 'protein', 'carbs', 'fat'
  brand VARCHAR(100),                      -- חברה/מותג

  -- ערכים תזונתיים ל-100 גרם
  calories_per_100g DECIMAL(7,2) NOT NULL,
  protein_per_100g DECIMAL(6,2) NOT NULL,
  carbs_per_100g DECIMAL(6,2) NOT NULL,
  fat_per_100g DECIMAL(6,2) NOT NULL,

  -- שדות נוספים
  fiber_per_100g DECIMAL(5,2) DEFAULT 0,
  sugar_per_100g DECIMAL(5,2) DEFAULT 0,
  sodium_per_100g DECIMAL(6,2) DEFAULT 0,
  is_protein_enriched BOOLEAN DEFAULT false,

  -- יחידת ברירת מחדל
  default_unit_id UUID REFERENCES unit_types(id),
  default_serving_grams DECIMAL(8,2),      -- גודל מנה סטנדרטית בגרמים
  serving_description VARCHAR(50),          -- תיאור: "יחידה", "כוס", "פרוסה"

  -- חיפוש
  search_text TEXT,                        -- טקסט לחיפוש מהיר

  -- מטא
  is_verified BOOLEAN DEFAULT true,        -- מאומת (מה-CSV הראשי)
  is_common BOOLEAN DEFAULT false,         -- מזון נפוץ
  trainer_id UUID REFERENCES trainers(id), -- NULL = מערכת, UUID = מאמן הוסיף

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. טבלת המרות יחידות לכל מזון
-- =============================================
CREATE TABLE IF NOT EXISTS food_unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  unit_type_id UUID NOT NULL REFERENCES unit_types(id) ON DELETE CASCADE,

  grams_per_unit DECIMAL(8,2) NOT NULL,    -- כמה גרם ביחידה הזו למזון הזה

  is_default BOOLEAN DEFAULT false,         -- יחידה ברירת מחדל למזון
  display_order INT DEFAULT 0,              -- סדר הצגה

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(food_id, unit_type_id)
);

-- =============================================
-- 4. טבלת מזונות מועדפים
-- =============================================
CREATE TABLE IF NOT EXISTS favorite_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(trainer_id, food_id)
);

-- =============================================
-- 5. טבלת היסטוריית שימוש במזון
-- =============================================
CREATE TABLE IF NOT EXISTS food_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES foods(id) ON DELETE CASCADE,

  last_used_at TIMESTAMPTZ DEFAULT now(),
  usage_count INT DEFAULT 1,

  UNIQUE(trainer_id, food_id)
);

-- =============================================
-- 6. אינדקסים לביצועים
-- =============================================

-- חיפוש טקסט מהיר
CREATE INDEX IF NOT EXISTS idx_foods_search_text ON foods USING gin(to_tsvector('simple', coalesce(search_text, '')));

-- חיפוש לפי קטגוריה
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);

-- חיפוש לפי שם
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);

-- חיפוש לפי מאמן
CREATE INDEX IF NOT EXISTS idx_foods_trainer ON foods(trainer_id) WHERE trainer_id IS NOT NULL;

-- המרות לפי מזון
CREATE INDEX IF NOT EXISTS idx_food_conversions_food ON food_unit_conversions(food_id);

-- מועדפים לפי מאמן
CREATE INDEX IF NOT EXISTS idx_favorite_foods_trainer ON favorite_foods(trainer_id);

-- היסטוריה לפי מאמן
CREATE INDEX IF NOT EXISTS idx_food_usage_trainer ON food_usage_history(trainer_id);

-- =============================================
-- 7. הוספת יחידות מידה בסיסיות
-- =============================================
INSERT INTO unit_types (name_he, name_en, abbreviation, base_grams, base_ml, unit_category, display_order) VALUES
-- משקל
('גרם', 'gram', 'g', 1, NULL, 'weight', 1),
('קילוגרם', 'kilogram', 'kg', 1000, NULL, 'weight', 2),
('אונקיה', 'ounce', 'oz', 28, NULL, 'weight', 3),

-- נפח
('מיליליטר', 'milliliter', 'ml', NULL, 1, 'volume', 10),
('ליטר', 'liter', 'L', NULL, 1000, 'volume', 11),
('כפית', 'teaspoon', 'tsp', 5, 5, 'volume', 12),
('כף', 'tablespoon', 'tbsp', 15, 15, 'volume', 13),
('כוס', 'cup', 'cup', 240, 240, 'volume', 14),
('חצי כוס', 'half cup', '½ cup', 120, 120, 'volume', 15),
('שליש כוס', 'third cup', '⅓ cup', 80, 80, 'volume', 16),
('רבע כוס', 'quarter cup', '¼ cup', 60, 60, 'volume', 17),

-- יחידות
('יחידה', 'unit', 'יח''', NULL, NULL, 'piece', 20),
('יחידה קטנה', 'small unit', 'יח'' קטנה', NULL, NULL, 'piece', 21),
('יחידה בינונית', 'medium unit', 'יח'' בינונית', NULL, NULL, 'piece', 22),
('יחידה גדולה', 'large unit', 'יח'' גדולה', NULL, NULL, 'piece', 23),
('פרוסה', 'slice', 'פרוסה', NULL, NULL, 'piece', 24),
('פרוסה דקה', 'thin slice', 'פרוסה דקה', NULL, NULL, 'piece', 25),
('פרוסה עבה', 'thick slice', 'פרוסה עבה', NULL, NULL, 'piece', 26),

-- מנות
('מנה', 'serving', 'מנה', NULL, NULL, 'serving', 30),
('מנה קטנה', 'small serving', 'מנה קטנה', NULL, NULL, 'serving', 31),
('מנה גדולה', 'large serving', 'מנה גדולה', NULL, NULL, 'serving', 32),
('חצי', 'half', 'חצי', NULL, NULL, 'serving', 33),
('חבילה', 'package', 'חבילה', NULL, NULL, 'serving', 34),
('גביע', 'container', 'גביע', NULL, NULL, 'serving', 35),

-- כמויות קטנות
('קמצוץ', 'pinch', 'קמצוץ', 0.5, NULL, 'piece', 40),
('קורט', 'dash', 'קורט', 1, NULL, 'piece', 41)

ON CONFLICT DO NOTHING;

-- =============================================
-- 8. RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_usage_history ENABLE ROW LEVEL SECURITY;

-- Unit types - כולם יכולים לקרוא
CREATE POLICY "Anyone can read unit_types"
  ON unit_types FOR SELECT
  TO authenticated
  USING (true);

-- Foods - קריאה לכולם
CREATE POLICY "Anyone can read foods"
  ON foods FOR SELECT
  TO authenticated
  USING (true);

-- Foods - מאמן יכול להוסיף מזון
CREATE POLICY "Trainer can insert own foods"
  ON foods FOR INSERT
  TO authenticated
  WITH CHECK (trainer_id = auth.uid() OR trainer_id IS NULL);

-- Foods - מאמן יכול לעדכן מזון שלו
CREATE POLICY "Trainer can update own foods"
  ON foods FOR UPDATE
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Foods - מאמן יכול למחוק מזון שלו
CREATE POLICY "Trainer can delete own foods"
  ON foods FOR DELETE
  TO authenticated
  USING (trainer_id = auth.uid());

-- Food unit conversions - כולם יכולים לקרוא
CREATE POLICY "Anyone can read food_unit_conversions"
  ON food_unit_conversions FOR SELECT
  TO authenticated
  USING (true);

-- Favorite foods - מאמן יכול לנהל מועדפים שלו
CREATE POLICY "Trainer can manage own favorite_foods"
  ON favorite_foods FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Food usage history - מאמן יכול לנהל היסטוריה שלו
CREATE POLICY "Trainer can manage own food_usage_history"
  ON food_usage_history FOR ALL
  TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- =============================================
-- 9. פונקציה לעדכון search_text
-- =============================================
CREATE OR REPLACE FUNCTION update_food_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := COALESCE(NEW.name, '') || ' ' ||
                     COALESCE(NEW.category, '') || ' ' ||
                     COALESCE(NEW.brand, '');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_food_search_text
  BEFORE INSERT OR UPDATE ON foods
  FOR EACH ROW
  EXECUTE FUNCTION update_food_search_text();

-- =============================================
-- 10. פונקציה לחיפוש מזון
-- =============================================
CREATE OR REPLACE FUNCTION search_foods(
  search_query TEXT,
  category_filter VARCHAR DEFAULT NULL,
  trainer_filter UUID DEFAULT NULL,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  category VARCHAR,
  brand VARCHAR,
  calories_per_100g DECIMAL,
  protein_per_100g DECIMAL,
  carbs_per_100g DECIMAL,
  fat_per_100g DECIMAL,
  is_verified BOOLEAN,
  trainer_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.name,
    f.category,
    f.brand,
    f.calories_per_100g,
    f.protein_per_100g,
    f.carbs_per_100g,
    f.fat_per_100g,
    f.is_verified,
    f.trainer_id
  FROM foods f
  WHERE
    (search_query IS NULL OR search_query = '' OR
     f.name ILIKE '%' || search_query || '%' OR
     f.brand ILIKE '%' || search_query || '%')
    AND (category_filter IS NULL OR f.category = category_filter)
    AND (trainer_filter IS NULL OR f.trainer_id IS NULL OR f.trainer_id = trainer_filter)
  ORDER BY
    f.is_common DESC,
    f.is_verified DESC,
    CASE WHEN f.name ILIKE search_query || '%' THEN 0 ELSE 1 END,
    f.name
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
