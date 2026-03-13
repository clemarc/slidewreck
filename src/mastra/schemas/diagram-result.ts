import { z } from 'zod';

export const DiagramResultSchema = z.object({
  slideNumber: z.number().int().positive(),
  svg: z.string().min(1),
});

export type DiagramResult = z.infer<typeof DiagramResultSchema>;
