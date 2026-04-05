import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const sessionInclude = {
  sets: {
    include: { exercise: { include: { muscleGroup: true } } },
    orderBy: [{ exerciseId: 'asc' as const }, { setNumber: 'asc' as const }],
  },
};

export async function listSessions(userId: number) {
  return prisma.workoutSession.findMany({
    where: { userId },
    include: sessionInclude,
    orderBy: { date: 'desc' },
  });
}

export async function getActiveSession(userId: number) {
  return prisma.workoutSession.findFirst({
    where: { userId, status: 'active' },
    include: sessionInclude,
    orderBy: { startedAt: 'desc' },
  });
}

export async function getSession(id: number, userId: number) {
  const session = await prisma.workoutSession.findUnique({
    where: { id },
    include: sessionInclude,
  });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  return session;
}

export async function createSession(
  userId: number,
  data: { name?: string; notes?: string; exercises?: Prisma.InputJsonValue },
) {
  return prisma.workoutSession.create({
    data: {
      userId,
      name: data.name,
      notes: data.notes,
      exercises: data.exercises ?? Prisma.JsonNull,
      status: 'active',
      startedAt: new Date(),
      pausedDuration: 0,
    },
    include: sessionInclude,
  });
}

export async function updateSession(
  id: number,
  userId: number,
  data: { name?: string; notes?: string; duration?: number; date?: Date; exercises?: Prisma.InputJsonValue },
) {
  const session = await prisma.workoutSession.findUnique({ where: { id } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  return prisma.workoutSession.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.date !== undefined ? { date: data.date } : {}),
      ...(data.exercises !== undefined ? { exercises: data.exercises } : {}),
    },
    include: sessionInclude,
  });
}

export async function pauseSession(id: number, userId: number) {
  const session = await prisma.workoutSession.findUnique({ where: { id } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');
  if (session.status !== 'active') throw new Error('NOT_ACTIVE');
  if (session.pausedAt) return session; // already paused

  return prisma.workoutSession.update({
    where: { id },
    data: { pausedAt: new Date() },
    include: sessionInclude,
  });
}

export async function resumeSession(id: number, userId: number) {
  const session = await prisma.workoutSession.findUnique({ where: { id } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');
  if (!session.pausedAt) return session; // not paused

  const additionalPause = Math.floor((Date.now() - session.pausedAt.getTime()) / 1000);

  return prisma.workoutSession.update({
    where: { id },
    data: {
      pausedAt: null,
      pausedDuration: session.pausedDuration + additionalPause,
    },
    include: sessionInclude,
  });
}

export async function endSession(id: number, userId: number) {
  const session = await prisma.workoutSession.findUnique({ where: { id } });

  if (!session) throw new Error('NOT_FOUND');
  if (session.userId !== userId) throw new Error('FORBIDDEN');

  // Compute total elapsed time in minutes
  const pausedDuration = session.pausedDuration + (session.pausedAt
    ? Math.floor((Date.now() - session.pausedAt.getTime()) / 1000)
    : 0);
  const elapsedSeconds = Math.floor((Date.now() - session.startedAt.getTime()) / 1000) - pausedDuration;
  const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

  return prisma.workoutSession.update({
    where: { id },
    data: {
      status: 'completed',
      pausedAt: null,
      pausedDuration,
      duration: durationMinutes,
    },
    include: sessionInclude,
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
