// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// eslint-disable-next-line @typescript-eslint/no-deprecated
export default tseslint.config(
  {
    ignores: ['dist/**/*', 'node_modules/**/*']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: ['dist/**/*'],
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.js', 'tsup.config.ts'],
          defaultProject: './tsconfig.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
