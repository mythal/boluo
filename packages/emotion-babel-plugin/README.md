# `@boluo/emotion-babel-plugin`

This private package makes `@emotion/babel-plugin` work with Babel 8.

Emotion 11.13.5 calls `NodePath#hoist`, which Babel 8 removed. This wrapper
restores that operation using the last Babel 7 implementation before running
the upstream plugin. Remove this package after Emotion ships native Babel 8
support.

- Upstream issue: https://github.com/emotion-js/emotion/issues/3386
- Hoister source: https://github.com/babel/babel/blob/v7.29.0/packages/babel-traverse/src/path/lib/hoister.ts

The adapted hoister retains Babel's MIT license in `LICENSE`.
