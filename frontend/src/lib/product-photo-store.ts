import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { usesCloudData, readCloudBytes, writeCloudBytes } from './cloud-data';
const directory=()=>path.join(process.env.PRODUCT_DATA_DIR||path.join(process.cwd(),'.local-data'),'product-photos');
export async function saveProductPhoto(bytes:Buffer){
  const metadata=await sharp(bytes,{limitInputPixels:25000000}).metadata();
  if(!['jpeg','png','webp','avif'].includes(metadata.format||''))throw new Error('Choose a JPG, PNG, WebP or AVIF photo.');
  const photo=await sharp(bytes,{limitInputPixels:25000000}).rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).webp({quality:93}).toBuffer();
  const name=createHash('sha256').update(photo).digest('hex')+'.webp';
  if(usesCloudData()){await writeCloudBytes('product-photos/'+name,photo);return '/api/product-images/'+name;}
  await mkdir(directory(),{recursive:true});const file=path.join(directory(),name);const temporary=file+'.'+randomUUID()+'.tmp';await writeFile(temporary,photo);await rename(temporary,file);
  return '/api/product-images/'+name;
}
export async function readProductPhoto(name:string){if(!/^[a-f0-9]{64}\.webp$/.test(name))return;if(usesCloudData())return readCloudBytes('product-photos/'+name);try{return await readFile(path.join(directory(),name));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}}
