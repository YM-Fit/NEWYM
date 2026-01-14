# סיכום תיקוני שגיאות

## שגיאות שזוהו ותוקנו:

### ✅ 1. RLS Policies for food_diary_meals
- **בעיה**: הטבלה `food_diary_meals` לא הייתה עם RLS policies
- **פתרון**: נוספו policies למאמנים ומתאמנים
- **סטטוס**: ✅ תוקן

### ✅ 2. Security Functions for Views
- **בעיה**: Views (`food_diary_entries`, `habit_logs_with_trainee`) לא היו נגישים בגלל RLS
- **פתרון**: נוצרו security definer functions:
  - `get_food_diary_entries(p_trainee_id, p_entry_date)`
  - `get_habit_logs_by_trainee(p_trainee_id, p_log_date)`
- **סטטוס**: ✅ תוקן

### ⚠️ 3. Query Format Issues
השגיאות הבאות נראות בקונסול אבל הקוד נראה תקין:

#### `trainee_habits` - 404
- **סיבה אפשרית**: RLS block או query format שגוי
- **פתרון**: ה-RLS policies קיימים, אבל ייתכן שהמשתמש לא מאומת כראוי

#### `food_diary_entries` - 404  
- **סיבה אפשרית**: View לא נגיש ישירות דרך REST API
- **פתרון**: להשתמש ב-function `get_food_diary_entries()` במקום

#### `habit_logs` with `trainee_id` - 404/400
- **סיבה אפשרית**: `habit_logs` לא יש `trainee_id` ישירות
- **פתרון**: להשתמש ב-view `habit_logs_with_trainee` או function `get_habit_logs_by_trainee()`

#### `trainee_goals` with `columns` parameter - 403
- **סיבה אפשרית**: Query format שגוי (שימוש ב-`columns` במקום `select`)
- **פתרון**: צריך למצוא איפה נעשה השימוש הזה ולתקן

#### `meals` - 400
- **סיבה אפשרית**: Query format שגוי או RLS block
- **פתרון**: לבדוק את ה-query format

### ⚠️ 4. Recharts Warnings
- **בעיה**: `width(-1) and height(-1) of chart should be greater than 0`
- **סיבה**: Container לא מוגדר כראוי בזמן render ראשוני
- **פתרון**: להוסיף `minHeight` או לוודא שה-container visible

## המלצות לתיקון נוסף:

1. **לבדוק את הקוד שמבצע queries ישירות** - ייתכן שיש cached queries או code שלא נמצא
2. **לבדוק authentication** - ייתכן שהמשתמש לא מאומת כראוי
3. **לבדוק query format** - לוודא שכל ה-queries משתמשים ב-format הנכון

## קבצים שצריך לבדוק:

- `src/components/trainee/TraineeDashboard.tsx` - queries ל-habits ו-goals
- כל מקום שמשתמש ב-`food_diary_entries` view ישירות
- כל מקום שמשתמש ב-`habit_logs` עם `trainee_id`
