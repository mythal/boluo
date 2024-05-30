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

export const dateFormat = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const timeFormat = (date: Date, split = ':') => {
  return pad2(date.getHours()) + split + pad2(date.getMinutes());
};

export const dateTimeFormat = (date: Date) => {
  return `${dateFormat(date)} ${timeFormat(date)}`;
};

export const fileNameDateTimeFormat = (date: Date) => {
  return `${dateFormat(date)}_${timeFormat(date, '-')}`;
};
