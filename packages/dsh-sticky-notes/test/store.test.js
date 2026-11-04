import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyState, normalizeItems } from '../lib/index.js';

const NOW = '2026-01-01T00:00:00.000Z';

function row(overrides = {}) {
  return {
    id: 'note_0001',
    kind: 'todo',
    text: '  buy milk  ',
    done: true,
    pinned: false,
    color: 1,
    createdAt: '2026-01-02T03:04:05.000Z',
    updatedAt: '2026-01-02T03:04:05.000Z',
    ...overrides,
  };
}

test('empty state is a versioned, revisioned empty board', () => {
  assert.deepEqual(emptyState(), { version: 1, revision: 0, updatedAt: null, items: [] });
});

test('keeps well-formed rows and trims text', () => {
  const [item] = normalizeItems([row()], NOW);
  assert.equal(item.text, 'buy milk');
  assert.equal(item.kind, 'todo');
  assert.equal(item.done, true);
  assert.equal(item.color, 1);
});

test('drops malformed rows without losing the valid ones', () => {
  const items = normalizeItems([
    row(),
    null,
    'text',
    row({ id: 'ab' }),
    row({ id: 'note_0002', text: '   ' }),
    row({ id: 'note_0003', text: 42 }),
    row({ id: 'note_0001' }),
  ], NOW);
  assert.deepEqual(items.map((item) => item.id), ['note_0001']);
});

test('clamps color and forces notes to be undone', () => {
  const [high, low, note] = normalizeItems([
    row({ id: 'note_0001', color: 9 }),
    row({ id: 'note_0002', color: -4 }),
    row({ id: 'note_0003', kind: 'note', done: true }),
  ], NOW);
  assert.equal(high.color, 3);
  assert.equal(low.color, 0);
  assert.equal(note.kind, 'note');
  assert.equal(note.done, false);
});

test('falls back to the provided clock for unreadable dates', () => {
  const [item] = normalizeItems([row({ createdAt: 'nope', updatedAt: 'nope' })], NOW);
  assert.equal(item.createdAt, NOW);
  assert.equal(item.updatedAt, NOW);
});

test('caps text length and item count', () => {
  const long = normalizeItems([row({ text: 'x'.repeat(5000) })], NOW)[0];
  assert.equal(long.text.length, 4000);

  const many = Array.from({ length: 250 }, (_, index) => row({
    id: `note_${String(index).padStart(4, '0')}`,
    text: `item ${index}`,
  }));
  assert.equal(normalizeItems(many, NOW).length, 200);
});

test('rejects a non-array document', () => {
  assert.deepEqual(normalizeItems(undefined, NOW), []);
  assert.deepEqual(normalizeItems({}, NOW), []);
});
