const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const rounded = Number(value.toFixed(1));
  const digits = Number.isInteger(rounded) ? 0 : 1;
  return `${rounded.toFixed(digits)} ${BYTE_UNITS[unitIndex]}`;
}
