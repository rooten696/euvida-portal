import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';
import type { IncomingMessage } from 'node:http';
import ipaddr from 'ipaddr.js';

export const maxRemoteImageBytes = 40 * 1024 * 1024;
const maxHtmlBytes = 1024 * 1024;

export function isPublicAddress(address: string): boolean {
  try {
    if (address.includes('%')) return false;
    const parsed = ipaddr.process(address);
    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
}

export function parseRemoteUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Use a public HTTPS image address without credentials.');
  }
  return url;
}

export async function resolvePublicTarget(url: URL, resolver = lookup) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await resolver(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Private or reserved image addresses are not allowed.');
  }
  return { hostname, ...([...addresses].sort((a, b) => a.family - b.family)[0]) };
}

export async function readBoundedBody(stream: AsyncIterable<Buffer | Uint8Array>, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.byteLength;
    if (bytes > maxBytes) throw new Error('Remote image exceeds the size limit.');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, bytes);
}

async function requestPublicUrl(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  const target = await resolvePublicTarget(url);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    // Pin the validated IP: neither redirects nor a second DNS lookup may bypass validation.
    const req = request({
      hostname: target.address,
      family: target.family,
      port: 443,
      servername: isIP(target.hostname) ? undefined : target.hostname,
      path: url.pathname + url.search,
      agent: false,
      rejectUnauthorized: true,
      signal,
      headers: {
        Host: url.host,
        Accept: 'image/webp,image/png,image/jpeg,image/gif,text/html;q=0.4',
        'Accept-Encoding': 'identity',
        'User-Agent': 'Euvida image admin import (contact: euvida@seznam.cz)',
      },
    }, resolve);
    req.on('error', reject);
    req.end();
  });
}

function extractImageUrl(html: string, baseUrl: URL): URL | null {
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return parseRemoteUrl(new URL(match[1].replace(/&amp;/g, '&'), baseUrl).href);
  }
  return null;
}

export async function downloadRemoteImage(value: string): Promise<Buffer> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Image download timed out.'));
    }, 30000);
  });
  const download = async () => {
    let url = parseRemoteUrl(value);
    if (url.hostname === 'commons.wikimedia.org' && /^\/wiki\/Special:(FilePath|Redirect\/file)\//i.test(url.pathname) && !url.searchParams.has('width')) {
      url.searchParams.set('width', '1600');
    }
    let redirects = 0;
    let extracted = false;
    while (true) {
      const response = await requestPublicUrl(url, controller.signal);
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy();
        if (++redirects > 3 || !response.headers.location) throw new Error('Invalid image redirect.');
        url = parseRemoteUrl(new URL(response.headers.location, url).href);
        continue;
      }
      if (status !== 200) {
        response.destroy();
        throw new Error(`Image download failed. HTTP ${status}`);
      }
      const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const encoding = response.headers['content-encoding'];
      if (encoding && encoding !== 'identity') {
        response.destroy();
        throw new Error('Compressed HTTP responses are not supported.');
      }
      const html = !extracted && contentType === 'text/html';
      if (!html && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(contentType)) {
        response.destroy();
        throw new Error('Unsupported image format.');
      }
      const limit = html ? maxHtmlBytes : maxRemoteImageBytes;
      if (Number(response.headers['content-length']) > limit) {
        response.destroy();
        throw new Error('Remote image exceeds the size limit.');
      }
      const buffer = await readBoundedBody(response, limit);
      if (!html) return buffer;
      const nextUrl = extractImageUrl(buffer.toString('utf8'), url);
      if (!nextUrl) throw new Error('No preview image found on the source page.');
      url = nextUrl;
      extracted = true;
    }
  };
  try {
    return await Promise.race([download(), timedOut]);
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}

