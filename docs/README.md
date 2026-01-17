# NEWYM CRM Documentation

ברוכים הבאים לתיעוד המלא של מערכת ה-CRM של NEWYM!

## תוכן עניינים

### למשתמשים
- [מדריך התחלה מהירה](./user-guide/getting-started.md) - התחלה מהירה עם המערכת
- [מדריך תכונות](./user-guide/features.md) - כל התכונות במערכת
- [שאלות נפוצות (FAQ)](./user-guide/faq.md) - תשובות לשאלות נפוצות

### למפתחים
- [ארכיטקטורה](./developer/architecture.md) - סקירה כללית של הארכיטקטורה
- [מבנה קוד](./developer/code-structure.md) - מבנה הקבצים והקוד
- [הנחיות תרומה](./developer/contributing.md) - איך לתרום לפרויקט

### תיעוד טכני
- [Database Schema](./technical/database-schema.md) - מבנה מסד הנתונים
- [Edge Functions](./technical/edge-functions.md) - פונקציות Edge
- [אינטגרציות](./technical/integrations.md) - אינטגרציות עם שירותים חיצוניים

### API
- [OpenAPI Specification](./api/openapi.yaml) - מפרט API מלא
- [Error Codes](./api/error-codes.md) - קודי שגיאה והסברים

## התחלה מהירה

### למשתמשים חדשים

1. קרא את [מדריך התחלה מהירה](./user-guide/getting-started.md)
2. חבר את Google Calendar
3. צור את הלקוח הראשון שלך

### למפתחים חדשים

1. קרא את [ארכיטקטורה](./developer/architecture.md)
2. עיין ב-[מבנה קוד](./developer/code-structure.md)
3. עקוב אחר [הנחיות תרומה](./developer/contributing.md)

## מבנה התיעוד

```
docs/
├── api/                    # API Documentation
│   ├── openapi.yaml       # OpenAPI/Swagger spec
│   └── error-codes.md     # Error codes documentation
│
├── user-guide/            # User Documentation
│   ├── getting-started.md  # Getting started guide
│   ├── features.md        # Features guide
│   └── faq.md             # FAQ
│
├── developer/              # Developer Documentation
│   ├── architecture.md    # System architecture
│   ├── code-structure.md  # Code structure
│   └── contributing.md   # Contributing guidelines
│
└── technical/              # Technical Documentation
    ├── database-schema.md # Database schema
    ├── edge-functions.md # Edge functions
    └── integrations.md   # Integrations
```

## עדכונים

התיעוד מתעדכן באופן קבוע. למידע על עדכונים אחרונים, עיין ב-[Changelog](./changelog.md).

## תמיכה

אם יש לך שאלות או בעיות:

1. בדוק את [FAQ](./user-guide/faq.md)
2. עיין בתיעוד הרלוונטי
3. צור [כרטיס תמיכה](./support.md)

## רישיון

התיעוד זמין תחת רישיון MIT.

---

**תאריך עדכון אחרון**: 2025-01-27  
**גרסה**: 1.0.0
