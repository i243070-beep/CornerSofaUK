export function isSofaPreviewUrl(value: string) {
  return /^\/(?:api|images)\/sofa-previews\/[a-f0-9]{64}\.webp\/?$/.test(value);
}

const colours: Array<[string, string]> = [
  ['Black', '#242424'], ['Charcoal', '#484b47'], ['Grey', '#969b96'], ['Light grey', '#cbccc7'],
  ['White', '#ffffff'], ['Cream', '#ece6d8'], ['Beige', '#d4c5a9'], ['Brown', '#75452e'],
  ['Olive green', '#6a7358'], ['Green', '#2c864a'], ['Navy blue', '#263f65'], ['Blue', '#497fbd'],
  ['Teal', '#268c91'], ['Red', '#be3737'], ['Burgundy', '#713342'], ['Pink', '#df97af'],
  ['Purple', '#88549e'], ['Mustard', '#c6a542'], ['Orange', '#db8841'],
];

export function suggestColourName(hex: string) {
  const rgb = (value: string) => [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16));
  const target = rgb(hex);
  let nearest = colours[0][0];
  let distance = Infinity;
  for (const [name, colour] of colours) {
    const candidate = rgb(colour).reduce((sum, channel, index) => sum + (channel - target[index]) ** 2, 0);
    if (candidate < distance) { nearest = name; distance = candidate; }
  }
  return nearest;
}
