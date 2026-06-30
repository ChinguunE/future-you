#!/usr/bin/env node
/**
 * CI guard — bans emoji / pictographs from the app source and message catalogues.
 *
 * Iconography in Future You comes from our own 84-piece illustration library
 * (<Illustration> / <Sprout>), never from emoji or third-party icon fonts. This
 * keeps the look consistent and on-brand. Run in CI so an emoji can't creep back
 * in (`npm run check:emoji`).
 *
 * The banned ranges are emoji blocks only. They deliberately EXCLUDE the symbols
 * we use on purpose: Arrows (U+2190–21FF, e.g. the "→" in "ink→grape") and
 * Geometric Shapes (U+25A0–25FF, e.g. the ▲ / ▼ that mark gains and losses — and
 * which DESIGN §11 requires so money never relies on colour alone).
 */
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const ROOTS = ['src', 'messages'];
const FILE_RE = /\.(tsx?|jsx?|css|json|md)$/;

const BANNED_RANGES = [
  [0x1f000, 0x1faff], // emoticons, transport, pictographs, symbols ext-A
  [0x2600, 0x27bf], //   miscellaneous symbols + dingbats
  [0x2b00, 0x2bff], //   miscellaneous symbols & arrows (stars, blocks)
  [0x1f1e6, 0x1f1ff], // regional indicators (flag letters)
  [0xfe00, 0xfe0f], //   variation selectors (emoji presentation)
  [0x1f3fb, 0x1f3ff] // skin-tone modifiers
];

const isBanned = (cp) =>
  BANNED_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);

function collect(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) collect(path, out);
    else if (FILE_RE.test(entry)) out.push(path);
  }
}

const files = [];
for (const root of ROOTS) {
  try {
    collect(root, files);
  } catch {
    // A missing root is not an error (keeps the guard portable).
  }
}

const hits = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (isBanned(cp)) {
        hits.push(
          `${file}:${i + 1}  U+${cp.toString(16).toUpperCase()} ${ch}`
        );
      }
    }
  });
}

if (hits.length > 0) {
  console.error(
    `\n✗ Emoji are banned — use a library <Illustration> instead. Found ${hits.length}:\n`
  );
  for (const hit of hits) console.error(`  ${hit}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ no emoji in ${files.length} files`);
