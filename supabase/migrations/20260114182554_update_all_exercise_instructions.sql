/*
  # עדכון הוראות ביצוע לכל התרגילים הגלובליים
  
  מיגרציה זו מעדכנת את כל 43 התרגילים הגלובליים עם הסברים מפורטים ומדויקים.
  התרגילים הגלובליים הם אלה ששייכים לקבוצות שריר עם trainer_id = NULL
*/

DO $$
DECLARE
  exercise_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- עדכון כל התרגילים הגלובליים עם ההסברים המפורטים
  FOR exercise_record IN 
    SELECT e.id, e.name, mg.name as muscle_group_name
    FROM exercises e
    JOIN muscle_groups mg ON e.muscle_group_id = mg.id
    WHERE mg.trainer_id IS NULL
  LOOP
    -- עדכון לפי שם התרגיל
    CASE exercise_record.name
      -- חזה (6 תרגילים)
      WHEN 'לחיצת חזה כנגד מוט' THEN
        UPDATE exercises SET instructions = 'שכיבה על ספסל שטוח, אחיזת המוט ברוחב כתפיים פלוס 10-15 ס״מ. הורדה איטית של המוט עד לחזה, לחיצה חזקה כלפי מעלה עד לנעילת מרפקים (ללא נעילה קשה). התרגיל מפעיל בעיקר את החזה התיכון, כתפיים קדמיות וטריצפס.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'לחיצת חזה בשיפוע חיובי' THEN
        UPDATE exercises SET instructions = 'ביצוע זהה ללחיצת חזה רגילה, אך הספסל בזווית של 30-45 מעלות. שיפוע זה מעביר דגש לאזור החזה העליון והכתפיים הקדמיות. חשוב לשמור על כתפיים נמוכות ויציבות בגב התחתון.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'לחיצת חזה כנגד משקולות יד' THEN
        UPDATE exercises SET instructions = 'שכיבה על ספסל שטוח, אחיזת משקולת יד בכל יד. הורדה מבוקרת של המשקולות לצדי החזה עד להרגשת מתיחה, לחיצה כלפי מעלה. יתרון: טווח תנועה גדול יותר ועבודה עצמאית של כל יד, מאזנת חולשות בין הצדדים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פרפר במכונה' THEN
        UPDATE exercises SET instructions = 'ישיבה במכונה עם גב צמוד למשענת, מרפקים בזווית 90 מעלות. קירוב הידיים מולך תוך צביטה של שרירי החזה. תרגיל בידוד לחזה, מדגיש את החלק הפנימי והמרכזי של החזה. חזרה איטית למצב התחלתי.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'קרוס אובר כבלים עליון' THEN
        UPDATE exercises SET instructions = 'עמידה בין שתי עמדות כבלים עליונות, צעד קל קדימה. משיכת הכבלים כלפי מטה ולמרכז, כאילו חובקים עץ גדול. הדגש על צביטת החזה התחתון והמרכזי. שמירה על כיפוף קל במרפקים לאורך התנועה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'מקבילים' THEN
        UPDATE exercises SET instructions = 'תלייה על מוטות מקבילים, ירידה מבוקרת תוך הטיית גוף קדימה (להדגשת חזה) עד שהמרפקים בזווית 90 מעלות. דחיפה חזרה למעלה עד לנעילת מרפקים. תרגיל מורכב המפעיל חזה תחתון, טריצפס וכתפיים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- גב (7 תרגילים)
      WHEN 'מתח' THEN
        UPDATE exercises SET instructions = 'תלייה על מוט עליון, אחיזה ברוחב כתפיים פלוס. משיכת הגוף כלפי מעלה עד שהסנטר עובר את המוט, ירידה מבוקרת. תרגיל בסיסי ומורכב לפיתוח רוחב וכוח הגב, מפעיל את שריר הגב הרחב, טרפז אמצעי וביצפס.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פולי עליון אחיזה רחבה' THEN
        UPDATE exercises SET instructions = 'ישיבה מול מכונת פולי, אחיזת המוט ברוחב רחב. משיכת המוט לכיוון החזה העליון תוך דחיפת חזה קדימה וצביטת השכמות לאחור. דגש על עבודת הגב ולא הזרועות. תרגיל מצוין לפיתוח רוחב הגב.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'חתירה כנגד מוט בהטיית גו' THEN
        UPDATE exercises SET instructions = 'עמידה עם כיפוף ברכיים קל, הטיית גו 45 מעלות קדימה, גב ישר. משיכת המוט לעבר הבטן התחתונה תוך צביטת השכמות. הורדה מבוקרת. תרגיל מורכב המפעיל כל שרירי הגב, גב תחתון וליבה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'חתירה כבלים בישיבה' THEN
        UPDATE exercises SET instructions = 'ישיבה מול מכונת כבלים, רגליים על הדום. משיכת הכבל לעבר הבטן התחתונה תוך צביטת השכמות וזקיפת החזה. חזרה מבוקרת תוך מתיחת הגב. דגש על אזור הגב האמצעי והטרפז.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'מסור (חתירה יד אחת)' THEN
        UPDATE exercises SET instructions = 'אחת היד והברך הנגדית נשענות על ספסל. משיכת משקולת יד כלפי מעלה לצד הגוף, מרפק נע לאורך הצלעות. צביטת השכמה בנקודה העליונה. תרגיל המאפשר טווח תנועה מקסימלי ועבודה נפרדת לכל צד.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'דדליפט קלאסי' THEN
        UPDATE exercises SET instructions = 'עמידה עם רגליים ברוחב ירכיים, אחיזת המוט. הרמה תוך שמירה על גב ישר, דחיפה מהרגליים ופתיחת הירכיים. הורדה מבוקרת. תרגיל מורכב המפעיל גב תחתון, גב עליון, ירכיים אחוריות, ארבע ראשי והאמסטרינג.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פשיטת גו' THEN
        UPDATE exercises SET instructions = 'עמידה עם כיפוף ברכיים קל, אחיזת משקולת או מוט. פשיטת הגו כלפי מטה תוך שמירת גב ישר, ירידה עד להרגשת מתיחה בגב התחתון והאמסטרינג. חזרה למצב התחלתי. דגש על גב תחתון ואמסטרינג.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- כתפיים (6 תרגילים)
      WHEN 'לחיצת כתפיים כנגד מוט' THEN
        UPDATE exercises SET instructions = 'עמידה או ישיבה, אחיזת המוט ברוחב כתפיים פלוס. לחיצת המוט מעל הראש עד לנעילת מרפקים, הורדה מבוקרת עד לגובה כתפיים. תרגיל בסיסי לפיתוח כתפיים, מפעיל בעיקר את הדלתא הקדמית והאמצעית.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'לחיצת כתפיים משקולות יד' THEN
        UPDATE exercises SET instructions = 'ישיבה או עמידה, משקולת יד בכל יד. לחיצה כלפי מעלה בתנועה מבוקרת עד לנעילת מרפקים, ירידה עד גובה אוזניים. יתרון: טווח תנועה טבעי יותר וחופש תנועה, פחות לחץ על כתפיים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'הרחקה לצדדים' THEN
        UPDATE exercises SET instructions = 'עמידה עם משקולות יד לצד הגוף. הרמת הידיים לצדדים עד גובה כתפיים (מרפקים בכיפוף קל), ירידה מבוקרת. תרגיל בידוד לדלתא האמצעית, מעניק רוחב לכתפיים. חשוב להימנע מתנופה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'כפיפה מלפנים' THEN
        UPDATE exercises SET instructions = 'עמידה עם משקולות יד מול הירכיים. הרמת הידיים קדימה עד גובה כתפיים (או מעט מעל), ירידה מבוקרת. תרגיל בידוד לדלתא הקדמית. שמירה על מרפקים כמעט ישרים לאורך התנועה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'חתירה אנכית' THEN
        UPDATE exercises SET instructions = 'עמידה, אחיזת מוט או משקולות יד. משיכה כלפי מעלה לאורך הגוף עד גובה סנטר, מרפקים עולים גבוה מהכתפיים. ירידה מבוקרת. תרגיל מורכב המפעיל דלתא אמצעית, טרפז עליון וביצפס.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פייס פול' THEN
        UPDATE exercises SET instructions = 'עמידה מול מכונת כבלים בגובה פנים. משיכת הכבל לעבר הפנים תוך פתיחת המרפקים לצדדים ולאחור, צביטת השכמות. דגש על הדלתא האחורית והטרפז האמצעי. חזרה מבוקרת למצב התחלתי.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- רגליים (7 תרגילים)
      WHEN 'סקוואט' THEN
        UPDATE exercises SET instructions = 'עמידה עם רגליים ברוחב כתפיים, מוט על הכתפיים. ירידה תוך דחיפת ישבן אחורה וכיפוף ברכיים עד 90 מעלות (או יותר), דחיפה מהעקבים חזרה למעלה. תרגיל בסיסי המפעיל ארבע ראשי, ישבן, אמסטרינג וליבה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'לחיצת רגליים' THEN
        UPDATE exercises SET instructions = 'שכיבה במכונת לחיצת רגליים, רגליים על הפלטפורמה. לחיצה כלפי מעלה עד לכמעט נעילת ברכיים, ירידה מבוקרת עד 90 מעלות בברכיים. תרגיל בטוח יותר מסקוואט, דגש על ארבע ראשי וישבן.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'מכרעים' THEN
        UPDATE exercises SET instructions = 'עמידה עם משקולות יד בידיים או מוט על הכתפיים. צעד גדול קדימה, ירידה עד שהברך האחורית כמעט נוגעת בקרקע, דחיפה חזרה למעלה. תרגיל מפעיל ארבע ראשי, ישבן, אמסטרינג ודורש יציבות.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פשיטת ברכיים במכונה' THEN
        UPDATE exercises SET instructions = 'ישיבה במכונת פשיטת ברכיים, רגליים מתחת לרפידה. פשיטת הרגליים קדימה עד לנעילת ברכיים, חזרה מבוקרת. תרגיל בידוד לארבע הראשי, מצוין לסיום אימון רגליים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'כפיפת ברכיים במכונה' THEN
        UPDATE exercises SET instructions = 'שכיבה על הבטן במכונה, עקבים מתחת לרפידה. כפיפת הברכיים ומשיכת העקבים לעבר הישבן, ירידה מבוקרת. תרגיל בידוד לשרירי האמסטרינג (שרירים מאחורי הירך).'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'דדליפט רומני' THEN
        UPDATE exercises SET instructions = 'עמידה עם רגליים ברוחב ירכיים, אחיזת מוט. פשיטת גו קדימה עם ברכיים כמעט ישרות, ירידה עד להרגשת מתיחה באמסטרינג. חזרה למעלה תוך דחיפת ירכיים קדימה. דגש על אמסטרינג וישבן.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'תאומים בעמידה' THEN
        UPDATE exercises SET instructions = 'עמידה על מכונת תאומים עם כתפיים מתחת לרפידות. הרמה על קצות האצבעות עד למקסימום, ירידה מבוקרת מתחת לגובה הרצפה (למתיחה). תרגיל לשרירי השוק (גסטרוקנמיוס וסוליאוס).'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- יד קדמית - ביצפס (4 תרגילים)
      WHEN 'כפיפת מרפקים כנגד מוט' THEN
        UPDATE exercises SET instructions = 'עמידה, אחיזת מוט באחיזה תחתונה ברוחב כתפיים. כפיפת המרפקים והרמת המוט לעבר הכתפיים, ירידה מבוקרת. תרגיל בסיסי לביצפס, מאפשר משקל כבד ופיתוח כוח.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'כפיפת מרפקים משקולות יד' THEN
        UPDATE exercises SET instructions = 'עמידה או ישיבה עם משקולת יד בכל יד. כפיפת מרפקים לסירוגין או ביחד, עם אפשרות לסיבוב כף היד (סופינציה). תרגיל המאפשר טווח תנועה מלא ועבודה עצמאית של כל יד.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'כפיפת מרפקים פטישים' THEN
        UPDATE exercises SET instructions = 'עמידה עם משקולות יד, כפות ידיים פונות זו לזו (אחיזה ניטרלית). כפיפת מרפקים תוך שמירה על אחיזה זו לאורך התנועה. מדגיש את הברכיאליס והברכיורדיאליס בנוסף לביצפס.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'כפיפת מרפקים בכיסא כומר' THEN
        UPDATE exercises SET instructions = 'ישיבה או עמידה עם זרוע נשענת על משטח משופע. כפיפת מרפק תוך שמירה על יציבות הזרוע, ירידה מבוקרת עד לכמעט פשיטה מלאה. תרגיל בידוד לביצפס, מונע רמאות עם הגוף.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- יד אחורית - טריצפס (4 תרגילים)
      WHEN 'פשיטת מרפקים כבל עליון' THEN
        UPDATE exercises SET instructions = 'עמידה מול מכונת כבלים עליונה, אחיזת חבל או מוט. פשיטת המרפקים כלפי מטה עד לנעילה, חזרה מבוקרת. מרפקים נשארים צמודים לגוף. תרגיל בסיסי ואפקטיבי לטריצפס.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'לחיצת חזה אחיזה צרה' THEN
        UPDATE exercises SET instructions = 'שכיבה על ספסל שטוח, אחיזת מוט באחיזה צרה (כרוחב כתפיים או פחות). הורדת המוט לחזה התחתון, לחיצה חזרה למעלה. מדגיש את הטריצפס ופנים החזה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'לחיצה צרפתית' THEN
        UPDATE exercises SET instructions = 'שכיבה על ספסל או עמידה, אחיזת מוט מעל הראש. כפיפת מרפקים והורדת המוט מאחורי הראש, פשיטה חזרה למעלה. מרפקים מצביעים למעלה לאורך התנועה. דגש על ראש הארוך של הטריצפס.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פשיטה מאחורי הראש' THEN
        UPDATE exercises SET instructions = 'עמידה מול מכונת כבלים עם גב למכונה, או ישיבה. אחיזת כבל מעל הראש, פשיטת מרפקים קדימה ולמטה, חזרה מבוקרת. תרגיל המדגיש את הראש הארוך של הטריצפס בעמדת מתיחה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- בטן וליבה (5 תרגילים)
      WHEN 'כפיפות בטן' THEN
        UPDATE exercises SET instructions = 'שכיבה על הגב, רגליים כפופות, ידיים מאחורי הראש. הרמת החזה והכתפיים מהקרקע באמצעות כיווץ שרירי הבטן, ירידה מבוקרת. תרגיל בסיסי לשרירי הבטן הישרים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'פלאנק' THEN
        UPDATE exercises SET instructions = 'שכיבת מרפקים עם גוף ישר כקרש, משענת על מרפקים וקצות כפות הרגליים. שמירה על המצב תוך כיווץ בטן, ישבן וליבה. תרגיל איזומטרי המחזק את כל שרירי הליבה, גב תחתון וכתפיים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'הנפות רגליים בתלייה' THEN
        UPDATE exercises SET instructions = 'תלייה על מוט עליון, הרמת רגליים כלפי מעלה (ישרות או כפופות) עד גובה ירכיים או מעל. ירידה מבוקרת. תרגיל מתקדם המפעיל בעיקר את שרירי הבטן התחתונים והמגניבים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'גלגל בטן' THEN
        UPDATE exercises SET instructions = 'ברכיים על הקרקע, ידיים על גלגל הבטן. גלילה קדימה עד לפשיטת הגוף כמעט מלאה, חזרה בכוח שרירי הבטן. תרגיל מתקדם ואפקטיבי לכל שרירי הליבה והבטן.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'כפיפות בטן בשיפוע שלילי' THEN
        UPDATE exercises SET instructions = 'שכיבה על ספסל בשיפוע שלילי, רגליים מקובעות. ביצוע כפיפות בטן מול הכבידה. שיפוע שלילי מגביר את העומס על שרירי הבטן ומהווה אתגר גדול יותר מכפיפות רגילות.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      -- עכוז (4 תרגילים)
      WHEN 'היפ תראסט' THEN
        UPDATE exercises SET instructions = 'שכיבה על הגב עם כתפיים על ספסל, מוט על קפלי הירכיים. דחיפת הירכיים כלפי מעלה תוך כיווץ הישבן בנקודה העליונה, ירידה מבוקרת. תרגיל מצוין לפיתוח שריר הגלוטאוס מקסימוס (עכוז).'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'גשר ירכיים' THEN
        UPDATE exercises SET instructions = 'שכיבה על הגב, רגליים כפופות וצמודות לרצפה. הרמת הירכיים כלפי מעלה תוך כיווץ העכוז, ירידה מבוקרת. תרגיל בסיסי לחיזוק העכוז, אמסטרינג וגב תחתון. ניתן לבצע עם או בלי משקל.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'היפ אבדקשן' THEN
        UPDATE exercises SET instructions = 'שכיבה על הצד או עמידה עם רצועת התנגדות. הרמת הרגל החיצונית לצד תוך שמירה על רגל ישרה, ירידה מבוקרת. תרגיל בידוד לשריר הגלוטאוס מדיוס (עכוז צדדי), חשוב ליציבות ירכיים וברכיים.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      WHEN 'קיקבק בכבל' THEN
        UPDATE exercises SET instructions = 'עמידה מול מכונת כבלים, רגל אחת מחוברת לכבל תחתון. בעיטה לאחור תוך פשיטת הירך וכיווץ העכוז, חזרה מבוקרת. תרגיל בידוד לעכוז ואמסטרינג, מאפשר התמקדות בתנועה נקייה.'
          WHERE id = exercise_record.id;
        updated_count := updated_count + 1;
      
      ELSE
        -- תרגילים שלא נמצאו ברשימה - לא נעדכן אותם
        NULL;
    END CASE;
  END LOOP;
  
  RAISE NOTICE 'עודכנו % תרגילים עם הוראות ביצוע', updated_count;
END $$;
