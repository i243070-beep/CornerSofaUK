import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const command = 'npm run build';
const env = {};
for (const [key, value] of Object.entries(process.env)) {
  if (!Object.keys(env).some((existing) => existing.toLowerCase() === key.toLowerCase())) {
    env[key] = value;
  }
}
if (!process.env.VERCEL) {
  env.NEXT_BUILD_DIR = 'artifacts/vercel-build';
}

const result = spawnSync(command, {
  stdio: 'inherit',
  cwd: 'frontend',
  env,
  shell: true,
});

if (result.error) {
  console.error(result.error);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const manifest = process.env.VERCEL
  ? resolve('frontend', '.next', 'routes-manifest.json')
  : resolve('frontend', 'artifacts', 'vercel-build', 'routes-manifest.json');
if (!existsSync(manifest)) {
  console.error(`Expected ${manifest} after build, but it was not found.`);
  process.exit(1);
}
