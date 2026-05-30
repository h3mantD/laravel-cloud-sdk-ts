import { spawn } from 'node:child_process';

const minimumNodeMajor = 20;
const currentNodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);

if (currentNodeMajor < minimumNodeMajor) {
  console.log(`Skipping @arethetypeswrong/cli on Node ${process.versions.node}; it requires Node ${minimumNodeMajor} or newer.`);
  process.exit(0);
}

await run('npm', [
  'exec',
  '--yes',
  '--package',
  '@arethetypeswrong/cli@0.18.3',
  '--',
  'attw',
  '--pack',
  '.',
  '--profile',
  'strict',
  '--format',
  'table',
  '--no-summary',
  '--no-emoji',
  '--no-color',
]);

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} exited with code ${code}`));
    });
  });
}
