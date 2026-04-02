import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as exerciseService from '../services/exercise.service';

function parseIntParam(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] ?? '' : value ?? '');
}

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  muscleGroupId: z.number().int().positive(),
  equipment: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial();

// GET /exercises
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const exercises = await exerciseService.listExercises(req.user!.id);
  res.json(exercises);
});

// GET /exercises/muscle-groups
router.get('/muscle-groups', async (_req: Request, res: Response): Promise<void> => {
  const groups = await exerciseService.listMuscleGroups();
  res.json(groups);
});

// GET /exercises/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    const exercise = await exerciseService.getExercise(id, req.user!.id);
    res.json(exercise);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Exercise not found' }); return; }
      if (err.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /exercises
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const exercise = await exerciseService.createExercise(req.user!.id, parsed.data);
  res.status(201).json(exercise);
});

// PUT /exercises/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const exercise = await exerciseService.updateExercise(id, req.user!.id, parsed.data);
    res.json(exercise);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Exercise not found' }); return; }
      if (err.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /exercises/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }

  try {
    await exerciseService.deleteExercise(id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Exercise not found' }); return; }
      if (err.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
