// דוגמה לקוד עבור אפליקציית המתאמן
// TraineeAuthContext.tsx

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Trainee {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  gender?: string;
  birth_date?: string;
  height?: number;
  status?: string;
  is_pair?: boolean;
  pair_name_1?: string;
  pair_name_2?: string;
}

interface TraineeAuthContextType {
  trainee: Trainee | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TraineeAuthContext = createContext<TraineeAuthContextType | undefined>(undefined);

export function TraineeAuthProvider({ children }: { children: React.ReactNode }) {
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // בדיקה אם יש session קיים
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // קבלת נתונים של המתאמן
        const traineeId = session.user.user_metadata.trainee_id;

        const { data: traineeData } = await supabase
          .from('trainees')
          .select('*')
          .eq('id', traineeId)
          .single();

        if (traineeData) {
          setTrainee(traineeData);
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone: string, password: string) => {
    try {
      setLoading(true);

      console.log('🔍 מנסה להתחבר עם טלפון:', phone);

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
        throw new Error(data.error || 'התחברות נכשלה');
      }

      console.log('✅ התחברות הצליחה:', data);

      // שמור את ה-session ב-Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      // שמור את המתאמן
      setTrainee(data.trainee);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setTrainee(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <TraineeAuthContext.Provider value={{ trainee, loading, login, logout }}>
      {children}
    </TraineeAuthContext.Provider>
  );
}

export function useTraineeAuth() {
  const context = useContext(TraineeAuthContext);
  if (context === undefined) {
    throw new Error('useTraineeAuth must be used within a TraineeAuthProvider');
  }
  return context;
}

// TraineeLogin.tsx - דוגמה לרכיב התחברות

import { useState } from 'react';
import { useTraineeAuth } from './TraineeAuthContext';

export function TraineeLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useTraineeAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(phone, password);
    } catch (err: any) {
      setError(err.message || 'התחברות נכשלה');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            כניסת מתאמן
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                מספר טלפון
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="0526492728"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>
      </div>
    </div>
  );
}

// TraineeDashboard.tsx - דוגמה לשימוש אחרי התחברות

import { useEffect, useState } from 'react';
import { useTraineeAuth } from './TraineeAuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function TraineeDashboard() {
  const { trainee, logout } = useTraineeAuth();
  const [measurements, setMeasurements] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    if (trainee) {
      loadData();
    }
  }, [trainee]);

  const loadData = async () => {
    if (!trainee) return;

    // קבלת מדידות
    const { data: measurementsData } = await supabase
      .from('measurements')
      .select('*')
      .eq('trainee_id', trainee.id)
      .order('measurement_date', { ascending: false })
      .limit(10);

    if (measurementsData) {
      setMeasurements(measurementsData);
    }

    // קבלת אימונים
    const { data: workoutsData } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_trainees!inner(trainee_id)
      `)
      .eq('workout_trainees.trainee_id', trainee.id)
      .order('workout_date', { ascending: false })
      .limit(10);

    if (workoutsData) {
      setWorkouts(workoutsData);
    }
  };

  if (!trainee) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            שלום, {trainee.full_name}
          </h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            התנתק
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* מדידות אחרונות */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">מדידות אחרונות</h2>
            {measurements.length > 0 ? (
              <div className="space-y-2">
                {measurements.map((m: any) => (
                  <div key={m.id} className="flex justify-between border-b pb-2">
                    <span>{new Date(m.measurement_date).toLocaleDateString('he-IL')}</span>
                    <span className="font-semibold">{m.weight} ק"ג</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">אין מדידות עדיין</p>
            )}
          </div>

          {/* אימונים אחרונים */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">אימונים אחרונים</h2>
            {workouts.length > 0 ? (
              <div className="space-y-2">
                {workouts.map((w: any) => (
                  <div key={w.id} className="border-b pb-2">
                    <div className="flex justify-between">
                      <span>{new Date(w.workout_date).toLocaleDateString('he-IL')}</span>
                      <span className={w.is_completed ? 'text-green-600' : 'text-yellow-600'}>
                        {w.is_completed ? '✓ הושלם' : '⏳ ממתין'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">אין אימונים עדיין</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
