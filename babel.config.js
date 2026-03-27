const removeConsole =
  process.env.BABEL_ENV === 'production' || process.env.NODE_ENV === 'production';

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        allowUndefined: false,
      },
    ],
    removeConsole && [
      'transform-remove-console',
      { exclude: ['error', 'warn'] },
    ],
  ].filter(Boolean),
};
