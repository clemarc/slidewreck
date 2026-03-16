import { z } from 'zod';
import { ReferenceMaterialSchema } from './workflow-input';

export const CollectReferencesSuspendSchema = z.object({
  prompt: z.string().describe('Instructions for the user on what materials to provide'),
});

export const CollectReferencesResumeSchema = z.object({
  materials: z.array(ReferenceMaterialSchema).default([]).describe('Reference materials to index. Omit or empty array to skip.'),
});
