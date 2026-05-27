/**
 * Conventional commits, enforced via Husky.
 * Examples:
 *   feat(api): add POST /signals/:id/execute
 *   fix(risk-engine): correct daily-loss rail off-by-one
 *   chore(deps): bump openai to 4.70
 *   docs(spec): clarify channel graduation criteria
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'sentence-case'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
  },
};
