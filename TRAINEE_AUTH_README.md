# מערכת Authentication למתאמנים

## סקירה כללית

המערכת עודכנה לשימוש ב-Supabase Authentication אמיתי עבור מתאמנים. כעת כל מתאמן מקבל משתמש ב-`auth.users` ויכול להתחבר בצורה מאובטחת.

## שינויים במערכת

### 1. טבלת `trainee_auth`
נוספה עמודה `auth_user_id` שמקשרת את המתאמן למשתמש ב-`auth.users`.

### 2. Edge Functions חדשים

#### `trainee-login`
התחברות של מתאמן עם מספר טלפון וסיסמה.

**URL:**
```
${SUPABASE_URL}/functions/v1/trainee-login
```

**Request:**
```typescript
{
  phone: string;      // מספר טלפון (לדוגמה: "0526492728")
  password: string;   // סיסמה
}
```

**Response:**
```typescript
{
  success: true;
  session: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      user_metadata: {
        phone: string;
        trainee_id: string;
        full_name: string;
        is_trainee: true;
      }
    }
  };
  trainee: {
    id: string;
    full_name: string;
    phone: string;
    // ... שאר הנתונים של המתאמן
  }
}
```

#### `trainer-register-trainee`
מאמן רושם מתאמן קיים למערכת ה-auth.

**URL:**
```
${SUPABASE_URL}/functions/v1/trainer-register-trainee
```

**Headers:**
```
Authorization: Bearer ${trainer_access_token}
```

**Request:**
```typescript
{
  trainee_id: string;  // ID של המתאמן
  password: string;    // סיסמה למתאמן
}
```

## שימוש באפליקציית המתאמן

### שלב 1: רישום מתאמן קיים

מהאפליקציה של המאמן, קרא ל-Edge Function:

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// קבל את ה-access_token של המאמן
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${SUPABASE_URL}/functions/v1/trainer-register-trainee`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trainee_id: 'd7a26867-5e31-42c8-a2cd-e0d35b18ff26', // ID של יוסי
      password: 'סיסמה_חזקה_כאן', // סיסמה חדשה למתאמן
    }),
  }
);

const data = await response.json();
console.log(data);
```

### שלב 2: התחברות של המתאמן

באפליקציה של המתאמן, החלף את הקוד הקיים ב:

```typescript
// TraineeAuthContext.tsx

const login = async (phone: string, password: string) => {
  try {
    // קריאה ל-Edge Function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/trainee-login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // שמור את ה-session
    const { session, trainee } = data;

    // עדכן את ה-session ב-Supabase client
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    // שמור את המתאמן ב-state
    setTrainee(trainee);

    return { success: true, trainee };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

### שלב 3: שימוש ב-Session

לאחר ההתחברות, כל הקריאות לדאטהבייס יעבדו אוטומטית עם ה-RLS policies:

```typescript
// קבלת נתונים של המתאמן
const { data: trainee } = await supabase
  .from('trainees')
  .select('*')
  .eq('id', traineeId)
  .single();

// קבלת מדידות
const { data: measurements } = await supabase
  .from('measurements')
  .select('*')
  .eq('trainee_id', traineeId)
  .order('measurement_date', { ascending: false });

// קבלת אימונים
const { data: workouts } = await supabase
  .from('workouts')
  .select(`
    *,
    workout_trainees!inner(trainee_id)
  `)
  .eq('workout_trainees.trainee_id', traineeId)
  .order('workout_date', { ascending: false });
```

## RLS Policies

המערכת כוללת policies מאובטחים:

- ✅ מתאמנים יכולים לראות רק את הנתונים שלהם
- ✅ מתאמנים לא יכולים לראות נתונים של מתאמנים אחרים
- ✅ מאמנים יכולים לראות את כל המתאמנים שלהם
- ✅ כל הגישה מבוססת על `auth.uid()` - אמיתי ומאובטח

## טיפול בשגיאות

### "Trainee already has authentication set up"
המתאמן כבר רשום. השתמש ב-login רגיל.

### "Invalid phone or password"
מספר הטלפון או הסיסמה שגויים.

### "Trainee not found or doesn't belong to you"
המאמן מנסה לרשום מתאמן שלא שייך לו.

## מעבר מהמערכת הישנה

אם יש לך מתאמנים עם רשומות ב-`trainee_auth` הישנות (עם `password` בטקסט רגיל):

1. המאמן צריך לקרוא ל-`trainer-register-trainee` עבור כל מתאמן
2. זה יוצר משתמש auth אמיתי ומעדכן את `auth_user_id`
3. המתאמן יכול להתחבר עם הסיסמה החדשה

## אבטחה

- ✅ סיסמאות מאוחסנות באופן מאובטח ב-`auth.users` (hash)
- ✅ טבלת `trainee_auth` כבר לא שומרת סיסמאות בטקסט רגיל
- ✅ כל הגישה מבוססת על JWT tokens
- ✅ RLS policies מונעים גישה לא מורשית
- ✅ Sessions נשמרים ומתרעננים אוטומטית
