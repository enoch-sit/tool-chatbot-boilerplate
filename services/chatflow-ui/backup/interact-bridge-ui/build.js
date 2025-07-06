import fs from 'fs';
import gracefulFs from 'graceful-fs';
gracefulFs.gracefulify(fs);

async function runBuild() {
  try {
    const { build } = await import('vite');

    await build();

    console.log('Build completed successfully.');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
}

runBuild();
