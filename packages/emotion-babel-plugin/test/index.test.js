import assert from 'node:assert/strict';
import test from 'node:test';
import { transformAsync } from '@babel/core';

import emotionBabelPlugin from '../src/index.js';

async function transform(code) {
  const result = await transformAsync(code, {
    filename: 'fixture.jsx',
    plugins: [emotionBabelPlugin],
  });
  return result.code;
}

test('transforms Emotion css calls with Babel 8', async () => {
  const output = await transform(`
    import { css } from '@emotion/react'
    const style = css({ color: 'hotpink' })
  `);

  assert.match(output, /styles: "color:hotpink"/);
  assert.doesNotMatch(output, /css\(\{/);
});

test('hoists static css props out of components', async () => {
  const output = await transform(`
    /** @jsx jsx */
    import { jsx } from '@emotion/react'
    const SomeComponent = props => <div css={{ color: 'hotpink' }} {...props} />
  `);

  const hoistedStyle = output.indexOf('var _ref =');
  const component = output.indexOf('const SomeComponent =');
  assert.ok(hoistedStyle !== -1);
  assert.ok(component !== -1);
  assert.ok(hoistedStyle < component);
  assert.match(output, /css=\{_ref\}/);
});
