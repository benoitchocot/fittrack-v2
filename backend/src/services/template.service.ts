import { prisma } from '../lib/prisma';

export async function listTemplates(userId: number) {
  return prisma.workoutTemplate.findMany({
    where: { userId },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getTemplate(id: number, userId: number) {
  const template = await prisma.workoutTemplate.findUnique({
    where: { id },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!template) throw new Error('NOT_FOUND');
  if (template.userId !== userId) throw new Error('FORBIDDEN');

  return template;
}

export async function createTemplate(
  userId: number,
  name: string,
  exercises: Array<{ exerciseId: number; comment?: string }>,
) {
  return prisma.workoutTemplate.create({
    data: {
      userId,
      name,
      exercises: {
        create: exercises.map((e, i) => ({ exerciseId: e.exerciseId, order: i, comment: e.comment ?? null })),
      },
    },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: 'asc' },
      },
    },
  });
}

export async function updateTemplate(
  id: number,
  userId: number,
  name: string,
  exercises: Array<{ exerciseId: number; comment?: string }>,
) {
  const template = await prisma.workoutTemplate.findUnique({ where: { id } });
  if (!template) throw new Error('NOT_FOUND');
  if (template.userId !== userId) throw new Error('FORBIDDEN');

  await prisma.workoutTemplateExercise.deleteMany({ where: { templateId: id } });

  return prisma.workoutTemplate.update({
    where: { id },
    data: {
      name,
      exercises: {
        create: exercises.map((e, i) => ({ exerciseId: e.exerciseId, order: i, comment: e.comment ?? null })),
      },
    },
    include: {
      exercises: {
        include: { exercise: { include: { muscleGroup: true } } },
        orderBy: { order: 'asc' },
      },
    },
  });
}

export async function deleteTemplate(id: number, userId: number) {
  const template = await prisma.workoutTemplate.findUnique({ where: { id } });
  if (!template) throw new Error('NOT_FOUND');
  if (template.userId !== userId) throw new Error('FORBIDDEN');

  await prisma.workoutTemplate.delete({ where: { id } });
}
