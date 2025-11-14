export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

export const isDaytime = (): boolean => {
  const hours = new Date().getHours();
  return hours > 6 && hours < 18;
};

export const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const generateDetailDate = (date: Date): string => {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const seconds = date.getSeconds();
  return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
};
