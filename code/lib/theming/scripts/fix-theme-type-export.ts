import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dedent } from 'ts-dedent';

const run = async () => {
  const target = join(process.cwd(), 'dist', 'index.d.ts');
  const contents = await readFile(target, 'utf8');

  const footer = contents.includes('// dev-mode')
    ? `export { StorybookTheme as Theme } from '../src/index';`
    : dedent`
        interface Theme extends StorybookTheme {}
        export type { Theme };
      `;

  const newContents = dedent`
    ${contents}
    ${footer}
  `;

  await writeFile(target, newContents);
};

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
