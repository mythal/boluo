# react-virtuoso

This directory contains the source code from
[`react-virtuoso@4.18.10`](https://github.com/petyosi/react-virtuoso/tree/react-virtuoso%404.18.10/packages/react-virtuoso).

- Upstream repository: <https://github.com/petyosi/react-virtuoso>
- Upstream tag: `react-virtuoso@4.18.10`
- Upstream commit: `2c68507b98504bd65a48af6f7a4c84675a349b84`
- License: MIT; see [`LICENSE`](./LICENSE)

The package manifest is adapted so that the private workspace exports TypeScript
source directly. Build output is not committed.

## Local patches

- `src/upwardScrollFixSystem.ts` and `src/Virtuoso.tsx` contain an independent
  iOS/iPadOS WebKit workaround for upward scrolling through items whose measured
  heights differ from their estimates. It defers scroll correction while
  momentum scrolling is active, handles corrections that reach the top edge,
  and restores the position while briefly locking the scroller.
- `src/upwardScrollFixSystem.test.ts` covers the deferred correction and edge
  recovery behavior.

The workaround follows the behavior described in
[`react-virtuoso#945`](https://github.com/petyosi/react-virtuoso/issues/945);
it does not vendor source from the commercially licensed
`@virtuoso.dev/message-list` package.

When updating, replace `LICENSE` and `README.md`, update the version, tag, and
commit recorded here, and reapply the local patches after replacing `src`.
