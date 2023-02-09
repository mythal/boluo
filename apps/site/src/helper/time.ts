export const isDaytime = (): boolean => {
  const hours = new Date().getHours();
  return hours > 6 && hours < 18;
};
