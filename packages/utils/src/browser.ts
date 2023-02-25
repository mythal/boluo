export const stopPropagation = <T extends { stopPropagation: () => void }>(e: T) => {
  e.stopPropagation();
};
