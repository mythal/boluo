module.exports = {
  root: true,
  extends: ['custom'],
  ignorePatterns: ['node_modules', 'dist'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};
