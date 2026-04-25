export const toTimestamp = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  }

  return [minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
};

export const formatTimestampRange = (
  startSeconds: number,
  endSeconds: number
): string => `${toTimestamp(startSeconds)} - ${toTimestamp(endSeconds)}`;

