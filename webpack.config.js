import path from 'path';

export default {
  entry: "./src/index.js",
  output: {
    path: path.resolve('.', 'dist'),
    filename: "bookmate.js"
  },
  target: "node",
  node: {
    __dirname: false
  },
};
