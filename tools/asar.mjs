// Minimal asar reader.
//
// The DSH client artifacts live inside D:\dsh\resources\app.asar. Shell tools
// (ripgrep included) cannot look inside the archive, but the format is simple
// enough to read directly: a JSON directory followed by concatenated file
// bodies. Being able to pull the shipped client bundles into the workspace lets
// us verify DOM contracts (attributes, class names, slot markers) statically
// instead of guessing from a screenshot.
//
// Usage:
//   node tools/asar.mjs list    <regex>
//   node tools/asar.mjs extract <regex> <outDir>

import { closeSync, mkdirSync, openSync, readFileSync, readSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARCHIVE = process.env.DSH_ASAR || 'D:\\dsh\\resources\\app.asar';

function readHeader() {
  const fd = openSync(ARCHIVE, 'r');
  try {
    // Layout (verified against the real archive):
    //   [0]  u32 = 4                     size of the leading pickle
    //   [4]  u32 = header pickle size
    //   [8]  u32 = header pickle size - 4
    //   [12] u32 = json byte length
    //   [16] json ...
    const prefix = Buffer.alloc(16);
    readSync(fd, prefix, 0, 16, 0);
    const headerPickleSize = prefix.readUInt32LE(4);
    const jsonSize = prefix.readUInt32LE(12);
    const json = Buffer.alloc(jsonSize);
    readSync(fd, json, 0, jsonSize, 16);
    let base = 8 + headerPickleSize;
    if (base % 4 !== 0) base += 4 - (base % 4);
    return { fd: openSync(ARCHIVE, 'r'), header: JSON.parse(json.toString('utf8')), base };
  } finally {
    closeSync(fd);
  }
}

function walk(node, prefix, out) {
  for (const [name, entry] of Object.entries(node.files || {})) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (entry.files) walk(entry, path, out);
    else out.push({ path, offset: Number(entry.offset), size: Number(entry.size) });
  }
  return out;
}

const [, , mode, pattern, outDir] = process.argv;
if (!mode || !pattern) {
  console.error('usage: node tools/asar.mjs <list|extract> <regex> [outDir]');
  process.exit(2);
}

const { fd, header, base } = readHeader();
const files = walk(header, '', []);
const regex = new RegExp(pattern);
const matches = files.filter((file) => regex.test(file.path));

if (mode === 'list') {
  for (const file of matches) console.log(`${file.size}\t${file.path}`);
  console.log(`# ${matches.length} match(es) of ${files.length} entries`);
} else if (mode === 'extract') {
  if (!outDir) {
    console.error('extract needs an output directory');
    process.exit(2);
  }
  const buffer = readFileSync(ARCHIVE);
  for (const file of matches) {
    const target = join(outDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buffer.subarray(base + file.offset, base + file.offset + file.size));
    console.log(`extracted ${file.path} (${file.size})`);
  }
  console.log(`# ${matches.length} file(s) -> ${outDir}`);
} else {
  console.error(`unknown mode: ${mode}`);
  process.exit(2);
}

closeSync(fd);
