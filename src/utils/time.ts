export const padZero = (n: number) => (n > 9 ? String(n) : `0${n}`);

export const dateFormat = (date: Date) => {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
};

export const timeFormat = (date: Date) => {
  return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
};

export const dateTimeFormat = (date: Date) => {
  return `${dateFormat(date)} ${timeFormat(date)}`;
};
