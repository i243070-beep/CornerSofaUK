import { createHash, randomUUID } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'node:os';
import { usesCloudData, readCloudBytes, writeCloudBytes } from './cloud-data';
import sharp from 'sharp';
import { readSofaImage } from './sofa-image-source';
import { recolourSofaPixels } from './sofa-colour-pixels';
import { cleanSofaMask, mergeSofaAccessory } from './sofa-mask';
import { renderSofaCutout } from './sofa-cutout';

const VERSION = 'sofa-colour-v7';
const storage = () => path.join(process.env.PRODUCT_DATA_DIR || (process.env.VERCEL ? path.join(tmpdir(), 'corner-sofa') : path.join(process.cwd(), '.local-data')), 'sofa-previews');
const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const jobs = new Map<string, Promise<string>>();
let selectionQueue: Promise<unknown> = Promise.resolve();
let modelPromise: Promise<{ model: any; processor: any; RawImage: any }> | undefined;

async function selector() {
  if (!modelPromise) modelPromise = (async () => {
    const { SamModel, AutoProcessor, RawImage, env } = await import('@huggingface/transformers');
    env.cacheDir = path.join(process.env.VERCEL ? tmpdir() : process.cwd(), '.cache', 'sofa-models');
    const [model, processor] = await Promise.all([
      SamModel.from_pretrained('Xenova/slimsam-77-uniform', { dtype: 'fp32', device: 'cpu', session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 } }),
      AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform'),
    ]);
    return { model, processor, RawImage };
  })().catch((error) => { modelPromise = undefined; throw error; });
  return modelPromise;
}

async function atomicWrite(file: string, bytes: Buffer) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, file);
}

async function sofaMask(rgb: Buffer, width: number, height: number, key: string) {
  const file = path.join(storage(), `${key}.mask.png`);
  try { return await sharp(await readFile(file)).greyscale().raw().toBuffer(); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const job = selectionQueue.catch(() => undefined).then(async () => {
    // A second colour may have arrived while the first was selecting the same sofa.
    try { return await sharp(await readFile(file)).greyscale().raw().toBuffer(); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const { model, processor, RawImage } = await selector();
    const image = new RawImage(new Uint8ClampedArray(rgb), width, height, 3);
    const pixels = width * height;
    let best: Uint8Array | undefined;
    let bestPoints: number[][] = [];
    let bestScore = -Infinity;
    let embeddings;
    // Compare two sofa shapes using the same image embedding. Lower arm prompts
    // avoid walls and foreground tables in wider corner-sofa photographs.
    const selections = [
      [[0.3, 0.4], [0.5, 0.4], [0.7, 0.4], [0.16, 0.64], [0.84, 0.64], [0.5, 0.75]],
      [[0.25, 0.5], [0.75, 0.5], [0.13, 0.65], [0.87, 0.65]],
    ];
    for (const positivePoints of selections) {
      const points = [...positivePoints, [0.5, 0.13], [0.5, 0.97]];
      const input_points = [points.map(([x, y]) => [width * x, height * y])];
      const input_labels = [[...positivePoints.map(() => 1), 0, 0]];
      const inputs = await processor(image, { input_points, input_labels });
      embeddings ??= await model.get_image_embeddings(inputs);
      const result = await model({ ...inputs, ...embeddings });
      const masks = await processor.post_process_masks(result.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
      const tensor = masks[0];
      const count = tensor.data.length / pixels;
      for (let index = 0; index < count; index++) {
        const mask = new Uint8Array(pixels);
        let covered = 0;
        let edges = 0;
        for (let p = 0; p < pixels; p++) {
          if (tensor.data[index * pixels + p]) {
            mask[p] = 255; covered++;
            const x = p % width, y = Math.floor(p / width);
            if (x < width * 0.025 || x > width * 0.975 || y < height * 0.1 || y > height * 0.95) edges++;
          }
        }
        const area = covered / pixels;
        if (area < 0.06 || area > 0.85) continue;
        const score = Number(result.iou_scores.data[index]) + Math.min(area, 0.5) * 0.3 - edges / Math.max(covered, 1);
        if (score > bestScore) { bestScore = score; best = mask; bestPoints = positivePoints; }
      }
    }
    if (!best || bestScore < 0.4) throw new Error('The sofa could not be isolated in this photo. Try a clearer, centred sofa photo or use your own colour photo.');
    const accessoryPoints = [[0.19, 0.42], [0.28, 0.44], [0.66, 0.49], [0.71, 0.46], [0.77, 0.42]];
    const retainedAccessoryPoints: number[][] = [];
    for (const point of accessoryPoints) {
      const points = [point, [0.5, 0.12], [0.5, 0.97]];
      const inputs = await processor(image, {
        input_points: [points.map(([x, y]) => [width * x, height * y])],
        input_labels: [[1, 0, 0]],
      });
      const result = await model({ ...inputs, ...embeddings });
      const masks = await processor.post_process_masks(result.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
      const tensor = masks[0];
      const count = tensor.data.length / pixels;
      const candidates = Array.from({ length: count }, (_, index) => ({ index, score: Number(result.iou_scores.data[index]) })).sort((a, b) => b.score - a.score);
      for (const candidate of candidates) {
        const mask = new Uint8Array(pixels);
        for (let p = 0; p < pixels; p++) if (tensor.data[candidate.index * pixels + p]) mask[p] = 255;
        if (mergeSofaAccessory(best, mask, width, height, point)) { retainedAccessoryPoints.push(point); break; }
      }
    }
    // Arms can be separated from cushions by a narrow seam in the selection.
    const cleaned = await cleanSofaMask(best, width, height, [...bestPoints, ...retainedAccessoryPoints, [0.15, 0.48], [0.85, 0.48], [0.1, 0.55], [0.9, 0.55], [0.1, 0.65], [0.9, 0.65]]);
    const png = await sharp(cleaned, { raw: { width, height, channels: 1 } }).blur(0.6).png().toBuffer();
    await atomicWrite(file, png);
    return sharp(png).greyscale().raw().toBuffer();
  });
  selectionQueue = job;
  return job;
}

export async function generateSofaPreview(source: string, colour: string, theme = ''): Promise<string> {
  if (!/^#[0-9a-f]{6}$/i.test(colour)) throw new Error('Select a valid sofa colour.');
  const sourceBytes = await readSofaImage(source);
  const sourceKey = hash(Buffer.concat([Buffer.from(VERSION), sourceBytes]));
  if (theme && !/^bg-[\w-]+\.(png|webp|jpg)$/i.test(theme)) throw new Error('Choose an existing room theme.');
  const themeBytes = theme ? await readFile(path.resolve(process.cwd(), '..', 'backgrounds', theme)) : undefined;
  const outputKey = hash(`${sourceKey}:${colour.toLowerCase()}:${themeBytes ? hash(themeBytes) : ''}`);
  const url = `/api/sofa-previews/${outputKey}.webp`;
  if (usesCloudData() && await readCloudBytes(`sofa-previews/${outputKey}.webp`)) return url;
  const output = path.join(storage(), `${outputKey}.webp`);
  try { await readFile(output); return url; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (jobs.has(outputKey)) return jobs.get(outputKey)!;
  if (jobs.size >= 12) throw new Error('A few colour previews are being prepared. Please try again shortly.');
  const job = (async () => {
    await mkdir(storage(), { recursive: true });
    const { data, info } = await sharp(sourceBytes, { limitInputPixels: 25000000 }).rotate().resize({ width: 1200, height: 1000, fit: 'inside', withoutEnlargement: true }).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    const mask = await sofaMask(data, info.width, info.height, sourceKey);
    const pixels = recolourSofaPixels(data, mask, colour);
    let webp: Buffer;
    if (themeBytes) {
      const cutout = await sharp(await renderSofaCutout(pixels, mask, info.width, info.height)).trim().resize({ width: 1080, height: 740, fit: 'inside' }).png().toBuffer();
      const size = await sharp(cutout).metadata();
      webp = await sharp(themeBytes).resize(1200, 1000, { fit: 'cover' }).composite([{ input: cutout, left: Math.round((1200-size.width!)/2), top: 910-size.height! }]).webp({ quality: 90 }).toBuffer();
    } else {
      webp = await sharp(Buffer.from(pixels), { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 90 }).toBuffer();
    }
    await atomicWrite(output, webp);
    if (usesCloudData()) await writeCloudBytes(`sofa-previews/${outputKey}.webp`, webp);
    return url;
  })();
  jobs.set(outputKey, job);
  try { return await job; } finally { jobs.delete(outputKey); }
}

export async function readSofaPreview(filename: string) {
  if (!/^[a-f0-9]{64}\.webp$/.test(filename)) return undefined;
  if (usesCloudData()) return await readCloudBytes(`sofa-previews/${filename}`) || await readFile(path.join(process.cwd(), 'public/images/sofa-previews', filename)).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
  try { return await readFile(path.join(storage(), filename)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}

const cutoutJobs = new Map<string, Promise<Buffer>>();

/** Reuse the catalogue's sofa selection to make a transparent placement image. */
export async function generateSofaCutout(source: string, colour?: string): Promise<Buffer> {
  if (colour && !/^#[0-9a-f]{6}$/i.test(colour)) throw new Error('Select a valid sofa colour.');
  const bytes = await readSofaImage(source);
  const sourceKey = hash(Buffer.concat([Buffer.from(VERSION), bytes]));
  const key = hash(`room-cutout-v2:${sourceKey}:${colour || 'original'}`);
  const file = path.join(storage(), `${key}.cutout.png`);
  try { return await readFile(file); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (cutoutJobs.has(key)) return cutoutJobs.get(key)!;
  if (cutoutJobs.size >= 3) throw new Error('Sofa previews are busy. Please try again shortly.');
  const job = (async () => {
    await mkdir(storage(), { recursive: true });
    const { data, info } = await sharp(bytes, { limitInputPixels: 25000000 }).rotate()
      .resize({ width: 1200, height: 1000, fit: 'inside', withoutEnlargement: true })
      .removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true });
    const mask = await sofaMask(data, info.width, info.height, sourceKey);
    const rgb = colour ? recolourSofaPixels(data, mask, colour) : data;
    const png = await renderSofaCutout(rgb, mask, info.width, info.height);
    await atomicWrite(file, png);
    return png;
  })();
  cutoutJobs.set(key, job);
  try { return await job; } finally { cutoutJobs.delete(key); }
}
