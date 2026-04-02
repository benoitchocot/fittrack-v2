export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscleGroupId: number;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  description: string | null;
  isCustom: boolean;
  createdById: number | null;
}

export interface WorkoutSet {
  id: number;
  sessionId: number;
  exerciseId: number;
  exercise: Exercise;
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null;
  notes: string | null;
}

export interface WorkoutSession {
  id: number;
  userId: number;
  date: string;
  name: string | null;
  notes: string | null;
  duration: number | null;
  sets: WorkoutSet[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ProgressionPoint {
  date: string;
  maxWeight: number;
  reps: number;
}

export interface WorkoutTemplateExercise {
  id: number;
  templateId: number;
  exerciseId: number;
  exercise: Exercise;
  order: number;
  comment: string | null;
}

export interface WorkoutTemplate {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  exercises: WorkoutTemplateExercise[];
}
