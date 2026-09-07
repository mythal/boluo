import type { HtmlTagDescriptor, Plugin } from 'vite';

/**
 * Prefetching rather than preloading is deliberate: `modulepreload` enters the module
 * map, where a fetch failure is memoized with no way to evict it, so a later `import()`
 * of that chunk keeps failing without ever reaching the network. A failed prefetch only
 * leaves the HTTP cache cold.
 */
export const prefetchLazyChunks = ({
  loadedOnStartup = [],
}: { loadedOnStartup?: RegExp[] } = {}): Plugin => {
  let base = '/';

  return {
    name: 'boluo:prefetch-lazy-chunks',
    apply: 'build',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        if (bundle == null) return;

        const reachableFromEntry = new Set<string>();
        const walkStaticImports = (fileName: string) => {
          if (reachableFromEntry.has(fileName)) return;
          const chunk = bundle[fileName];
          if (chunk == null || chunk.type !== 'chunk') return;
          reachableFromEntry.add(fileName);
          chunk.imports.forEach(walkStaticImports);
        };
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && chunk.isEntry) walkStaticImports(chunk.fileName);
        }

        const tags: HtmlTagDescriptor[] = [];
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk' || reachableFromEntry.has(chunk.fileName)) continue;
          if (loadedOnStartup.some((pattern) => pattern.test(chunk.fileName))) continue;
          tags.push({
            tag: 'link',
            attrs: {
              rel: 'prefetch',
              // Must match the `crossorigin` of the emitted module scripts, or the
              // prefetched response cannot be reused.
              crossorigin: '',
              href: `${base}${chunk.fileName}`,
            },
            injectTo: 'head',
          });
        }
        return tags;
      },
    },
  };
};
