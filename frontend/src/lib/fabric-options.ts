export type FabricSwatch = { id:string; name:string; hex_color:string; image_url:string|null; material:string; surchargePence?:number };
export const DEFAULT_FABRICS: FabricSwatch[] = [
  { id: 's1', name: 'Bourneville', hex_color: '#5C3A21', image_url: null, material: 'Velvet' },
  { id: 's2', name: 'Charcoal', hex_color: '#36454F', image_url: null, material: 'Velvet' },
  { id: 's3', name: 'Beige', hex_color: '#D4C5A9', image_url: null, material: 'Linen' },
  { id: 's4', name: 'Graphite', hex_color: '#474A51', image_url: null, material: 'Velvet' },
  { id: 's5', name: 'Mushroom', hex_color: '#C4B8A8', image_url: null, material: 'Linen' },
  { id: 's6', name: 'Cream', hex_color: '#FFFDD0', image_url: null, material: 'Bouclé' },
  { id: 's7', name: 'Cognac', hex_color: '#8B4513', image_url: null, material: 'Leather' },
  { id: 's8', name: 'Black', hex_color: '#1A1A1A', image_url: null, material: 'Leather' },
  { id: 's9', name: 'Ivory', hex_color: '#FFFFF0', image_url: null, material: 'Velvet' },
  { id: 's10', name: 'Light Grey', hex_color: '#D3D3D3', image_url: null, material: 'Fabric' },
  { id: 's11', name: 'Mink', hex_color: '#8B7355', image_url: null, material: 'Leather' },
  { id: 's12', name: 'Oatmeal', hex_color: '#D4C5A0', image_url: null, material: 'Bouclé' },
];
