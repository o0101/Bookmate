// Generated using webpack-cli https://github.com/webpack/webpack-cli

import path from 'path';

const config = {
    entry: './src/index.js',
    output: {
        path: path.resolve('.', 'dist'),
        filename: 'bookmate.js'
    },
    target: "node",
};

export default () => {
  config.mode = 'production';
  return config;
};
