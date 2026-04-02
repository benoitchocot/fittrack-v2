import { prisma } from '../lib/prisma';

export async function listExercises(userId: number) {
  return prisma.exercise.findMany({
    where: {
      OR: [{ isCustom: false }, { isCustom: true, createdById: userId }],
    },
    include: { muscleGroup: true },
    orderBy: [{ isCustom: 'asc' }, { name: 'asc' }],
  });
}

export async function getExercise(id: number, userId: number) {
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    include: { muscleGroup: true },
  });

  if (!exercise) throw new Error('NOT_FOUND');
  if (exercise.isCustom && exercise.createdById !== userId) throw new Error('FORBIDDEN');

  return exercise;
}

export async function createExercise(
  userId: number,
  data: {
    name: string;
    muscleGroupId: number;
    equipment?: string;
    description?: string;
  },
) {
  return prisma.exercise.create({
    data: { ...data, isCustom: true, createdById: userId },
    include: { muscleGroup: true },
  });
}

export async function updateExercise(
  id: number,
  userId: number,
  data: {
    name?: string;
    muscleGroupId?: number;
    equipment?: string;
    description?: string;
  },
) {
  const exercise = await prisma.exercise.findUnique({ where: { id } });

  if (!exercise) throw new Error('NOT_FOUND');
  if (!exercise.isCustom || exercise.createdById !== userId) throw new Error('FORBIDDEN');

  return prisma.exercise.update({
    where: { id },
    data,
    include: { muscleGroup: true },
  });
}

export async function deleteExercise(id: number, userId: number) {
  const exercise = await prisma.exercise.findUnique({ where: { id } });

  if (!exercise) throw new Error('NOT_FOUND');
  if (!exercise.isCustom || exercise.createdById !== userId) throw new Error('FORBIDDEN');

  await prisma.exercise.delete({ where: { id } });
}

export async function listMuscleGroups() {
  return prisma.muscleGroup.findMany({ orderBy: { name: 'asc' } });
}
