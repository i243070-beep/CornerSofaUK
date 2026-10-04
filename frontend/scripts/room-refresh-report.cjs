const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const audit = path.join(root, 'artifacts/room-refresh');
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
async function main() {
  const plan = JSON.parse(await fs.readFile(path.join(audit, 'plan.json'), 'utf8'));
  const map = JSON.parse(await fs.readFile(path.join(root, 'src/data/product-room-images.json'), 'utf8'));
  const products = JSON.parse(await fs.readFile(path.join(root, '.local-data/products.json'), 'utf8'));
  const corrections = JSON.parse(await fs.readFile(path.join(audit, 'correction-prompts.json'), 'utf8'));
  const missing = plan.filter(item => !item.keep && !map[item.source]);
  if (missing.length) throw Error(`Unfinished image indices: ${missing.map(item => item.index).join(', ')}`);
  const cardSource = product => {
    const variant = product.variants.reduce((best, next) => !best || Number(next.price) < Number(best.price) ? next : best, undefined);
    return variant?.images?.[0] || product.images[0];
  };
  const summary = {
    completedAt: new Date().toISOString(),
    products: products.length,
    reviewedLeadingImages: plan.length,
    refreshedImages: Object.keys(map).length,
    retainedImages: plan.filter(item => item.keep).length,
    refreshedDefaultCards: products.filter(p => map[cardSource(p)]).length,
    retainedDefaultCards: products.filter(p => !map[cardSource(p)]).length,
    nativeOutput: '1254 × 1254 PNG masters; WebP quality 96 storefront copies. Larger source images remain in the original galleries.',
    originals: 'Original asset files and catalogue records retained.',
    generation: 'Built-in image generation; background replacement with product-preservation instructions and visual review.',
  };
  const records = plan.map(item => ({ index: item.index, titles: [...new Set(item.products.map(p => p.title))], source: item.source, image: map[item.source] || item.source, action: item.keep ? 'retained' : 'refreshed', room: item.keep ? 'Existing approved setting' : item.design, prompt: item.keep ? undefined : item.prompt, promptNote: item.promptNote, plannedPrompt: item.plannedPrompt, correctionPrompt: corrections.find(c => c.index === item.index)?.prompt }));
  await fs.writeFile(path.join(audit, 'completion.json'), JSON.stringify({ summary, images: records }, null, 2));
  await fs.writeFile(path.join(root, '../documents/sofa-room-refresh-prompts.json'), JSON.stringify({ summary, images: records }, null, 2));
  const url = image => image.startsWith('/api/sofa-previews/') ? `../../.local-data/sofa-previews/${path.basename(image)}` : `../../public${image}`;
  const cards = records.map(item => `<article data-action="${item.action}"><header><b>${escape(item.titles[0])}</b><span>${item.action}</span></header><div class="pair"><figure><img loading="lazy" src="${url(item.source)}" alt="Original"><figcaption>Original</figcaption></figure><figure><img loading="lazy" src="${url(item.image)}" alt="Reviewed room photograph"><figcaption>${escape(item.room)}</figcaption></figure></div></article>`).join('\n');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sofa room photograph review</title><style>body{margin:0;padding:28px;background:#f4f2ec;color:#26352e;font:15px system-ui}h1{font:36px Georgia}p{max-width:900px;line-height:1.6}nav{display:flex;gap:8px;margin:24px 0}button{padding:10px 18px;border:1px solid #9caa94;border-radius:20px;background:white;color:inherit;cursor:pointer}button[aria-pressed=true]{background:#324b3b;color:white}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:20px}article{padding:14px;border-radius:16px;background:white}header{display:flex;justify-content:space-between;gap:10px;min-height:38px}header span{color:#6d7964;font-size:12px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}figure{margin:0}img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:8px}figcaption{font-size:12px;margin-top:6px;color:#71796d}article[hidden]{display:none}</style><h1>Sofa room photograph review</h1><p>${summary.products} products; ${summary.refreshedImages} refreshed main and colour-option photographs; ${summary.retainedImages} attractive existing images retained. Originals are shown beside the reviewed website images.</p><nav><button aria-pressed="true" data-filter="all">All</button><button aria-pressed="false" data-filter="refreshed">Refreshed</button><button aria-pressed="false" data-filter="retained">Retained</button></nav><main class="grid">${cards}</main><script>document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('article').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.action!==button.dataset.filter)});</script></html>`;
  await fs.writeFile(path.join(audit, 'review.html'), html);
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
