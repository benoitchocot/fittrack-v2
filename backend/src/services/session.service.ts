import { prisma } from '../lib/prisma';

export async function listSessions(userId: number) {
  return prisma.workoutSession.findMany({
    where: { userId },
    include: {
      sets: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
      },
    },
    orderBy: { date: 'desc' },
  });
}

export async function getSession(id: number, userId: number) {
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      sets: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
      },
    },
  });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  return session;
}

export async function createSession(
  userId: number,
  data: { name?: string; notes?: string; duration?: number; date?: Date },
) {
  return prisma.workoutSession.create({
    data: { userId, ...data },
    include: { sets: true },
  });
}

export async function updateSession(
  id: number,
  userId: number,
  data: { name?: string; notes?: string; duration?: number; date?: Date },
) {
  const session = await prisma.workoutSession.findUnique({ where: { id } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  return prisma.workoutSession.update({
    where: { id },
    data,
    include: {
      sets: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
      },
    },
  });
}

export async function deleteSession(id: number, userId: number) {
  const session = await prisma.workoutSession.findUnique({ where: { id } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  await prisma.workoutSession.delete({ where: { id } });
}

// --- Sets ---

export async function addSet(
  sessionId: number,
  userId: number,
  data: {
    exerciseId: number;
    setNumber: number;
    reps: number;
    weight: number;
    rpe?: number;
    notes?: string;
  },
) {
  const session = await prisma.workoutSession.findUnique({ where: { id: sessionId } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  return prisma.workoutSet.create({
    data: { sessionId, ...data },
    include: { exercise: { include: { muscleGroup: true } } },
  });
}

export async function updateSet(
  setId: number,
  userId: number,
  data: {
    setNumber?: number;
    reps?: number;
    weight?: number;
    rpe?: number;
    notes?: string;
  },
) {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { session: true },
  });

  if (!set) throw new Error('NOT_FOUND');
  if (set.session.userId !== userId) throw new Error('FORBIDDEN');

  return prisma.workoutSet.update({
    where: { id: setId },
    data,
    include: { exercise: { include: { muscleGroup: true } } },
  });
}

export async function deleteSet(setId: number, userId: number) {
  const set = await prisma.workoutSet.findUnique({
    where: { id: setId },
    include: { session: true },
  });

  if (!set) throw new Error('NOT_FOUND');
  if (set.session.userId !== userId) throw new Error('FORBIDDEN');

  await prisma.workoutSet.delete({ where: { id: setId } });
}

// --- Progression ---

export async function getExerciseProgression(exerciseId: number, userId: number) {
  const sets = await prisma.workoutSet.findMany({
    where: {
      exerciseId,
      session: { userId },
    },
    include: { session: { select: { date: true } } },
    orderBy: { session: { date: 'asc' } },
  });

  // Group by session date, keep best set (max weight) per session
  const byDate = new Map<string, { date: Date; maxWeight: number; reps: number }>();

  for (const set of sets) {
    const key = set.session.date.toISOString().slice(0, 10);
    const existing = byDate.get(key);
    if (!existing || set.weight > existing.maxWeight) {
      byDate.set(key, { date: set.session.date, maxWeight: set.weight, reps: set.reps });
    }
  }

  return Array.from(byDate.values());
}
