import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

async function zipDir(sourceDir, outPath) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  const manifestPath = path.resolve('manifest.json');
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
  const nameSlug = String(manifest.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const out = path.resolve('release', `${nameSlug}-v${manifest.version}.zip`);
  const dist = path.resolve('dist');
  if (!fs.existsSync(dist)) {
    console.error('dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }
  await zipDir(dist, out);
  console.log(`Created ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
