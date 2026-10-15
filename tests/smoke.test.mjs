import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('the browser shell has the DropDesk identity and app entrypoint', () => {
  assert.match(indexHtml, /<title>DropDesk<\/title>/);
  assert.match(indexHtml, /id="app"/);
  assert.match(indexHtml, /src="\/src\/main\.js"/);
  assert.match(indexHtml, /href="\/src\/style\.css"/);
});
