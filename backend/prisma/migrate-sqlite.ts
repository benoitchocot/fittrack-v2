/**
 * Migration: SQLite old FitTrack → PostgreSQL FitTrack v2
 * Source: history of user 1 (Benoit) → target: user id 1 in new DB
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const WORKOUT_TO_MUSCLE: Record<string, string> = {
  PUSH: 'Pectoraux',
  PULL: 'Dos',
  LEGS: 'Jambes',
  ARMS: 'Biceps',
  EPAULES: 'Épaules',
  CARDIO: 'Abdominaux',
  'ANGLES MORTS': 'Dos',
};

interface OldSet {
  weight: number;
  reps: number;
  completed: boolean;
}

interface OldExercise {
  name: string;
  sets: OldSet[];
}

interface OldWorkout {
  name: string;
  exercises: OldExercise[];
  startedAt?: string;
  finishedAt?: string;
}

interface HistoryRow {
  id: number;
  createdAt: string;
  workout_details: string;
}

function durationMinutes(startedAt?: string, finishedAt?: string): number | undefined {
  if (!startedAt || !finishedAt) return undefined;
  const diff = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.round(diff / 60000);
  return mins > 0 ? mins : undefined;
}

function muscleGroupForWorkout(workoutName: string): string {
  const upper = workoutName.toUpperCase();
  for (const [key, val] of Object.entries(WORKOUT_TO_MUSCLE)) {
    if (upper.includes(key)) return val;
  }
  return 'Dos';
}

async function getOrCreateExercise(
  exerciseName: string,
  workoutName: string,
): Promise<number> {
  const trimmed = exerciseName.trim();
  const muscleGroupName = muscleGroupForWorkout(workoutName);

  const muscleGroup = await prisma.muscleGroup.findUniqueOrThrow({
    where: { name: muscleGroupName },
  });

  const existing = await prisma.exercise.findFirst({
    where: { name: trimmed, isCustom: false },
  });

  if (existing) return existing.id;

  const created = await prisma.exercise.create({
    data: { name: trimmed, muscleGroupId: muscleGroup.id, isCustom: false },
  });
  return created.id;
}

async function main() {
  const TARGET_USER_ID = 2;

  const user = await prisma.user.findUnique({ where: { id: TARGET_USER_ID } });
  if (!user) throw new Error(`User id ${TARGET_USER_ID} not found.`);
  console.log(`Target user: ${user.email}`);

  // Clean existing sessions for this user
  const deleted = await prisma.workoutSession.deleteMany({ where: { userId: TARGET_USER_ID } });
  if (deleted.count > 0) console.log(`Deleted ${deleted.count} existing sessions.`);

  // Also clean exercises that may have been imported from a previous run
  await prisma.exercise.deleteMany({ where: { isCustom: false, createdById: null, sets: { none: {} } } });

  const dataPath = path.join(__dirname, 'migration-data.json');
  const rows: HistoryRow[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`Found ${rows.length} sessions to import.`);

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    let workout: OldWorkout;
    try {
      workout = JSON.parse(row.workout_details) as OldWorkout;
    } catch {
      skipped++;
      continue;
    }

    if (!workout.exercises?.length) { skipped++; continue; }

    const session = await prisma.workoutSession.create({
      data: {
        userId: TARGET_USER_ID,
        name: workout.name,
        date: new Date(row.createdAt),
        duration: durationMinutes(workout.startedAt, workout.finishedAt),
      },
    });

    for (const ex of workout.exercises) {
      if (!ex.sets?.length) continue;
      const exerciseId = await getOrCreateExercise(ex.name, workout.name);

      for (let i = 0; i < ex.sets.length; i++) {
        const s = ex.sets[i]!;
        if (!s.completed) continue;
        await prisma.workoutSet.create({
          data: {
            sessionId: session.id,
            exerciseId,
            setNumber: i + 1,
            reps: s.reps ?? 0,
            weight: s.weight ?? 0,
          },
        });
      }
    }

    imported++;
    if (imported % 20 === 0) console.log(`  ${imported}/${rows.length}...`);
  }

  console.log(`\n✓ Importées: ${imported} séances, ignorées: ${skipped}`);

  const exerciseCount = await prisma.exercise.count({ where: { isCustom: false } });
  console.log(`✓ Exercices dans la bibliothèque: ${exerciseCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
