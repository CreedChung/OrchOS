function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export abstract class ContextDiffUtil {
  static applyPatch(
    base: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const next: Record<string, unknown> = { ...base };

    for (const [key, value] of Object.entries(patch)) {
      if (value === null) {
        delete next[key];
        continue;
      }

      if (isPlainObject(value) && isPlainObject(next[key])) {
        next[key] = ContextDiffUtil.applyPatch(
          next[key] as Record<string, unknown>,
          value,
        );
        continue;
      }

      next[key] = value;
    }

    return next;
  }

  static diff(
    from: Record<string, unknown>,
    to: Record<string, unknown>,
  ): Record<string, unknown> {
    const patch: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(from), ...Object.keys(to)]);

    for (const key of keys) {
      const fromValue = from[key];
      const toValue = to[key];

      if (JSON.stringify(fromValue) === JSON.stringify(toValue)) continue;

      if (toValue === undefined) {
        patch[key] = null;
        continue;
      }

      if (isPlainObject(fromValue) && isPlainObject(toValue)) {
        patch[key] = ContextDiffUtil.diff(fromValue, toValue);
        continue;
      }

      patch[key] = toValue;
    }

    return patch;
  }
}
