export function getRowsAffected(result: any): number {
  if (typeof result.rowsAffected === "number") return result.rowsAffected;
  if (result.meta?.changes !== undefined) return result.meta.changes as number;
  return 0;
}
