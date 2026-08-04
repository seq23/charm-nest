import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'package.json',
  'README.md',
  'PHASE_LEDGER.md',
  'VALIDATION.md',
  'wrangler.toml',
  'migrations/0001_init.sql',
  'migrations/0002_orders_fulfillment_payments.sql',
  'migrations/0003_studio_order_workflow.sql',
  'src/core/api.mjs',
  'src/core/validation.mjs',
  'src/core/store-utils.mjs',
  'src/local/server.mjs',
  'src/local/store.mjs',
  'src/cloudflare/worker.mjs',
  'src/cloudflare/store.mjs',
  'public/images/products/charmnest-buttons-pins.svg',
  'public/js/order.js',
  'public/js/studio.js',
  'dist/index.html',
  'dist/buttons-and-pins/index.html',
  'dist/custom-orders/index.html',
  'dist/studio/index.html',
  'dist/images/products/charmnest-buttons-pins.svg',
  'dist/styles/main.css',
  'dist/styles/studio.css'
];
const errors = [];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing required file: ${file}`);
}

const logoDir = path.join(root, 'public/brand/logo-options');
const logos = fs.existsSync(logoDir)
  ? fs.readdirSync(logoDir).filter(file => file.endsWith('-original.png'))
  : [];
if (logos.length !== 5) errors.push(`Expected 5 original logo PNGs; found ${logos.length}.`);

if (fs.existsSync(path.join(root, 'dist/reference'))) errors.push('Private reference directory leaked into dist.');

const publicVideoFiles = [];
for (const base of ['public', 'dist']) {
  const directory = path.join(root, base);
  if (!fs.existsSync(directory)) continue;
  walk(directory, file => {
    if (/\.(mov|mp4|m4v|avi|webm)$/iu.test(file)) publicVideoFiles.push(path.relative(root, file));
  });
}
if (publicVideoFiles.length) errors.push(`Private reference video leaked into public output: ${publicVideoFiles.join(', ')}`);

const syntaxRoots = ['src', 'scripts', 'public/js', 'tests'];
const syntaxFiles = [];
for (const base of syntaxRoots) {
  const directory = path.join(root, base);
  if (!fs.existsSync(directory)) continue;
  walk(directory, file => {
    if (/\.(m?js)$/u.test(file)) syntaxFiles.push(file);
  });
}
for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`Syntax error in ${path.relative(root, file)}: ${result.stderr.trim()}`);
}

const runtimeFiles = [];
for (const base of ['src', 'public/js', 'scripts/build.mjs', '.dev.vars.example']) {
  const target = path.join(root, base);
  if (!fs.existsSync(target)) continue;
  if (fs.statSync(target).isDirectory()) {
    walk(target, file => {
      if (/\.(m?js|html|md)$/u.test(file)) runtimeFiles.push(file);
    });
  } else {
    runtimeFiles.push(target);
  }
}
const forbiddenRuntimePatterns = [
  ['ADULT_PASSWORD_HASH', /ADULT_PASSWORD_HASH/u],
  ['Adult Admin lane', /Adult Admin/u],
  ['adult role selector', /value=["']adult["']/u],
  ['adult role authorization', /role\s*={2,3}\s*["']adult["']/u]
];
for (const file of runtimeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of forbiddenRuntimePatterns) {
    if (pattern.test(text)) errors.push(`Legacy ${label} remains in ${path.relative(root, file)}.`);
  }
}

const distFiles = [];
const distRoot = path.join(root, 'dist');
if (fs.existsSync(distRoot)) walk(distRoot, file => distFiles.push(file));

for (const file of distFiles.filter(file => /\.(html|js|css|json|svg)$/u.test(file))) {
  const text = fs.readFileSync(file, 'utf8');
  if (/\{\{[^}]+\}\}|REPLACE_WITH_REAL|TODO_STUB/u.test(text)) {
    errors.push(`Unresolved token in ${path.relative(root, file)}`);
  }
}

const htmlFiles = distFiles.filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]+)"/gu)) {
    const url = match[1];
    if (url.startsWith('/api/') || url.startsWith('/media/')) continue;
    let target = path.join(distRoot, url);
    if (url.endsWith('/')) target = path.join(target, 'index.html');
    if (!path.extname(target) && fs.existsSync(`${target}.html`)) target = `${target}.html`;
    if (!fs.existsSync(target)) errors.push(`Broken internal asset/link ${url} in ${path.relative(root, file)}`);
  }
}

if (htmlFiles.length !== 14) errors.push(`Expected 14 generated HTML pages; found ${htmlFiles.length}.`);

const customOrderHtml = path.join(root, 'dist/custom-orders/index.html');
if (fs.existsSync(customOrderHtml)) {
  const html = fs.readFileSync(customOrderHtml, 'utf8');
  for (const marker of ['productType', 'phone', 'requestedEmployee', 'isLocalOrder', 'localMethod', 'address1', 'zip']) {
    if (!html.includes(marker)) errors.push(`Custom-order page is missing required field marker: ${marker}`);
  }
  const orderScript = fs.readFileSync(path.join(root, 'public/js/order.js'), 'utf8');
  for (const marker of ['fulfillmentMethod', 'shippingAddress', 'missing', 'waitForConfirmation', 'data.payment']) {
    if (!orderScript.includes(marker)) errors.push(`Order runtime is missing required workflow marker: ${marker}`);
  }
}

const studioHtml = path.join(root, 'dist/studio/index.html');
if (fs.existsSync(studioHtml)) {
  const html = fs.readFileSync(studioHtml, 'utf8');
  if (!html.includes('CharmNest Studio')) errors.push('Studio page is missing the unified CharmNest Studio heading.');
  if (!html.includes('name="username" value="maker"')) errors.push('Studio login is missing the single fixed Maker account.');
  if (/Adult Admin|value=["']adult["']/u.test(html)) errors.push('Studio page still exposes a separate Adult lane.');
  const studioScript = fs.readFileSync(path.join(root, 'public/js/studio.js'), 'utf8');
  for (const marker of ['Unsaved changes', 'Saving…', 'Saved ✓', 'Work Queue', 'Ready', 'Paid', 'Archive', 'requestedEmployee', 'photoPlacements', 'How Drops Work']) {
    if (!studioScript.includes(marker)) errors.push(`Studio runtime is missing required workflow marker: ${marker}`);
  }
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Validation passed: ${required.length} required files, ${logos.length} original logos, ${htmlFiles.length} HTML pages, unified Maker runtime markers clean.`);

function walk(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, visit);
    else visit(file);
  }
}
