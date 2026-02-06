interface TraineeRaw {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  gender: 'male' | 'female' | null;
  birth_date: string | null;
  height: number | null;
  start_date: string;
  notes: string;
  is_pair?: boolean;
  pair_name_1?: string;
  pair_name_2?: string;
  pair_phone_1?: string;
  pair_phone_2?: string;
  pair_email_1?: string;
  pair_email_2?: string;
  pair_gender_1?: 'male' | 'female';
  pair_gender_2?: 'male' | 'female';
  pair_birth_date_1?: string;
  pair_birth_date_2?: string;
  pair_height_1?: number;
  pair_height_2?: number;
}

export interface TraineeDisplayFormat {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: 'male' | 'female';
  height: number;
  startDate: string;
  notes: string;
  isPair: boolean;
  pairName1?: string;
  pairName2?: string;
  pairPhone1?: string;
  pairPhone2?: string;
  pairEmail1?: string;
  pairEmail2?: string;
  pairGender1?: 'male' | 'female';
  pairGender2?: 'male' | 'female';
  pairBirthDate1?: string;
  pairBirthDate2?: string;
  pairHeight1?: number;
  pairHeight2?: number;
}

export function convertTraineeToDisplayFormat(trainee: TraineeRaw): TraineeDisplayFormat {
  return {
    id: trainee.id,
    name: trainee.full_name,
    email: trainee.email || '',
    phone: trainee.phone || '',
    age: trainee.birth_date ? new Date().getFullYear() - new Date(trainee.birth_date).getFullYear() : 0,
    gender: (trainee.gender || 'male') as 'male' | 'female',
    height: trainee.height || 0,
    startDate: trainee.start_date,
    notes: trainee.notes || '',
    isPair: trainee.is_pair || false,
    pairName1: trainee.pair_name_1,
    pairName2: trainee.pair_name_2,
    pairPhone1: trainee.pair_phone_1,
    pairPhone2: trainee.pair_phone_2,
    pairEmail1: trainee.pair_email_1,
    pairEmail2: trainee.pair_email_2,
    pairGender1: trainee.pair_gender_1,
    pairGender2: trainee.pair_gender_2,
    pairBirthDate1: trainee.pair_birth_date_1,
    pairBirthDate2: trainee.pair_birth_date_2,
    pairHeight1: trainee.pair_height_1,
    pairHeight2: trainee.pair_height_2,
  };
}
