import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const studio = await readFile(new URL('../public/js/studio.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/styles/studio.css', import.meta.url), 'utf8');

test('Orders opens in the complete All Orders view', () => {
  assert.match(studio, /orderTab: 'all'/);
  assert.match(studio, /\['all', 'All Orders'\]/);
  assert.match(studio, /all: orders\.length/);
});

test('Order list is summary-first and advanced filters are visually secondary', () => {
  assert.match(studio, /<details class="studio-card order-card"/);
  assert.match(studio, /class="filter-disclosure"/);
  assert.match(studio, /Search orders/);
  assert.match(css, /Phase 1D Studio founder-flow clarity/);
  assert.match(css, /\.order-summary/);
});

test('Founder navigation prioritizes orders immediately after dashboard', () => {
  const dashboard = studio.indexOf("['dashboard', 'Dashboard']");
  const orders = studio.indexOf("['orders', 'Orders & Payments']");
  const drops = studio.indexOf("['drops', 'Drops']");
  assert.ok(dashboard >= 0 && orders > dashboard && drops > orders);
});
