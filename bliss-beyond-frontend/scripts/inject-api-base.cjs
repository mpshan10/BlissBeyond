const fs = require('node:fs');
const path = require('node:path');

const outputRoot = path.resolve('.output/public');

function readProductionApiBaseUrl() {
  if (process.env.VITE_API_BASE_URL?.trim()) return process.env.VITE_API_BASE_URL.trim();

  const envPath = path.resolve('.env.production');
  if (!fs.existsSync(envPath)) {
    throw new Error('VITE_API_BASE_URL is required for production builds.');
  }

  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith('VITE_API_BASE_URL='));

  const apiBaseUrl = line ? line.slice('VITE_API_BASE_URL='.length).trim() : '';
  if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL is required for production builds.');
  return apiBaseUrl;
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
