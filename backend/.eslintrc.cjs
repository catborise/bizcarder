module.exports = {
    root: true,
    env: {
        node: true,
        commonjs: true,
        es2022: true,
        jest: true,
    },
    extends: ['eslint:recommended'],
    ignorePatterns: ['node_modules/**', 'coverage/**', 'uploads/**', 'logs/**'],
    parserOptions: {
        ecmaVersion: 'latest',
    },
    rules: {
        'no-unused-vars': [
            'warn',
            {
                argsIgnorePattern: '^_|^Sequelize$|^queryInterface$',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            },
        ],
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-constant-condition': ['error', { checkLoops: false }],
    },
};
