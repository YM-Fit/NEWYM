import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })();
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

      await createDefaultExercises(data.user.id);
    }

    return { error };
  };

  const createDefaultExercises = async (trainerId: string) => {
    const muscleGroups = [
      { name: 'חזה', exercises: ['פרפר במכשיר', 'דחיפת חזה במכשיר', 'מתח כבלים עליון', 'מתח כבלים תחתון', 'לחיצת חזה עם משקולות', 'Push-ups', 'דחיפות חזה בכבלים'] },
      { name: 'גב', exercises: ['משיכת גב עליון', 'משיכת גב תחתון', 'משיכה צרה', 'משיכת פולי רחבה', 'חתירה במכשיר', 'חתירה בכבל ישיבה', 'Pull-ups'] },
      { name: 'כתפיים', exercises: ['כתפיים מכשיר לחיצה', 'עפיפון מכשיר', 'עפיפון צד במשקולות', 'כתף אחורית במכשיר', 'כתף קדמית במכשיר', 'שראגס טרפז', 'כתפיים לחיצה עם משקולות'] },
      { name: 'ביצפס', exercises: ['כיפוף זרועות ישיבה', 'כיפוף זרועות במכשיר', 'כיפוף זרועות בכבל תחתון', 'כיפוף זרועות בכבל עליון', 'פטיש במשקולות', 'ביצפס במשקולות סגנון'] },
      { name: 'טריצפס', exercises: ['דחיפת טריצפס בכבל', 'פשיטת זרועות מעל הראש', 'טריצפס מכשיר דיפס', 'טריצפס קיקבק', 'דחיפות יהלום'] },
      { name: 'רגליים', exercises: ['כפיפת ברכיים שכיבה', 'פישוק רגליים במכשיר', 'קירוב רגליים במכשיר', 'כפיפת ברכיים ישיבה', 'לחיצת רגליים', 'הרמת עקבים', 'פשיטת רגליים'] },
      { name: 'בטן', exercises: ['בטן עליונה במכשיר', 'בטן תחתונה במכשיר', 'פלאנק', 'רוטציות בטן רוסית', 'Bicycle Crunches', 'הרמת רגליים תלויה'] }
    ];

    for (const group of muscleGroups) {
      const { data: muscleGroupData } = await supabase
        .from('muscle_groups')
        .insert([{ trainer_id: trainerId, name: group.name }])
        .select()
        .single();

      if (muscleGroupData) {
        const exercisesToInsert = group.exercises.map(exerciseName => ({
          muscle_group_id: muscleGroupData.id,
          name: exerciseName
        }));

        await supabase.from('exercises').insert(exercisesToInsert);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
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
