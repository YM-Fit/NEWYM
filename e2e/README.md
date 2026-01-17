# E2E Tests Documentation

## מבנה תיקיות

```
e2e/
├── config/
│   └── playwright.config.ts    # הגדרות Playwright
├── fixtures/
│   └── auth.ts                  # Fixtures לאימות
├── pages/
│   ├── LoginPage.ts            # Page Object ל-Login
│   └── CrmPage.ts              # Page Object ל-CRM
└── tests/
    ├── fixtures/
    │   └── auth.ts             # Fixtures לאימות (duplicate for tests)
    └── crm/
        ├── client-crud.spec.ts         # CRUD tests
        ├── client-linking.spec.ts      # Linking tests
        ├── pipeline-movement.spec.ts   # Pipeline tests
        └── analytics-dashboard.spec.ts # Analytics tests
```

## הרצת Tests

### הרצה רגילה
```bash
npm run test:e2e
```

### הרצה עם UI
```bash
npm run test:e2e:ui
```

### הרצה עם דפדפן גלוי
```bash
npm run test:e2e:headed
```

### הרצת test ספציפי
```bash
npx playwright test e2e/tests/crm/client-crud.spec.ts
```

## Page Objects

### LoginPage
- `goto()` - נווט לעמוד התחברות
- `login(email, password)` - התחברות

### CrmPage
- `goto()` - נווט ל-CRM
- `gotoClients()` - נווט ללקוחות
- `gotoPipeline()` - נווט ל-Pipeline
- `gotoAnalytics()` - נווט לאנליטיקה
- `createClient(data)` - יצירת לקוח
- `searchClient(query)` - חיפוש לקוח
- `clickClientCard(index)` - לחיצה על כרטיס לקוח

## Fixtures

### authenticatedPage
מספק עמוד מאומת אוטומטית עם trainer user.

### trainerUser / traineeUser
מספק נתוני משתמש לבדיקות.

## דרישות

- Node.js 18+
- Playwright installed (`npm install -D @playwright/test`)
- Browsers installed (`npx playwright install`)

## הערות

- Tests משתמשים ב-test database
- יש להגדיר משתמשי בדיקה במערכת
- Tests מחכים ל-networkidle לפני המשך
