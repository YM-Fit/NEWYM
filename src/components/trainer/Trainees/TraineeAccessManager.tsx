import { useState, useEffect } from 'react';
import { Key, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

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
      console.error('Error loading access:', error);
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
      console.error('Error creating access:', error);
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
      console.error('Error toggling access:', error);
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
      console.error('Error resetting password:', error);
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
      console.error('Error deleting access:', error);
      toast.error('שגיאה במחיקת גישה');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">טוען פרטי גישה...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 mb-2"
        >
          ← חזרה לפרופיל
        </button>
        <h1 className="text-3xl font-bold">גישה לאפליקציה - {traineeName}</h1>
      </div>

      {!access ? (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <Key className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">אין גישה פעילה</h2>
            <p className="text-gray-600">
              צור גישה כדי לאפשר למתאמן להתחבר לאפליקציה ולצפות בתוכנית האימונים והתפריט
            </p>
          </div>

          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              צור גישה חדשה
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    placeholder="לפחות 6 תווים"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  השתמש במספר הטלפון של המתאמן כדי להתחבר
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateAccess}
                  disabled={saving}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'שומר...' : 'צור גישה'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setPassword('');
                  }}
                  disabled={saving}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">פרטי גישה</h2>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium">מספר טלפון:</span>
                  <span dir="ltr">{access.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">סטטוס:</span>
                  {access.is_active ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      פעיל
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                      לא פעיל
                    </span>
                  )}
                </div>
                {access.last_login && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">התחברות אחרונה:</span>
                    <span>{new Date(access.last_login).toLocaleString('he-IL')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium">נוצר:</span>
                  <span>{new Date(access.created_at).toLocaleDateString('he-IL')}</span>
                </div>
              </div>
            </div>
            <Key className="w-12 h-12 text-indigo-600" />
          </div>

          <div className="space-y-3">
            <button
              onClick={handleToggleActive}
              className={`w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 ${
                access.is_active
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {access.is_active ? (
                <>
                  <Lock className="w-5 h-5" />
                  השבת גישה
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  הפעל גישה
                </>
              )}
            </button>

            <button
              onClick={handleResetPassword}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              איפוס סיסמה
            </button>

            <button
              onClick={handleDeleteAccess}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <Key className="w-5 h-5" />
              מחק גישה
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ שים לב: המתאמן צריך להשתמש במספר הטלפון ({access.phone}) והסיסמה כדי להתחבר לאפליקציה
              </p>
            </div>
            {access.auth_user_id && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ המתאמן רשום במערכת האימות ויכול להתחבר
                </p>
              </div>
            )}
            {!access.auth_user_id && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ המתאמן לא רשום במערכת האימות החדשה. נא למחוק את הגישה וליצור אותה מחדש.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
