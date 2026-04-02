import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import * as templateService from '../services/template.service';

const router = Router();
router.use(authMiddleware);

function parseIntParam(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] ?? '' : value ?? '');
}

function handleError(err: unknown, res: Response): void {
  if (err instanceof Error) {
    if (err.message === 'NOT_FOUND') { res.status(404).json({ error: 'Not found' }); return; }
    if (err.message === 'FORBIDDEN') { res.status(403).json({ error: 'Forbidden' }); return; }
  }
  res.status(500).json({ error: 'Internal server error' });
}

const exerciseEntry = z.object({
  exerciseId: z.number().int().positive(),
  comment: z.string().max(500).optional(),
});

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  exercises: z.array(exerciseEntry).min(1),
});

// GET /templates
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const templates = await templateService.listTemplates(req.user!.id);
  res.json(templates);
});

// GET /templates/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    res.json(await templateService.getTemplate(id, req.user!.id));
  } catch (err) { handleError(err, res); }
});

// POST /templates
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
  const template = await templateService.createTemplate(req.user!.id, parsed.data.name, parsed.data.exercises);
  res.status(201).json(template);
});

// PUT /templates/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
  try {
    res.json(await templateService.updateTemplate(id, req.user!.id, parsed.data.name, parsed.data.exercises));
  } catch (err) { handleError(err, res); }
});

// DELETE /templates/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseIntParam(req.params['id']);
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return; }
  try {
    await templateService.deleteTemplate(id, req.user!.id);
    res.status(204).send();
  } catch (err) { handleError(err, res); }
});

export default router;
