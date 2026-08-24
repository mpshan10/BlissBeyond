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

function readOptionalEnvValue(name) {
  if (process.env[name]?.trim()) return process.env[name].trim();
  const envPath = path.resolve('.env.production');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${name}=`));
  return line ? line.slice(`${name}=`.length).trim() : '';
}

function replaceInDirectory(directory, token, replacement) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      replaceInDirectory(filePath, token, replacement);
      continue;
    }

    if (!/\.(html?|js|css|json|svg|txt)$/i.test(entry.name)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    const updated = source.replaceAll(token, replacement);
    if (updated !== source) fs.writeFileSync(filePath, updated, 'utf8');
  }
}

replaceInDirectory(outputRoot, '__BB_API_BASE_URL__', readProductionApiBaseUrl().replace(/\/+$/, ''));
replaceInDirectory(outputRoot, '__BB_GOOGLE_CLIENT_ID__', readOptionalEnvValue('VITE_GOOGLE_CLIENT_ID'));
