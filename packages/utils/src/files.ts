export const showFileSize = (size: number): string => {
  if (size < 1024) return `${size} Byte`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KiB`;
  if (size < 1024 * 1024 * 1024) return `${Math.round(size / 1024 / 1024)} MiB`;
  return `${Math.round(size / 1024 / 1024 / 1024)} GB`;
};
