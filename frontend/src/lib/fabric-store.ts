import { isDatabaseConfigured, sql } from './db';
import { readBuilderRecord } from './sofa-builder/server';
import { DEFAULT_FABRICS, type FabricSwatch } from './fabric-options';
export async function getFabricSwatches(): Promise<FabricSwatch[]> {
  const base: FabricSwatch[] = isDatabaseConfigured ? await sql`SELECT id, name, hex_color, image_url, material FROM swatches ORDER BY material,name` as FabricSwatch[] : DEFAULT_FABRICS;
  const custom = await readBuilderRecord<FabricSwatch[]>('fabrics') || [];
  return [...new Map([...base,...custom].map(s=>[s.id,{...s,surchargePence:s.surchargePence||0}])).values()];
}
