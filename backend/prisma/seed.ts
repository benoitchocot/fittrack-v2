import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const muscleGroups = [
    'Pectoraux',
    'Dos',
    'Épaules',
    'Biceps',
    'Triceps',
    'Jambes',
    'Abdominaux',
    'Mollets',
  ];

  for (const name of muscleGroups) {
    await prisma.muscleGroup.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Seed completed: muscle groups inserted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
