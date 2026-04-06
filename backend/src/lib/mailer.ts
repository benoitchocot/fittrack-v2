import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendDeletionRequest(user: { id: number; name: string; email: string }) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: 'benoit.chocot@gmail.com',
    subject: `[FitTrack] Demande de suppression de compte`,
    text: [
      `Un utilisateur a demandé la suppression de son compte FitTrack.`,
      ``,
      `Nom : ${user.name}`,
      `Email : ${user.email}`,
      `ID : ${user.id}`,
      ``,
      `Pour supprimer ce compte, connecte-toi à la base de données et supprime l'utilisateur avec cet ID.`,
    ].join('\n'),
  });
}
