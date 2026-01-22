import { useState, useEffect } from 'react';
import { Key, Lock, Unlock, Eye, EyeOff, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { logger } from '../../../utils/logger';

interface TraineeAccess {
  id: string;
  phone: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  auth_user_id: string | null;
}

interface TraineeAccessManagerProps {
  traineeId: string;
  traineeName: string;
  onBack: () => void;
}

export default function TraineeAccessManager({ traineeId, traineeName, onBack }: TraineeAccessManagerProps) {
  const [access, setAccess] = useState<TraineeAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccess();
  }, [traineeId]);

  const loadAccess = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('trainee_auth')
        .select('*')
        .eq('trainee_id', traineeId)
        .maybeSingle();

      if (error) throw error;
      setAccess(data);
    } catch (error) {
      logger.error('Error loading access', error, 'TraineeAccessManager');
      toast.error('שגיאה בטעינת פרטי גישה');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccess = async () => {
    if (!password || password.length < 6) {
      toast.error('הסיסמה חייבת להיות לפחות 6 תווים');
      return;
    }

    try {
      setSaving(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('נא להתחבר מחדש');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trainer-register-trainee`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trainee_id: traineeId,
            password: password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes('already registered')) {
          toast.error('המתאמן כבר רשום למערכת');
        } else {
          toast.error(result.error || 'שגיאה ביצירת גישה');
        }
        return;
      }

      toast.success('גישה נוצרה בהצלחה! המתאמן יכול להתחבר עם מספר הטלפון והסיסמה');
      setShowCreateForm(false);
      setPassword('');
      await loadAccess();
    } catch (error) {
      logger.error('Error creating access', error, 'TraineeAccessManager');
      toast.error('שגיאה ביצירת גישה');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!access) return;

    try {
      const { error } = await supabase
        .from('trainee_auth')
        .update({ is_active: !access.is_active })
        .eq('id', access.id);

      if (error) throw error;

      toast.success(access.is_active ? 'גישה הושבתה' : 'גישה הופעלה');
      setAccess({ ...access, is_active: !access.is_active });
    } catch (error) {
      logger.error('Error toggling access', error, 'TraineeAccessManager');
      toast.error('שגיאה בשינוי סטטוס גישה');
    }
  };

  const handleResetPassword = async () => {
    if (!access || !access.auth_user_id) {
      toast.error('לא ניתן לאפס סיסמה - אין משתמש auth');
      return;
    }

    const newPassword = prompt('הזן סיסמה חדשה (לפחות 6 תווים):');
    if (!newPassword || newPassword.length < 6) {
      toast.error('הסיסמה חייבת להיות לפחות 6 תווים');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('נא להתחבר מחדש');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trainer-reset-trainee-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trainee_id: traineeId,
            new_password: newPassword,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'שגיאה באיפוס סיסמה');
        return;
      }

      toast.success('הסיסמה עודכנה בהצלחה');
    } catch (error) {
      logger.error('Error resetting password', error, 'TraineeAccessManager');
      toast.error('שגיאה באיפוס סיסמה');
    }
  };

  const handleDeleteAccess = async () => {
    if (!access) return;

    if (!confirm('האם למחוק את הגישה? המתאמן לא יוכל להתחבר לאפליקציה.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trainee_auth')
        .delete()
        .eq('id', access.id);

      if (error) throw error;

      toast.success('גישה נמחקה בהצלחה');
      setAccess(null);
    } catch (error) {
      logger.error('Error deleting access', error, 'TraineeAccessManager');
      toast.error('שגיאה במחיקת גישה');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <div className="text-xl text-foreground600 font-medium">טוען פרטי גישה...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 lg:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Premium Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="p-3 hover:bg-surface100 rounded-xl transition-all duration-300 text-foreground600 hover:text-foreground900"
            >
              <span className="text-lg font-medium">חזרה לפרופיל</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
              <Shield className="w-8 h-8 text-inverse" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground900">גישה לאפליקציה</h1>
              <p className="text-foreground600 text-lg">{traineeName}</p>
            </div>
          </div>
        </div>

        {!access ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300">
                <Key className="w-10 h-10 text-foreground500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground900 mb-3">אין גישה פעילה</h2>
              <p className="text-foreground600 text-lg max-w-md mx-auto">
                צור גישה כדי לאפשר למתאמן להתחבר לאפליקציה ולצפות בתוכנית האימונים והתפריט
              </p>
            </div>

            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 text-inverse px-6 py-4 rounded-2xl hover:from-emerald-600 hover:to-teal-700 flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] font-semibold text-lg"
              >
                <Key className="w-6 h-6" />
                צור גישה חדשה
              </button>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <label className="block text-sm font-semibold text-foreground700 mb-2">סיסמה</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 border-2 border-border200 rounded-xl pr-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 text-lg"
                      placeholder="לפחות 6 תווים"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground400 hover:text-foreground600 transition-colors duration-300"
                    >
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className="text-sm text-foreground500 mt-2">
                    השתמש במספר הטלפון של המתאמן כדי להתחבר
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateAccess}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 text-inverse py-4 rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl"
                  >
                    {saving ? 'שומר...' : 'צור גישה'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setPassword('');
                    }}
                    disabled={saving}
                    className="flex-1 bg-surface100 text-foreground700 py-4 rounded-xl hover:bg-surface200 disabled:opacity-50 transition-all duration-300 font-semibold text-lg"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground900 mb-4">פרטי גישה</h2>
                <div className="space-y-3 text-foreground700">
                  <div className="flex items-center gap-3 p-3 bg-surface50 rounded-xl transition-all duration-300 hover:bg-surface100">
                    <span className="font-semibold text-foreground600 min-w-[100px]">מספר טלפון:</span>
                    <span dir="ltr" className="font-mono text-lg">{access.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-surface50 rounded-xl transition-all duration-300 hover:bg-surface100">
                    <span className="font-semibold text-foreground600 min-w-[100px]">סטטוס:</span>
                    {access.is_active ? (
                      <span className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        פעיל
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        לא פעיל
                      </span>
                    )}
                  </div>
                  {access.last_login && (
                    <div className="flex items-center gap-3 p-3 bg-surface50 rounded-xl transition-all duration-300 hover:bg-surface100">
                      <span className="font-semibold text-foreground600 min-w-[100px]">התחברות אחרונה:</span>
                      <span>{new Date(access.last_login).toLocaleString('he-IL')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-surface50 rounded-xl transition-all duration-300 hover:bg-surface100">
                    <span className="font-semibold text-foreground600 min-w-[100px]">נוצר:</span>
                    <span>{new Date(access.created_at).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105">
                <Key className="w-8 h-8 text-inverse" />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleToggleActive}
                className={`w-full px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] ${
                  access.is_active
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-inverse'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-inverse'
                }`}
              >
                {access.is_active ? (
                  <>
                    <Lock className="w-6 h-6" />
                    השבת גישה
                  </>
                ) : (
                  <>
                    <Unlock className="w-6 h-6" />
                    הפעל גישה
                  </>
                )}
              </button>

              <button
                onClick={handleResetPassword}
                className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-inverse px-6 py-4 rounded-2xl hover:from-blue-600 hover:to-blue-700 flex items-center justify-center gap-3 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                <Key className="w-6 h-6" />
                איפוס סיסמה
              </button>

              <button
                onClick={handleDeleteAccess}
                className="w-full bg-gradient-to-br from-red-500 to-red-600 text-inverse px-6 py-4 rounded-2xl hover:from-red-600 hover:to-red-700 flex items-center justify-center gap-3 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                <Key className="w-6 h-6" />
                מחק גישה
              </button>
            </div>

            <div className="mt-8 space-y-3">
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 transition-all duration-300 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800">
                    שים לב: המתאמן צריך להשתמש במספר הטלפון ({access.phone}) והסיסמה כדי להתחבר לאפליקציה
                  </p>
                </div>
              </div>
              {access.auth_user_id && (
                <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-emerald-800">
                      המתאמן רשום במערכת האימות ויכול להתחבר
                    </p>
                  </div>
                </div>
              )}
              {!access.auth_user_id && (
                <div className="p-5 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200 transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">
                      המתאמן לא רשום במערכת האימות החדשה. נא למחוק את הגישה וליצור אותה מחדש.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
