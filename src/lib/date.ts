const pad2 = (value: number) => String(value).padStart(2, "0");

export const toISODate = (value: Date) => {
  const year = value.getFullYear();
  const month = pad2(value.getMonth() + 1);
  const day = pad2(value.getDate());
  return `${year}-${month}-${day}`;
};

export const getTodayISO = () => toISODate(new Date());

export const getPastDays = (count: number) => {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(toISODate(date));
  }
  return days;
};
