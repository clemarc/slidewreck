/**
 * Type-safe validation via Standard Schema `~standard.validate()`.
 * Replaces direct `.safeParse()` calls on tool inputSchema/outputSchema
 * which are typed as StandardSchemaWithJSON (no safeParse in type).
 */
export function validateSchema(
  schema: { '~standard': { validate: (value: unknown) => unknown } },
  value: unknown,
): { success: boolean } {
  const result = schema['~standard'].validate(value) as Record<string, unknown>;
  if ('issues' in result && result.issues) return { success: false };
  return { success: true };
}
