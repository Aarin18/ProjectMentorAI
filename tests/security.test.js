import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

async function readProjectFile(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8');
}

describe('secret handling', () => {
  it('does not include a hardcoded Gemini key in frontend source', async () => {
    const sourceFiles = await Promise.all([
      readProjectFile('index.html'),
      readProjectFile('js/api.js'),
      readProjectFile('js/ui.js'),
      readProjectFile('js/validation.js'),
    ]);

    expect(sourceFiles.join('\n')).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
  });

  it('does not expose the environment key name or value in frontend responses', async () => {
    const frontend = await readProjectFile('js/api.js');
    expect(frontend).not.toContain('GEMINI_API_KEY');
    expect(frontend).not.toMatch(/process\.env/);
  });
});
