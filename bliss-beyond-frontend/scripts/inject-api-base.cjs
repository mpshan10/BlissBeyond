const fs = require('node:fs');
const path = require('node:path');

const outputRoot = path.resolve('.output/public');
const localFallback = 'http://localhost:8081';

function readProductionApiBaseUrl() {
  if (process.env.VITE_API_BASE_URL) return process.env.VITE_API_BASE_URL;

  const envPath = path.resolve('.env.production');
  if (!fs.existsSync(envPath)) return localFallback;

  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith('VITE_API_BASE_URL='));

  return line ? line.slice('VITE_API_BASE_URL='.length).trim() : localFallback;
}

function replaceInDirectory(directory, apiBaseUrl) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      replaceInDirectory(filePath, apiBaseUrl);
      continue;
    }

    if (!/\.(html?|js|css|json|svg|txt)$/i.test(entry.name)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    const updated = source.replaceAll('__BB_API_BASE_URL__', apiBaseUrl.replace(/\/+$/, ''));
    if (updated !== source) fs.writeFileSync(filePath, updated, 'utf8');
  }
}

replaceInDirectory(outputRoot, readProductionApiBaseUrl());
