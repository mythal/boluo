module.exports = {
  root: true,
  extends: ['custom'],
  ignorePatterns: ['node_modules', 'dist'],

  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.json'],
      },
    },
  ],
};
