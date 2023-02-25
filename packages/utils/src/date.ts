export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

export const isDaytime = (): boolean => {
  const hours = new Date().getHours();
  return hours > 6 && hours < 18;
};
