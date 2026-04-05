import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';
import * as sessionService from '../services/session.service';

function parseIntParam(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] ?? '' : value ?? '');
}

const router = Router();
router.use(authMiddleware);

const sessionExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  name: z.string(),
  muscleGroupName: z.string(),
  sets: z.number().int().positive().nullable().optional(),
  reps: z.number().int().positive().nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  comment: z.string().nullable().optional(),
});

const sessionCreateSchema = z.object({
  name: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  exercises: z.array(sessionExerciseSchema).optional(),
});

const sessionUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  duration: z.number().int().positive().optional(),
  date: z.coerce.date().optional(),
  exercises: z.array(sessionExerciseSchema).optional(),
});

const setCreateSchema = z.object({
  exerciseId: z.number().int().positive(),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight: z.number().nonnegative(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

const setUpdateSchema = z.object({
  setNumber: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
  weight: z.number().nonnegative().optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(500).optional(),
});

function handleServiceError(err: unknown, res: Response): void {
  if (err instanceof Error) {
    if (err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return; }
    if (err.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
    if (err.message === 'NOT_ACTIVE') { res.status(400).json({ error: 'Session is not active' }); return; }
  }
  res.status(500).json({ error: 'Internal server error' });
}

// GET /sessions/active — must be before /:id
router.get('/active', async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.getActiveSession(req.user!.id);
  res.json(session ?? null);
});

// GET /sessions/progression/:exerciseId — must be before /:id
router.get('/progression/:exerciseId', async (req: Request, res: Response): Promise<void> => {
  const exerciseId = parseIntParam(req.params['exerciseId']);
  if (isNaN(exerciseId)) { res.status(400).json({ error: 'Invalid exercise id' }); return; }

  const data = await sessionService.getExerciseProgression(exerciseId, req.user!.id);
  res.json(data);
});

// GET /sessions
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const sessions = await sessionService.listSessions(req.user!.id);
  res.json(sessions);
});

// GET /sessions/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    const session = await sessionService.getSession(id, req.user!.id);
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// POST /sessions
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = sessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const session = await sessionService.createSession(req.user!.id, {
    name: parsed.data.name,
    notes: parsed.data.notes,
    exercises: parsed.data.exercises as Prisma.InputJsonValue | undefined,
  });
  res.status(201).json(session);
});

// PUT /sessions/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const parsed = sessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const session = await sessionService.updateSession(id, req.user!.id, {
      name: parsed.data.name,
      notes: parsed.data.notes,
      duration: parsed.data.duration,
      date: parsed.data.date,
      exercises: parsed.data.exercises as Prisma.InputJsonValue | undefined,
    });
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// POST /sessions/:id/pause
router.post('/:id/pause', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    const session = await sessionService.pauseSession(id, req.user!.id);
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// POST /sessions/:id/resume
router.post('/:id/resume', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    const session = await sessionService.resumeSession(id, req.user!.id);
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// POST /sessions/:id/end
router.post('/:id/end', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    const session = await sessionService.endSession(id, req.user!.id);
    res.json(session);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// DELETE /sessions/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    await sessionService.deleteSession(id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res);
  }
});

// --- Sets ---

// POST /sessions/:id/sets
router.post('/:id/sets', async (req: Request, res: Response): Promise<void> => {
  const sessionId = parseIntParam(req.params['id']);
  if (isNaN(sessionId)) { res.status(400).json({ error: 'Invalid session id' }); return; }

  const parsed = setCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const set = await sessionService.addSet(sessionId, req.user!.id, parsed.data);
    res.status(201).json(set);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// PUT /sessions/:id/sets/:setId
router.put('/:id/sets/:setId', async (req: Request, res: Response): Promise<void> => {
  const setId = parseIntParam(req.params['setId']);
  if (isNaN(setId)) { res.status(400).json({ error: 'Invalid set id' }); return; }

  const parsed = setUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const set = await sessionService.updateSet(setId, req.user!.id, parsed.data);
    res.json(set);
  } catch (err) {
    handleServiceError(err, res);
  }
});

// DELETE /sessions/:id/sets/:setId
router.delete('/:id/sets/:setId', async (req: Request, res: Response): Promise<void> => {
  const setId = parseIntParam(req.params['setId']);
  if (isNaN(setId)) { res.status(400).json({ error: 'Invalid set id' }); return; }

  try {
    await sessionService.deleteSet(setId, req.user!.id);
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res);
  }
});

export default router;
