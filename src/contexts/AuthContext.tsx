import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setSecureSession, getSecureSession, removeSecureSession } from '../utils/secureSession';
import { signInTrainer, signInTrainee as apiSignInTrainee, signUpTrainer, signOut as apiSignOut } from '../api/authApi';

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

/**
 * Extract auth state from session - centralized logic to avoid duplication
 */
function hydrateAuthFromSession(
  session: Session | null,
  setUser: (user: User | null) => void,
  setSession: (session: Session | null) => void,
  setUserType: (type: 'trainer' | 'trainee' | null) => void,
  setTraineeId: (id: string | null) => void,
  setTraineeSession: (session: TraineeSession | null) => void
) {
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
        trainer_id: session.user.user_metadata.trainer_id || '',
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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'trainer' | 'trainee' | null>(null);
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [traineeSession, setTraineeSession] = useState<TraineeSession | null>(null);

  // Try to restore trainee session from secure storage
  useEffect(() => {
    const storedSession = getSecureSession<TraineeSession>(
      TRAINEE_SESSION_KEY,
      null,
      { useSessionStorage: false }
    );
    if (storedSession && !user) {
      setTraineeSession(storedSession);
      setTraineeId(storedSession.trainee_id);
      setUserType('trainee');
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrateAuthFromSession(
        session,
        setUser,
        setSession,
        setUserType,
        setTraineeId,
        setTraineeSession
      );
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrateAuthFromSession(
        session,
        setUser,
        setSession,
        setUserType,
        setTraineeId,
        setTraineeSession
      );
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInTrainer(email, password);
    return { error: result.error ? { message: result.error } : null };
  }, []);

  const signInTrainee = useCallback(async (phone: string, password: string) => {
    const result = await apiSignInTrainee(phone, password);
    
    if (result.error) {
      return { error: { message: result.error } };
    }

    if (result.data) {
      await supabase.auth.setSession({
        access_token: result.data.session.access_token,
        refresh_token: result.data.session.refresh_token,
      });

      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession) {
        hydrateAuthFromSession(
          newSession,
          setUser,
          setSession,
          setUserType,
          setTraineeId,
          setTraineeSession
        );
      }
    }

    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const result = await signUpTrainer(email, password, fullName);
    return { error: result.error ? { message: result.error } : null };
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    await supabase.auth.signOut();

    // Clear trainee session data
    removeSecureSession(TRAINEE_SESSION_KEY);
    setTraineeSession(null);
    setTraineeId(null);

    // Clear auth state
    setUser(null);
    setSession(null);
    setUserType(null);
  }, []);

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
