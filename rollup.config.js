import path from 'path';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from "rollup-plugin-terser";

export default {
  input: path.resolve('src', 'index.js'),
  output: {
    file: path.resolve('dist', 'bookmate.js'),
    format: 'cjs',
    generatedCode: 'es2015'
  },
  plugins: [commonjs(), terser()]
};
