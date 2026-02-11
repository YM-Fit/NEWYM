/**
 * Privacy Policy Component
 * Privacy policy page for GDPR compliance
 */

import { useState, useEffect } from 'react';
import { Shield, FileText, Download, Trash2, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GdprService } from '../../services/gdprService';
import { ConsentService, type ConsentPreferences } from '../../services/consentService';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';

const POLICY_VERSION = '1.0.0'; // Update this when policy changes

export default function PrivacyPolicy() {
  const { user } = useAuth();
  const [consentPreferences, setConsentPreferences] = useState<ConsentPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAnonymizeDialog, setShowAnonymizeDialog] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState(false);

  useEffect(() => {
    if (user) {
      loadConsentPreferences();
    }
  }, [user]);

  const loadConsentPreferences = async () => {
    if (!user) return;

    try {
      const userType = user.user_metadata?.is_trainee ? 'trainee' : 'trainer';
      const result = await ConsentService.getConsentPreferences(user.id, userType);
      if (result.success && result.data) {
        setConsentPreferences(result.data);
      }
    } catch (error) {
      logger.error('Error loading consent preferences', error, 'PrivacyPolicy');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = async (consentType: keyof ConsentPreferences, granted: boolean) => {
    if (!user || !consentPreferences) return;

    setUpdatingConsent(true);
    try {
      const userType = user.user_metadata?.is_trainee ? 'trainee' : 'trainer';
      
      if (granted) {
        await ConsentService.grantConsent(
          user.id,
          userType,
          consentType as any,
          POLICY_VERSION
        );
      } else {
        await ConsentService.revokeConsent(
          user.id,
          userType,
          consentType as any
        );
      }

      // Reload preferences
      await loadConsentPreferences();
      toast.success('ההעדפות עודכנו בהצלחה');
    } catch (error) {
      logger.error('Error updating consent', error, 'PrivacyPolicy');
      toast.error('שגיאה בעדכון ההעדפות');
    } finally {
      setUpdatingConsent(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const userType = user.user_metadata?.is_trainee ? 'trainee' : 'trainer';
      const result = await GdprService.exportUserData(user.id, userType);

      if (result.success && result.data) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        // Safely remove the element if it's still in the DOM
        setTimeout(() => {
          try {
            if (a.parentNode) {
              a.parentNode.removeChild(a);
            }
          } catch (e) {
            // Element may have already been removed, ignore
          }
        }, 0);
        URL.revokeObjectURL(url);
        toast.success('הנתונים יוצאו בהצלחה');
      } else {
        toast.error(result.error || 'שגיאה בייצוא הנתונים');
      }
    } catch (error) {
      logger.error('Error exporting data', error, 'PrivacyPolicy');
      toast.error('שגיאה בייצוא הנתונים');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!user) return;

    try {
      const userType = user.user_metadata?.is_trainee ? 'trainee' : 'trainer';
      const result = await GdprService.deleteUserData(user.id, userType);

      if (result.success) {
        toast.success('הנתונים נמחקו בהצלחה');
        // Redirect to login or home
        window.location.href = '/';
      } else {
        toast.error(result.error || 'שגיאה במחיקת הנתונים');
      }
    } catch (error) {
      logger.error('Error deleting data', error, 'PrivacyPolicy');
      toast.error('שגיאה במחיקת הנתונים');
    }
  };

  const handleAnonymizeData = async () => {
    if (!user) return;

    try {
      const userType = user.user_metadata?.is_trainee ? 'trainee' : 'trainer';
      const result = await GdprService.anonymizeUserData(user.id, userType);

      if (result.success) {
        toast.success('הנתונים עברו אנונימיזציה בהצלחה');
        // Reload page to reflect changes
        window.location.reload();
      } else {
        toast.error(result.error || 'שגיאה באנונימיזציה');
      }
    } catch (error) {
      logger.error('Error anonymizing data', error, 'PrivacyPolicy');
      toast.error('שגיאה באנונימיזציה');
    }
  };

  if (loading) {
    return (
      <div className="premium-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="premium-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-primary-400" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">מדיניות פרטיות וזכויות GDPR</h1>
            <p className="text-sm text-muted">גרסת מדיניות: {POLICY_VERSION}</p>
          </div>
        </div>
      </div>

      {/* Consent Management */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">ניהול הסכמות</h2>
        <p className="text-sm text-muted mb-6">
          אנו מכבדים את פרטיותך. אנא בחר את ההסכמות שלך:
        </p>

        {consentPreferences && (
          <div className="space-y-4">
            <ConsentToggle
              label="עיבוד נתונים"
              description="הסכמה לעיבוד הנתונים שלך לצורך מתן השירות"
              checked={consentPreferences.data_processing}
              onChange={(checked) => handleConsentChange('data_processing', checked)}
              disabled={updatingConsent}
              required
            />
            <ConsentToggle
              label="שיווק"
              description="הסכמה לקבלת הודעות שיווקיות"
              checked={consentPreferences.marketing}
              onChange={(checked) => handleConsentChange('marketing', checked)}
              disabled={updatingConsent}
            />
            <ConsentToggle
              label="אנליטיקה"
              description="הסכמה לשימוש בנתונים לצורך שיפור השירות"
              checked={consentPreferences.analytics}
              onChange={(checked) => handleConsentChange('analytics', checked)}
              disabled={updatingConsent}
            />
            <ConsentToggle
              label="עוגיות"
              description="הסכמה לשימוש בעוגיות לשיפור החוויה"
              checked={consentPreferences.cookies}
              onChange={(checked) => handleConsentChange('cookies', checked)}
              disabled={updatingConsent}
            />
            <ConsentToggle
              label="שירותים צד שלישי"
              description="הסכמה לשיתוף נתונים עם שירותים צד שלישי"
              checked={consentPreferences.third_party}
              onChange={(checked) => handleConsentChange('third_party', checked)}
              disabled={updatingConsent}
            />
          </div>
        )}
      </div>

      {/* GDPR Rights */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">זכויותיך לפי GDPR</h2>
        <div className="space-y-4">
          {/* Right to Data Portability */}
          <div className="flex items-start gap-4 p-4 bg-surface rounded-lg">
            <Download className="h-6 w-6 text-primary-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">זכות לניידות נתונים</h3>
              <p className="text-sm text-muted mb-3">
                אתה יכול לייצא את כל הנתונים שלך בפורמט JSON
              </p>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-foreground rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? 'מייצא...' : 'ייצא נתונים'}
              </button>
            </div>
          </div>

          {/* Right to Erasure */}
          <div className="flex items-start gap-4 p-4 bg-surface rounded-lg">
            <Trash2 className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">זכות למחיקה</h3>
              <p className="text-sm text-muted mb-3">
                אתה יכול למחוק את כל הנתונים שלך לצמיתות. פעולה זו אינה הפיכה.
              </p>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-foreground rounded-lg transition-all"
              >
                מחק את כל הנתונים
              </button>
            </div>
          </div>

          {/* Right to be Forgotten */}
          <div className="flex items-start gap-4 p-4 bg-surface rounded-lg">
            <EyeOff className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">זכות להישכחות</h3>
              <p className="text-sm text-muted mb-3">
                אתה יכול לבצע אנונימיזציה של הנתונים שלך - המידע המזהה יוחלף בערכים אנונימיים
              </p>
              <button
                onClick={() => setShowAnonymizeDialog(true)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-foreground rounded-lg transition-all"
              >
                בצע אנונימיזציה
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Policy Text */}
      <div className="premium-card p-6">
        <h2 className="text-xl font-bold text-foreground mb-4">מדיניות פרטיות</h2>
        <div className="prose prose-invert max-w-none text-foreground">
          <p>
            אנו מחויבים להגנה על פרטיותך. מדיניות הפרטיות שלנו מסבירה כיצד אנו אוספים,
            משתמשים, מגנים ומחשיפים את המידע האישי שלך.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">איסוף מידע</h3>
          <p>
            אנו אוספים מידע שאתה מספק לנו ישירות, כגון שם, אימייל, טלפון ומידע על האימונים שלך.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">שימוש במידע</h3>
          <p>
            אנו משתמשים במידע שלך כדי לספק לך שירותים, לשפר את השירות, ולתקשר איתך.
          </p>
          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">הגנה על מידע</h3>
          <p>
            אנו משתמשים באמצעי אבטחה מתקדמים כדי להגן על המידע שלך מפני גישה לא מורשית,
            שינוי, חשיפה או הרס.
          </p>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteData}
        title="מחיקת כל הנתונים"
        message="האם אתה בטוח שברצונך למחוק את כל הנתונים שלך? פעולה זו אינה הפיכה ותמחק את כל המידע שלך לצמיתות."
        confirmText="מחק הכל"
        cancelText="ביטול"
        confirmButtonClassName="bg-red-500 hover:bg-red-600"
      />

      <ConfirmationDialog
        isOpen={showAnonymizeDialog}
        onClose={() => setShowAnonymizeDialog(false)}
        onConfirm={handleAnonymizeData}
        title="אנונימיזציה של נתונים"
        message="האם אתה בטוח שברצונך לבצע אנונימיזציה של הנתונים שלך? המידע המזהה יוחלף בערכים אנונימיים."
        confirmText="בצע אנונימיזציה"
        cancelText="ביטול"
        confirmButtonClassName="bg-yellow-500 hover:bg-yellow-600"
      />
    </div>
  );
}

interface ConsentToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
}

function ConsentToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  required,
}: ConsentToggleProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-surface/30 rounded-lg border border-border">
      <input
        type="checkbox"
        id={`consent-${label}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled || required}
        className="mt-1 h-5 w-5 rounded border-border bg-surface text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50"
      />
      <label
        htmlFor={`consent-${label}`}
        className="flex-1 cursor-pointer"
      >
        <div className="font-semibold text-foreground">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </div>
        <div className="text-sm text-muted mt-1">{description}</div>
      </label>
    </div>
  );
}
