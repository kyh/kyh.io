export const formatCount = (value: number) => value.toLocaleString("en-US");

export const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return minutes > 0 ? `${minutes}m ${String(rest).padStart(2, "0")}s` : `${rest}s`;
};
