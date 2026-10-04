import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const command = 'npm run build';
const env = {};
for (const [key, value] of Object.entries(process.env)) {
  if (!Object.keys(env).some((existing) => existing.toLowerCase() === key.toLowerCase())) {
    env[key] = value;
  }
}
env.NEXT_BUILD_DIR = 'artifacts/vercel-build';

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

const source = resolve('frontend', 'artifacts', 'vercel-build');
const target = resolve('.next');
if (!existsSync(source)) {
  console.error('Expected frontend/.next after build, but it was not found.');
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
