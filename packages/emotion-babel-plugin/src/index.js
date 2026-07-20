import emotionBabelPlugin from '@emotion/babel-plugin';
import { installPathHoist } from './path-hoist.js';

export default function emotionBabel8Plugin(babel, options) {
  const plugin = emotionBabelPlugin(babel, options);
  const programVisitor = plugin.visitor.Program;

  return {
    ...plugin,
    name: '@boluo/emotion-babel-plugin',
    visitor: {
      ...plugin.visitor,
      Program(path, state) {
        installPathHoist(path, babel.types);
        return programVisitor.call(this, path, state);
      },
    },
  };
}
