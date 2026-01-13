import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setSecureSession, getSecureSession, removeSecureSession } from '../utils/secureSession';

interface TraineeSession {
  trainee_id: string;
  trainee_name: string;
  trainer_id: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userType: 'trainer' | 'trainee' | null;
  traineeId: string | null;
  traineeSession: TraineeSession | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInTrainee: (phone: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TRAINEE_SESSION_KEY = 'trainee_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'trainer' | 'trainee' | null>(null);
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [traineeSession, setTraineeSession] = useState<TraineeSession | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const isTrainee = session.user.user_metadata?.is_trainee === true;

        if (isTrainee) {
          const traineeId = session.user.user_metadata.trainee_id;
          setTraineeId(traineeId);
          setUserType('trainee');

          const traineeSession: TraineeSession = {
            trainee_id: traineeId,
            trainee_name: session.user.user_metadata.full_name || '',
            trainer_id: '',
            phone: session.user.user_metadata.phone || '',
          };
          setTraineeSession(traineeSession);
          setSecureSession(TRAINEE_SESSION_KEY, traineeSession, { expiryHours: 24 });
        } else {
          setUserType('trainer');
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const isTrainee = session.user.user_metadata?.is_trainee === true;

        if (isTrainee) {
          const traineeId = session.user.user_metadata.trainee_id;
          setTraineeId(traineeId);
          setUserType('trainee');

          const traineeSession: TraineeSession = {
            trainee_id: traineeId,
            trainee_name: session.user.user_metadata.full_name || '',
            trainer_id: '',
            phone: session.user.user_metadata.phone || '',
          };
          setTraineeSession(traineeSession);
          setSecureSession(TRAINEE_SESSION_KEY, traineeSession, { expiryHours: 24 });
        } else {
          setUserType('trainer');
          setTraineeId(null);
          setTraineeSession(null);
          removeSecureSession(TRAINEE_SESSION_KEY);
        }
      } else {
        setUserType(null);
        setTraineeId(null);
        setTraineeSession(null);
        removeSecureSession(TRAINEE_SESSION_KEY);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInTrainee = async (phone: string, password: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trainee-login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ phone, password }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return { error: { message: data.error || 'מספר טלפון או סיסמה שגויים' } };
      }

      if (data.session && data.trainee) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        setSession(data.session);
        setUser(data.session.user);
        setTraineeId(data.trainee.id);
        setUserType('trainee');

        const newTraineeSession: TraineeSession = {
          trainee_id: data.trainee.id,
          trainee_name: data.trainee.full_name,
          trainer_id: data.trainee.trainer_id || '',
          phone: data.trainee.phone,
        };

        setSecureSession(TRAINEE_SESSION_KEY, newTraineeSession, { expiryHours: 24 });
        setTraineeSession(newTraineeSession);
      }

      return { error: null };
    } catch (err) {
      return { error: { message: 'שגיאה בהתחברות' } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      const { error: profileError } = await supabase
        .from('trainers')
        .insert([
          {
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
          },
        ]);

      if (profileError) {
        console.error('Error creating trainer profile:', profileError);
        return { error: profileError };
      }
    }

    return { error };
  };

  const signOut = async () => {
    // Always sign out from Supabase to clear the session completely
    await supabase.auth.signOut();

    // Clear trainee session data
    removeSecureSession(TRAINEE_SESSION_KEY);
    setTraineeSession(null);
    setTraineeId(null);

    // Clear auth state
    setUser(null);
    setSession(null);
    setUserType(null);
  };

  const isAuthenticated = user !== null || traineeSession !== null;

  return (
    <AuthContext.Provider
      value={{
        user: isAuthenticated ? (user || { id: traineeSession?.trainee_id } as User) : null,
        session,
        loading,
        userType,
        traineeId,
        traineeSession,
        signIn,
        signInTrainee,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
