/*
  # Consolidate Duplicate RLS Policies - Part 1

  1. Changes
    - Remove duplicate permissive policies for same tables/actions
    - Keep only one comprehensive policy per action
    
  2. Tables Cleaned
    - daily_log, daily_water_intake, equipment, exercise_sets, exercises
    - food_diary, food_diary_meals, meal_plan_items, meal_plan_meals
    - meal_plans, meals, measurements, mental_tools, muscle_groups
*/

-- DAILY_LOG - Keep "Trainees can manage their daily_log"
DROP POLICY IF EXISTS "Trainers can delete trainee logs" ON daily_log;
DROP POLICY IF EXISTS "מתאמנים יכולים להוסיף יומן יומי" ON daily_log;
DROP POLICY IF EXISTS "Trainers can insert trainee logs" ON daily_log;
DROP POLICY IF EXISTS "trainee_select_own_daily_log" ON daily_log;
DROP POLICY IF EXISTS "Trainers can view trainee logs" ON daily_log;
DROP POLICY IF EXISTS "Trainers can update trainee logs" ON daily_log;
DROP POLICY IF EXISTS "מתאמנים יכולים לעדכן יומן יומי" ON daily_log;

-- DAILY_WATER_INTAKE - Keep consolidated policy
DROP POLICY IF EXISTS "Trainees can insert own water intake" ON daily_water_intake;
DROP POLICY IF EXISTS "Trainees can view own water intake" ON daily_water_intake;
DROP POLICY IF EXISTS "Trainers can view trainees water intake" ON daily_water_intake;
DROP POLICY IF EXISTS "Trainees can update own water intake" ON daily_water_intake;

-- EQUIPMENT - Keep trainer and trainee policies separate
DROP POLICY IF EXISTS "מתאמנים יכולים לראות את כל הציוד" ON equipment;

-- EXERCISE_SETS - Keep consolidated trainer policies
DROP POLICY IF EXISTS "מאמנים יכולים למחוק סטים מאימונים" ON exercise_sets;
DROP POLICY IF EXISTS "מאמנים יכולים להוסיף סטים לאימוני" ON exercise_sets;
DROP POLICY IF EXISTS "Trainees can view their exercise_sets" ON exercise_sets;
DROP POLICY IF EXISTS "מאמנים יכולים לראות סטים באימונים " ON exercise_sets;
DROP POLICY IF EXISTS "מאמנים יכולים לעדכן סטים באימונים" ON exercise_sets;

-- EXERCISES - Keep simple Anyone/trainees view
DROP POLICY IF EXISTS "trainees_view_exercises" ON exercises;
DROP POLICY IF EXISTS "מתאמנים יכולים לראות את כל התרגילי" ON exercises;

-- FOOD_DIARY_MEALS - Keep consolidated
DROP POLICY IF EXISTS "Trainees can delete own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can insert own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can view own meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainers can view trainees meals" ON food_diary_meals;
DROP POLICY IF EXISTS "Trainees can update own meals" ON food_diary_meals;

-- MEAL_PLAN_ITEMS - Keep consolidated
DROP POLICY IF EXISTS "Trainees can view their meal_plan_items" ON meal_plan_items;
DROP POLICY IF EXISTS "Trainers can view meal plan items" ON meal_plan_items;
DROP POLICY IF EXISTS "Trainers can insert meal plan items" ON meal_plan_items;
DROP POLICY IF EXISTS "Trainers can update meal plan items" ON meal_plan_items;
DROP POLICY IF EXISTS "Trainers can delete meal plan items" ON meal_plan_items;

-- MEAL_PLANS - Keep consolidated
DROP POLICY IF EXISTS "Trainees can view their meal_plans" ON meal_plans;
DROP POLICY IF EXISTS "Trainers can view own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Trainers can insert own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Trainers can update own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Trainers can delete own meal plans" ON meal_plans;

-- MEALS - Keep consolidated
DROP POLICY IF EXISTS "Trainees can manage their meals" ON meals;
DROP POLICY IF EXISTS "Trainers can delete trainee meals" ON meals;
DROP POLICY IF EXISTS "מתאמנים יכולים למחוק ארוחות" ON meals;
DROP POLICY IF EXISTS "Trainers can insert trainee meals" ON meals;
DROP POLICY IF EXISTS "מתאמנים יכולים להוסיף ארוחות" ON meals;
DROP POLICY IF EXISTS "Trainers can view trainee meals" ON meals;
DROP POLICY IF EXISTS "Trainers can update trainee meals" ON meals;
DROP POLICY IF EXISTS "מתאמנים יכולים לעדכן ארוחות" ON meals;

-- MEASUREMENTS - Keep consolidated
DROP POLICY IF EXISTS "מתאמנים יכולים להוסיף מדידות" ON measurements;
DROP POLICY IF EXISTS "trainees_view_own_measurements" ON measurements;
DROP POLICY IF EXISTS "trainee_select_measurements" ON measurements;

-- MENTAL_TOOLS - Keep consolidated
DROP POLICY IF EXISTS "Trainers can delete their mental tools" ON mental_tools;
DROP POLICY IF EXISTS "Trainers can insert mental tools for their trainees" ON mental_tools;
DROP POLICY IF EXISTS "Trainees can view their mental tools" ON mental_tools;
DROP POLICY IF EXISTS "Trainers can view mental tools for their trainees" ON mental_tools;
DROP POLICY IF EXISTS "Trainers can update their mental tools" ON mental_tools;

-- MUSCLE_GROUPS - Keep consolidated
DROP POLICY IF EXISTS "trainees_view_muscle_groups" ON muscle_groups;
DROP POLICY IF EXISTS "מתאמנים יכולים לראות את כל קבוצות " ON muscle_groups;
