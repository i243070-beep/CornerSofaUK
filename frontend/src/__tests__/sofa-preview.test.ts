// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isSofaPreviewUrl, suggestColourName } from '../lib/sofa-preview';
import { recolourSofaPixels } from '../lib/sofa-colour-pixels';
import { isPublicImageAddress } from '../lib/sofa-image-source';

describe('saved sofa colour previews', () => {
  it('recognises only local, content-addressed WebP preview links', () => {
    const url = `/api/sofa-previews/${'a1'.repeat(32)}.webp`;
    expect(isSofaPreviewUrl(url)).toBe(true);
    expect(isSofaPreviewUrl(`${url}/`)).toBe(true);
    expect(isSofaPreviewUrl(url.replace('/api/', '/images/'))).toBe(true);
    for (const invalid of ['', '/images/sofa.webp', `${url}?color=red`, `${url}.svg`, url.replace('.webp', '.png'), url.replace('a1', 'ZZ'), `https://example.com${url}`, '//example.com/sofa.webp', '/api/sofa-previews/../secret.webp']) {
      expect(isSofaPreviewUrl(invalid), invalid).toBe(false);
    }
  });

  it('suggests useful names for chosen swatches without requiring manual colour names', () => {
    expect(suggestColourName('#d4c5a9')).toBe('Beige');
    expect(suggestColourName('#497fbd')).toBe('Blue');
    expect(suggestColourName('#497FBD')).toBe('Blue');
    expect(suggestColourName('#6a7358')).toBe('Olive green');
    expect(suggestColourName('#263f65')).toBe('Navy blue');
    expect(suggestColourName('#fffffe')).toBe('White');
  });
});

describe('masked sofa recolouring', () => {
  it('changes selected upholstery while preserving the background and original inputs', () => {
    const rgb = new Uint8Array([200, 140, 80, 220, 180, 130, 12, 35, 60]);
    const mask = new Uint8Array([255, 255, 0]);
    const original = rgb.slice();
    const output = recolourSofaPixels(rgb, mask, '#497fbd');

    expect(output.slice(0, 6)).not.toEqual(original.slice(0, 6));
    expect(output.slice(6)).toEqual(original.slice(6));
    expect(output[2]).toBeGreaterThan(output[0]);
    expect(output[5]).toBeGreaterThan(output[3]);
    expect(rgb).toEqual(original);
    expect(mask).toEqual(new Uint8Array([255, 255, 0]));
    expect(output).not.toBe(rgb);
  });

  it('retains increasing shadow and highlight detail on the recoloured fabric', () => {
    const output = recolourSofaPixels(new Uint8Array([45, 45, 45, 110, 110, 110, 180, 180, 180]), new Uint8Array([255, 255, 255]), '#497fbd');
    for (const channel of [0, 1, 2]) {
      expect(output[channel]).toBeLessThan(output[channel + 3]);
      expect(output[channel + 3]).toBeLessThan(output[channel + 6]);
    }
  });

  it('blends a soft mask edge instead of recolouring it as solid upholstery', () => {
    const rgb = new Uint8Array([160, 140, 120, 160, 140, 120]);
    const soft = recolourSofaPixels(rgb, new Uint8Array([255, 128]), '#497fbd');
    for (const channel of [0, 1, 2]) {
      expect(soft[channel + 3]).toBeGreaterThanOrEqual(Math.min(rgb[channel], soft[channel]));
      expect(soft[channel + 3]).toBeLessThanOrEqual(Math.max(rgb[channel], soft[channel]));
    }
    expect(soft.slice(3)).not.toEqual(soft.slice(0, 3));
  });

  it('rejects mismatched dimensions, invalid colours, and photos without a selected sofa', () => {
    expect(() => recolourSofaPixels(new Uint8Array([1, 2]), new Uint8Array([255]), '#497fbd')).toThrow(/Invalid/);
    expect(() => recolourSofaPixels(new Uint8Array([1, 2, 3]), new Uint8Array([255]), 'blue')).toThrow(/Invalid/);
    expect(() => recolourSofaPixels(new Uint8Array([1, 2, 3]), new Uint8Array([0]), '#497fbd')).toThrow(/could not be selected/);
  });
});

describe('remote sofa image address restrictions', () => {
  it.each(['0.0.0.0', '10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.168.1.1', '100.64.0.1', '100.127.255.255', '198.18.0.1', '224.0.0.1', '255.255.255.255', '::', '::1', '::ffff:127.0.0.1', '::ffff:8.8.8.8', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1', 'localhost', 'not-an-address'])(
    'rejects nonpublic image address %s', (address) => expect(isPublicImageAddress(address)).toBe(false),
  );

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111', '2001:4860:4860::8888'])(
    'allows public image address %s', (address) => expect(isPublicImageAddress(address)).toBe(true),
  );
});
