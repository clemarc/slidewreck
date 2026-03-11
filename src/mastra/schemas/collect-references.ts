import { z } from 'zod';
import { ReferenceMaterialSchema } from './workflow-input';

export const CollectReferencesSuspendSchema = z.object({
  prompt: z.string().describe('Instructions for the user on what materials to provide'),
});

export const CollectReferencesResumeSchema = z.object({
  materials: z.array(ReferenceMaterialSchema).describe('Reference materials to index. Empty array to skip.'),
});
