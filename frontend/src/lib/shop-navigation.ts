export const SHOP_CATEGORIES = [
  { category: 'Sofa Sets', label: '3+2 seater sets', image: '/images/catalogue-rooms/090-5c9cd346c1c0bafa8e6b8938.webp', families: ['Salone', 'Ashton', 'Hannah', 'Lily', 'Malibu', 'Nova'] },
  { category: 'Corner', label: 'Corner sofas', image: '/images/catalogue/a11060d356fdd0b0dff054ed.webp', families: ['Olympia', 'Verona', 'Lily', 'Ashton', 'Salone', 'Malibu'] },
  { category: '2-Seater', label: '2-seater sofas', image: '/images/catalogue-rooms/027-71994f42d9b65d40f8a7d5c2.webp', families: ['Verona', 'Salone', 'Ashton', 'Malibu'] },
  { category: '3-Seater', label: '3-seater sofas', image: '/images/catalogue-rooms/089-9f8b66ab88cc03355c24dc19.webp', families: ['Salone', 'Verona', 'Ashton', 'Malibu'] },
  { category: 'U-Shape', label: 'U-shape sofas', image: '/images/catalogue-rooms/093-78b583e58c0893e59241b5a2.webp', families: ['Salone', 'Lily', 'Ashton', 'Bishop'] },
  { category: 'Recliner', label: 'Recliner sofas', image: '/images/catalogue-rooms/030-4e450b8b77d832e79eec5490.webp', families: ['Nova', 'Hannah', 'Orlando', 'Roma', 'Oxford'] },
  { category: 'Sofa Bed', label: 'Sofa beds', image: '/images/catalogue-rooms/134-24ef63e9ffb0ca0d1593f6ea.webp', families: ['Verona', '3-in-1'] },
  { category: 'Armchairs', label: 'Armchairs', image: '/images/catalogue-rooms/077-fc2eba4330e728c9d526b4b8.webp', families: ['Verona', 'Roma'] },
  { category: 'Footstools', label: 'Footstools', image: '/images/catalogue-rooms/022-17b99dd49129ba6c82a46c45.webp', families: ['Lily'] },
];

export const categoryHref = (category: string) => `/products?category=${encodeURIComponent(category)}`;
