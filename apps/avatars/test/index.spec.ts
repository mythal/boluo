import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

const avatarWorker = exports.default;

describe('avatar worker', () => {
  it('requires a name', async () => {
    const response = await avatarWorker.fetch('https://avatars.example.com/');

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).toBe('Please provide a name');
  });

  it('ignores favicon requests', async () => {
    const response = await avatarWorker.fetch('https://avatars.example.com/favicon.ico');

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('renders a deterministic SVG', async () => {
    const url = 'https://avatars.example.com/alice?size=96';
    const firstResponse = await avatarWorker.fetch(url);
    const secondResponse = await avatarWorker.fetch(url);
    const firstSvg = await firstResponse.text();
    const secondSvg = await secondResponse.text();

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8');
    expect(firstResponse.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(firstResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(firstSvg).toBe(secondSvg);
    expect(firstSvg).toMatch(/^<svg /);
    expect(firstSvg).toContain('width="96"');
    expect(firstSvg).toContain('height="96"');
  });

  it('varies palettes while keeping avatars square', async () => {
    const svgs = await Promise.all(
      Array.from({ length: 32 }, async (_, index) => {
        const response = await avatarWorker.fetch(`https://avatars.example.com/diversity-${index}`);
        return response.text();
      }),
    );
    const colors = new Set(
      svgs.flatMap((svg) => Array.from(svg.matchAll(/#[0-9A-F]{6}/g), ([color]) => color)),
    );
    const maskRectAttributes = svgs.map(
      (svg) => svg.match(/<mask[^>]*>\s*<rect([^>]*)>/)?.[1] ?? '',
    );

    expect(new Set(svgs).size).toBeGreaterThanOrEqual(Math.floor(svgs.length * 0.9));
    expect(colors.size).toBeGreaterThan(10);
    expect(maskRectAttributes.every((attributes) => !attributes.includes('rx='))).toBe(true);
    const symbolSvg = svgs.find((svg) => svg.includes('data-avatar-kind="symbol"'));
    expect(symbolSvg).toContain('<path');
    expect(symbolSvg).toMatch(
      /<path[^>]+transform="translate\([^)]*\) rotate\([^)]* 50 50\) translate\(50 50\) scale\([^)]*\) translate\(-50 -50\)"/,
    );
    expect(symbolSvg).not.toContain('<text');
  });

  it('uses the default size when the query is invalid', async () => {
    const response = await avatarWorker.fetch('https://avatars.example.com/bob?size=large');
    const svg = await response.text();

    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
  });

  it('normalizes a trailing slash', async () => {
    const withoutSlash = await avatarWorker.fetch('https://avatars.example.com/carol');
    const withSlash = await avatarWorker.fetch('https://avatars.example.com/carol/');

    expect(await withSlash.text()).toBe(await withoutSlash.text());
  });

  it('supports HEAD without returning the SVG body', async () => {
    const response = await avatarWorker.fetch(
      new Request('https://avatars.example.com/dave', { method: 'HEAD' }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8');
    expect(await response.text()).toBe('');
  });

  it('rejects methods that cannot be cached', async () => {
    const response = await avatarWorker.fetch(
      new Request('https://avatars.example.com/eve', { method: 'POST' }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
    expect(await response.text()).toBe('Method not allowed');
  });
});
