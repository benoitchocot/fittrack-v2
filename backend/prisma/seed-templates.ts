/**
 * Seed templates for user 2 (Benoit) — with comments from last sessions
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEMPLATES: Array<{ name: string; exercises: Array<{ name: string; comment?: string }> }> = [
  {
    name: 'PUSH',
    exercises: [
      { name: 'Développé couché haltères',               comment: '4 × 6–8 reps\nLourd — charge de force\nRepos 2–3 min' },
      { name: 'Développé incliné haltères (30°)',         comment: '3 × 10–12 reps\nFaisceau supérieur\nRepos 90 s' },
      { name: 'Pec fly poulies basses',                   comment: '3 × 12–15 reps\nÉtirement max faisceau inf.\nRepos 60–90 s' },
      { name: 'Machine pec deck (butterfly)',             comment: '3 × 15 reps — 2 s d\'iso en fin\nContraction maximale\nRepos 60 s' },
      { name: 'Développé épaules machine (Smith ou guidé)', comment: '3 × 10–12 reps\nFaisceau antérieur + médian\nRepos 90 s' },
      { name: 'Élévations latérales haltères',            comment: '3 × 15–20 reps\nFaisceau latéral\nRepos 60 s' },
      { name: 'Dips lestés ou prise serrée',              comment: '3 × 8–10 reps\nChef long en étirement\nRepos 90 s' },
      { name: 'Extensions triceps corde poulie haute',    comment: '3 × 12–15 reps\nIsolation + pump\nRepos 60 s' },
    ],
  },
  {
    name: 'PULL',
    exercises: [
      { name: 'Tractions prise large pronation',                   comment: '4 × 6–8 reps\nLest si > 10 reps facile\nRepos 2–3 min' },
      { name: 'Pullover poulie haute (câble droit ou corde)',       comment: '3 × 12–15 reps\nGrand dorsal pur — 0 biceps\nRepos 90 s' },
      { name: 'Tirage horizontal prise neutre (câble ou machine)', comment: '4 × 8–10 reps\nLourd — épaisseur dos\nRepos 2 min' },
      { name: 'Oiseau machine rear delt',                          comment: '3 × 15 reps — 2 s iso\nDeltoïde postérieur\nRepos 60 s' },
      { name: 'Curl incliné haltères (banc à 45–60°)',             comment: '3 × 10–12 reps\nChef long en étirement max\nRepos 90 s' },
      { name: 'Curl câble prise marteau (corde basse poulie)',      comment: '3 × 12–15 reps\nBrachial + coude protégé\nRepos 60 s' },
    ],
  },
  {
    name: 'LEGS',
    exercises: [
      { name: 'Hack squat ou presse horizontale', comment: '4 × 8–10 reps\nLourd — base de la séance\nRepos 2–3 min' },
      { name: 'Fentes avec haltères',             comment: '4 × 6–8 reps par jambe\nCharge sérieuse\nRepos 2 min' },
      { name: 'Leg extension machine',            comment: '3 × 12–15 reps — 2 s iso en haut\nIsolation quad\nRepos 60 s' },
      { name: 'Good morning',                     comment: '3 × 10–12 reps\nRepos 90 s' },
      { name: 'Leg curl machine allongé',         comment: '3 × 10–12 reps\nContraction maximale\nRepos 60–90 s' },
      { name: 'Presse mollets',                   comment: '4 × 15–20 reps\nAmplitude complète\nRepos 60 s' },
    ],
  },
  {
    name: 'ARMS',
    exercises: [
      { name: 'Traction biceps' },
      { name: 'Dips (bras)' },
      { name: 'Curl barre (bras)' },
      { name: 'Barre au front' },
      { name: 'Curl haltère' },
      { name: 'Triceps Corde' },
      { name: 'Machine biceps' },
      { name: 'Machine triceps' },
      { name: 'Crunch à la machine' },
      { name: 'Russian twist' },
    ],
  },
  {
    name: 'EPAULES',
    exercises: [
      { name: 'Développé militaire' },
      { name: 'Élévations latérales' },
      { name: 'Oiseau avec haltères' },
      { name: 'Shrugs' },
      { name: 'Élévations frontales' },
    ],
  },
];

async function main() {
  const TARGET_USER_ID = 2;

  const user = await prisma.user.findUnique({ where: { id: TARGET_USER_ID } });
  if (!user) throw new Error(`User ${TARGET_USER_ID} not found`);
  console.log(`Seeding templates for: ${user.email}`);

  // Delete existing templates to re-seed with comments
  const deleted = await prisma.workoutTemplate.deleteMany({ where: { userId: TARGET_USER_ID } });
  if (deleted.count > 0) console.log(`Deleted ${deleted.count} existing templates.`);

  for (const tpl of TEMPLATES) {
    const exerciseEntries: Array<{ exerciseId: number; comment?: string }> = [];

    for (const entry of tpl.exercises) {
      const ex = await prisma.exercise.findFirst({
        where: { name: { equals: entry.name, mode: 'insensitive' } },
      });
      if (ex) {
        exerciseEntries.push({ exerciseId: ex.id, comment: entry.comment });
      } else {
        console.warn(`  ⚠ Exercise not found: "${entry.name}" — skipped`);
      }
    }

    if (exerciseEntries.length === 0) continue;

    await prisma.workoutTemplate.create({
      data: {
        userId: TARGET_USER_ID,
        name: tpl.name,
        exercises: {
          create: exerciseEntries.map((e, i) => ({
            exerciseId: e.exerciseId,
            order: i,
            comment: e.comment ?? null,
          })),
        },
      },
    });

    const withComment = exerciseEntries.filter(e => e.comment).length;
    console.log(`  ✓ ${tpl.name} — ${exerciseEntries.length} exercices (${withComment} avec commentaire)`);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
