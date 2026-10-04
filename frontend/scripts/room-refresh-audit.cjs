const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'artifacts/room-refresh');
async function run() {
  const inventory = JSON.parse(await fs.readFile(path.join(dir, 'inventory.json'), 'utf8'));
  for (let start = 0; start < inventory.length; start += 20) {
    const layers = [];
    for (let i = start; i < Math.min(start + 20, inventory.length); i++) {
      const item = inventory[i];
      const file = item.source.startsWith('/api/') ? path.join(root, '.local-data/sofa-previews', path.basename(item.source)) : path.join(root, 'public', item.source);
      const { width, height } = await sharp(file).metadata();
      Object.assign(item, { index: i, file, width, height });
      const thumb = await sharp(file).resize(240, 210, { fit: 'contain', background: '#eeeae4' }).png().toBuffer();
      const label = `${i} | ${item.products[0].title.slice(0, 35)}`.replace(/[&<>]/g, '');
      const caption = Buffer.from(`<svg width="240" height="36"><rect width="240" height="36" fill="white"/><text x="6" y="18" font-size="11" font-family="Arial">${label}</text><text x="6" y="31" font-size="10" font-family="Arial">${width} × ${height} · ${(item.products.find(p=>p.color)?.color || '').replace(/[&<>]/g, '')}</text></svg>`);
      const x = ((i - start) % 5) * 248, y = Math.floor((i - start) / 5) * 254;
      layers.push({ input: thumb, left: x, top: y }, { input: caption, left: x, top: y + 210 });
    }
    await sharp({ create: { width: 1240, height: 1016, channels: 3, background: '#ddd8cf' } }).composite(layers).jpeg({ quality: 90 }).toFile(path.join(dir, `before-${start}.jpg`));
  }
  await fs.writeFile(path.join(dir, 'inventory.json'), JSON.stringify(inventory, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
