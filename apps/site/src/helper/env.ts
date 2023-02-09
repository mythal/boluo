export const parseBool = (env: string | null | undefined): boolean => {
  env = (env ?? 'false').trim().toLowerCase();
  if (env === 'true' || env === '1' || env === 'on') {
    return true;
  } else if (env === 'false' || env === '0' || env === 'off') {
    return false;
  } else {
    throw new Error(`Invalid boolean value: ${env}`);
  }
};
