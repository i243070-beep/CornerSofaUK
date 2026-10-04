const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const audit = path.join(root, 'artifacts/room-refresh');
const assets = path.join(root, 'public/images/catalogue-rooms');
const manifestFile = path.join(root, 'src/data/product-room-images.json');
async function main() {
  const inventory = JSON.parse(await fs.readFile(path.join(audit, 'inventory.json'), 'utf8'));
  const [action, indexArg, file] = process.argv.slice(2);
  await fs.mkdir(assets, { recursive: true });
  await fs.mkdir(path.dirname(manifestFile), { recursive: true });
  let manifest = {};
  try { manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8')); } catch(e) { if(e.code !== 'ENOENT') throw e; }
  if (action === 'save') {
    const item = inventory[Number(indexArg)];
    if (!item || !file) throw Error('Supply inventory index and generated image file.');
    const name = `${String(item.index).padStart(3, '0')}-${path.basename(item.source, path.extname(item.source)).slice(0, 24)}.webp`;
    const meta = await sharp(file).metadata();
    if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 1000) throw Error('Generated image is too small.');
    await fs.copyFile(file, path.join(audit, `master-${item.index}.png`));
    await sharp(file).webp({ quality: 96, effort: 6 }).toFile(path.join(assets, name));
    const record = { source: item.source, image: `/images/catalogue-rooms/${name}`, index: item.index, width: meta.width, height: meta.height, titles: [...new Set(item.products.map(p => p.title))], generatedFile: file };
    await fs.writeFile(path.join(audit, `result-${item.index}.json`), JSON.stringify(record, null, 2));
    console.log(JSON.stringify(record));
  } else if (action === 'publish') {
    const indices = indexArg.split(',').map(Number);
    for (const i of indices) {
      const record = JSON.parse(await fs.readFile(path.join(audit, `result-${i}.json`), 'utf8'));
      await fs.access(path.join(root, 'public', record.image));
      manifest[record.source] = record.image;
    }
    await fs.writeFile(`${manifestFile}.tmp`, JSON.stringify(manifest, null, 2) + '\n');
    await fs.rename(`${manifestFile}.tmp`, manifestFile);
    console.log(`Published ${indices.length} reviewed images; total ${Object.keys(manifest).length}.`);
  } else if (action === 'sheet') {
    const indices = indexArg.split(',').map(Number);
    const layers = [];
    for (let n=0; n<indices.length; n++) {
      const i=indices[n], record=JSON.parse(await fs.readFile(path.join(audit, `result-${i}.json`), 'utf8'));
      const thumb=await sharp(path.join(root,'public',record.image)).resize(300,300,{fit:'contain',background:'#eeeae4'}).png().toBuffer();
      const label=Buffer.from(`<svg width="300" height="26"><rect width="300" height="26" fill="white"/><text x="8" y="18" font-size="12" font-family="Arial">${i}: ${record.titles[0].slice(0,40).replace(/[&<>]/g,'')}</text></svg>`);
      const x=n%4*308,y=Math.floor(n/4)*334;
      layers.push({input:thumb,left:x,top:y},{input:label,left:x,top:y+300});
    }
    const file=path.join(audit,`after-${indices[0]}.jpg`);
    await sharp({create:{width:1232,height:Math.ceil(indices.length/4)*334,channels:3,background:'#d9d5cb'}}).composite(layers).jpeg({quality:94}).toFile(file);
    console.log(file);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
