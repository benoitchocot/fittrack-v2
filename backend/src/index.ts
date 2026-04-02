import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import exercisesRouter from './routes/exercises';
import sessionsRouter from './routes/sessions';
import templatesRouter from './routes/templates';

const app = express();
const PORT = process.env['PORT'] ?? 3001;

const allowedOrigins = [
  'http://localhost:5173',         // dev local
  'https://muscuv2.chocot.be',     // web prod
  'capacitor://localhost',          // Android APK (Capacitor)
  'http://localhost',               // Android APK (fallback Capacitor)
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (ex: Postman, mobile natif)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin non autorisée — ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/exercises', exercisesRouter);
app.use('/sessions', sessionsRouter);
app.use('/templates', templatesRouter);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
