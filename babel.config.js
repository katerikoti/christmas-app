module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Keep proposal plugins in loose mode consistently to avoid Babel 'loose' mismatch
    ['@babel/plugin-transform-class-properties', { loose: false }],
    ['@babel/plugin-transform-private-methods', { loose: false }],
    ['@babel/plugin-transform-private-property-in-object', { loose: false }],
    // reanimated plugin must be last
    'react-native-reanimated/plugin',
  ],
};
