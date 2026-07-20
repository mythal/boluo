import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { optimize, type CustomPlugin } from 'svgo';

interface IconMetadata {
  readonly defaults: Record<string, string>;
  foundRoot: boolean;
  preserveAspectRatio?: string;
  viewBox?: string;
}

interface GeneratedIcon {
  readonly componentSource: string;
  readonly name: string;
  readonly symbol: string;
}

interface IconSet {
  readonly icons: GeneratedIcon[];
  readonly declarationReferencePath: string;
  readonly sourceDirectory: string;
  readonly spriteFilename: string;
  readonly spriteImportPath: string;
}

type DescribedCustomPlugin = CustomPlugin & {
  readonly description: string;
};

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconsDirectory = path.join(packageRoot, 'icons');
const legacyIconsDirectory = path.join(iconsDirectory, 'legacy');
const generatedDirectory = path.join(packageRoot, 'generated');
const sourceDirectory = path.join(packageRoot, 'src');

const rootPresentationAttributes = new Map([
  ['clip-rule', 'clipRule'],
  ['color', 'color'],
  ['fill', 'fill'],
  ['fill-opacity', 'fillOpacity'],
  ['fill-rule', 'fillRule'],
  ['opacity', 'opacity'],
  ['paint-order', 'paintOrder'],
  ['shape-rendering', 'shapeRendering'],
  ['stroke', 'stroke'],
  ['stroke-dasharray', 'strokeDasharray'],
  ['stroke-dashoffset', 'strokeDashoffset'],
  ['stroke-linecap', 'strokeLinecap'],
  ['stroke-linejoin', 'strokeLinejoin'],
  ['stroke-miterlimit', 'strokeMiterlimit'],
  ['stroke-opacity', 'strokeOpacity'],
  ['stroke-width', 'strokeWidth'],
  ['vector-effect', 'vectorEffect'],
]);

const ignoredRootAttributes = new Set([
  'aria-hidden',
  'class',
  'data-icon',
  'data-prefix',
  'focusable',
  'height',
  'role',
  'width',
  'xmlns',
  'xmlns:xlink',
]);

function componentName(filename: string): string {
  return filename
    .replace(/\.svg$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function makeValidationPlugin(filename: string): DescribedCustomPlugin {
  return {
    name: 'validateBoluoIcon',
    description: 'Reject SVG features that are unsafe or incompatible with the shared sprite.',
    fn: () => ({
      element: {
        enter(node, parentNode) {
          if (node.name === 'script' || node.name === 'foreignObject' || node.name === 'style') {
            throw new Error(`${filename}: <${node.name}> is not allowed in icons`);
          }

          for (const [name, value] of Object.entries(node.attributes)) {
            if (/^on/i.test(name)) {
              throw new Error(`${filename}: event handler attribute "${name}" is not allowed`);
            }
            if (
              (name === 'href' || name === 'xlink:href') &&
              value !== '' &&
              !value.startsWith('#')
            ) {
              throw new Error(`${filename}: external reference "${value}" is not allowed`);
            }
            if (name === 'style' && value.trim() !== '') {
              throw new Error(`${filename}: non-empty style attributes are not allowed`);
            }
          }

          if (parentNode.type !== 'root' || node.name !== 'svg') {
            return;
          }

          for (const name of Object.keys(node.attributes)) {
            if (
              name === 'viewBox' ||
              name === 'preserveAspectRatio' ||
              ignoredRootAttributes.has(name) ||
              rootPresentationAttributes.has(name)
            ) {
              continue;
            }
            throw new Error(`${filename}: unsupported root SVG attribute "${name}"`);
          }
        },
      },
    }),
  };
}

function makeExtractRootDefaultsPlugin(
  filename: string,
  metadata: IconMetadata,
): DescribedCustomPlugin {
  return {
    name: 'extractBoluoIconRootDefaults',
    description: 'Move inheritable root presentation attributes to the React wrapper.',
    fn: () => ({
      element: {
        enter(node, parentNode) {
          if (parentNode.type !== 'root' || node.name !== 'svg') {
            return;
          }
          if (metadata.foundRoot) {
            throw new Error(`${filename}: expected exactly one root <svg> element`);
          }
          metadata.foundRoot = true;
          metadata.viewBox = node.attributes.viewBox;
          metadata.preserveAspectRatio = node.attributes.preserveAspectRatio;

          if (!metadata.viewBox) {
            throw new Error(`${filename}: root <svg> must have a viewBox`);
          }

          for (const [svgName, reactName] of rootPresentationAttributes) {
            const value = node.attributes[svgName];
            if (value !== undefined) {
              metadata.defaults[reactName] = value;
              delete node.attributes[svgName];
            }
          }
        },
      },
    }),
  };
}

function makeSymbolPlugin(
  filename: string,
  iconId: string,
  metadata: IconMetadata,
): DescribedCustomPlugin {
  return {
    name: 'convertBoluoIconToSymbol',
    description: 'Convert the optimized root SVG into a sprite symbol.',
    fn: () => ({
      element: {
        enter(node, parentNode) {
          if (parentNode.type !== 'root' || node.name !== 'svg') {
            return;
          }
          if (!metadata.viewBox) {
            throw new Error(`${filename}: root <svg> must have a viewBox`);
          }

          node.name = 'symbol';
          node.attributes = {
            id: iconId,
            viewBox: metadata.viewBox,
            ...(metadata.preserveAspectRatio
              ? { preserveAspectRatio: metadata.preserveAspectRatio }
              : {}),
          };
        },
      },
      root: {
        exit() {
          if (!metadata.foundRoot) {
            throw new Error(`${filename}: expected a root <svg> element`);
          }
        },
      },
    }),
  };
}

function generateComponentSource(name: string, iconId: string, metadata: IconMetadata): string {
  return `import { createIcon } from './createIcon';

const ${name} = createIcon(${JSON.stringify(
    {
      name,
      id: iconId,
      viewBox: metadata.viewBox,
      ...(metadata.preserveAspectRatio
        ? { preserveAspectRatio: metadata.preserveAspectRatio }
        : {}),
      defaults: metadata.defaults,
    },
    null,
    2,
  )});

export default ${name};
`;
}

function generateCreateIconSource(
  declarationReferencePath: string,
  spriteImportPath: string,
): string {
  return `/// <reference path=${JSON.stringify(declarationReferencePath)} />

import type { SVGProps } from 'react';
import spriteAsset from ${JSON.stringify(spriteImportPath)};

type ImportedAsset = string | { readonly src: string };

const importedAsset = spriteAsset as ImportedAsset;
const spriteUrl =
  typeof importedAsset === 'string' ? importedAsset : importedAsset.src;

interface IconDefinition {
  readonly name: string;
  readonly id: string;
  readonly viewBox: string;
  readonly preserveAspectRatio?: string;
  readonly defaults: SVGProps<SVGSVGElement>;
}

export function createIcon({
  name,
  id,
  viewBox,
  preserveAspectRatio,
  defaults,
}: IconDefinition) {
  const Icon = (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      {...defaults}
      {...props}
    >
      <use href={\`\${spriteUrl}#\${id}\`} />
    </svg>
  );
  Icon.displayName = \`Svg\${name}\`;
  return Icon;
}
`;
}

const svgDeclarationSource = `declare module '*.svg' {
  const asset: string | { readonly src: string };
  export default asset;
}
`;

async function readIcons(directory: string, idPrefix: string): Promise<GeneratedIcon[]> {
  const filenames = (await readdir(directory))
    .filter((filename) => filename.endsWith('.svg'))
    .sort((left, right) => left.localeCompare(right));

  if (filenames.length === 0) {
    throw new Error(`${directory}: no SVG icons were found`);
  }

  const icons: GeneratedIcon[] = [];
  const componentNames = new Set<string>();
  for (const filename of filenames) {
    const filePath = path.join(directory, filename);
    const iconId = `${idPrefix}${filename.replace(/\.svg$/, '')}`;
    const name = componentName(filename);
    if (componentNames.has(name)) {
      throw new Error(`${filename}: generated component name "${name}" is not unique`);
    }
    componentNames.add(name);
    const metadata: IconMetadata = {
      defaults: {},
      foundRoot: false,
    };
    const source = await readFile(filePath, 'utf8');
    const result = optimize(source, {
      path: filePath,
      multipass: false,
      js2svg: { pretty: false },
      plugins: [
        makeValidationPlugin(filename),
        makeExtractRootDefaultsPlugin(filename, metadata),
        'preset-default',
        'removeTitle',
        'removeDimensions',
        'removeScripts',
        {
          name: 'prefixIds',
          params: {
            prefix: `${iconId}__`,
          },
        },
        makeSymbolPlugin(filename, iconId, metadata),
      ],
    });

    icons.push({
      componentSource: generateComponentSource(name, iconId, metadata),
      name,
      symbol: result.data,
    });
  }

  return icons;
}

async function writeIconSet({
  icons,
  declarationReferencePath,
  sourceDirectory,
  spriteFilename,
  spriteImportPath,
}: IconSet): Promise<void> {
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(generatedDirectory, { recursive: true });

  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1">${icons
    .map(({ symbol }) => symbol)
    .join('')}</svg>`;
  await writeFile(path.join(generatedDirectory, spriteFilename), sprite);
  await writeFile(
    path.join(sourceDirectory, 'createIcon.tsx'),
    generateCreateIconSource(declarationReferencePath, spriteImportPath),
  );

  for (const icon of icons) {
    await writeFile(path.join(sourceDirectory, `${icon.name}.tsx`), icon.componentSource);
  }

  const indexSource = icons
    .map(({ name }) => `export { default as ${name} } from './${name}';`)
    .join('\n');
  await writeFile(path.join(sourceDirectory, 'index.ts'), `${indexSource}\n`);
}

async function main(): Promise<void> {
  const iconSets: IconSet[] = [
    {
      icons: await readIcons(iconsDirectory, ''),
      declarationReferencePath: './svg.d.ts',
      sourceDirectory,
      spriteFilename: 'sprite.svg',
      spriteImportPath: '../generated/sprite.svg',
    },
    {
      icons: await readIcons(legacyIconsDirectory, 'legacy-'),
      declarationReferencePath: '../svg.d.ts',
      sourceDirectory: path.join(sourceDirectory, 'legacy'),
      spriteFilename: 'legacy-sprite.svg',
      spriteImportPath: '../../generated/legacy-sprite.svg',
    },
  ];

  await rm(sourceDirectory, { recursive: true, force: true });
  await rm(generatedDirectory, { recursive: true, force: true });
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'svg.d.ts'), svgDeclarationSource);

  for (const iconSet of iconSets) {
    await writeIconSet(iconSet);
  }
}

await main();
