/** Build a lookup map from diagram slideNumber to SVG string */
export function buildDiagramMap(
  diagrams: Array<{ slideNumber: number; svg: string }> | undefined,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!diagrams) return map;
  for (const d of diagrams) {
    map.set(d.slideNumber, d.svg);
  }
  return map;
}
