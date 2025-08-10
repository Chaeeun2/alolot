/*
  Generate dynamic sitemap.xml by reading Firestore via REST API.
  - Requires public read access on `projects` (already enabled in firestore.rules)
  - Uses REACT_APP_FIREBASE_PROJECT_ID from env
*/

const fs = require('fs');
const path = require('path');

async function ensureFetch() {
  if (typeof fetch === 'undefined') {
    const nodeFetch = await import('node-fetch');
    global.fetch = nodeFetch.default;
  }
}

function getEnv(name, fallback) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

function extractDocIdFromName(name) {
  const parts = name.split('/');
  return parts[parts.length - 1];
}

function parseTimestamp(field) {
  if (!field) return null;
  if (field.timestampValue) return field.timestampValue;
  if (field.stringValue) return field.stringValue;
  return null;
}

function readString(field) {
  if (!field) return undefined;
  if (field.stringValue) return field.stringValue;
  return undefined;
}

function readArray(field) {
  if (!field || !field.arrayValue || !Array.isArray(field.arrayValue.values)) return [];
  return field.arrayValue.values;
}

function collectImages(fields) {
  const images = new Set();
  const thumb = readString(fields.thumbnailUrl);
  const main = readString(fields.mainImageUrl);
  if (thumb) images.add(thumb);
  if (main) images.add(main);
  const detailMedia = readArray(fields.detailMedia);
  for (const item of detailMedia) {
    const obj = item.mapValue && item.mapValue.fields ? item.mapValue.fields : undefined;
    if (!obj) continue;
    const type = readString(obj.type);
    const url = readString(obj.url);
    if (type === 'image' && url) images.add(url);
  }
  return Array.from(images);
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\'/g, '&apos;');
}

async function fetchProjects(projectId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/projects?pageSize=1000`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch projects: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const docs = Array.isArray(json.documents) ? json.documents : [];
  return docs.map((doc) => {
    const id = extractDocIdFromName(doc.name);
    const fields = doc.fields || {};
    const lastmod = parseTimestamp(fields.updatedAt) || parseTimestamp(fields.createdAt);
    const images = collectImages(fields);
    return { id, lastmod, images };
  });
}

function buildSitemap(baseUrl, staticPaths, projectEntries) {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ` +
    `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

  const urls = [];

  for (const { loc, changefreq, priority } of staticPaths) {
    urls.push(
      `<url>` +
        `<loc>${escapeXml(new URL(loc, baseUrl).href)}</loc>` +
        (changefreq ? `<changefreq>${changefreq}</changefreq>` : '') +
        (priority ? `<priority>${priority}</priority>` : '') +
      `</url>`
    );
  }

  for (const p of projectEntries) {
    const loc = `${baseUrl.replace(/\/$/, '')}/projects/${encodeURIComponent(p.id)}`;
    const lastmodTag = p.lastmod ? `<lastmod>${escapeXml(new Date(p.lastmod).toISOString())}</lastmod>` : '';
    const imageTags = (p.images || []).map((img) => `
      <image:image>
        <image:loc>${escapeXml(img)}</image:loc>
      </image:image>`).join('');
    urls.push(
      `<url>` +
        `<loc>${escapeXml(loc)}</loc>` +
        lastmodTag +
        imageTags +
      `</url>`
    );
  }

  return header + '\n' + urls.join('\n') + '\n</urlset>\n';
}

async function main() {
  try {
    await ensureFetch();
    const projectId = getEnv('REACT_APP_FIREBASE_PROJECT_ID');
    if (!projectId) {
      throw new Error('REACT_APP_FIREBASE_PROJECT_ID is not defined');
    }
    const baseUrl = getEnv('PUBLIC_BASE_URL', 'https://alolot.kr');
    const projects = await fetchProjects(projectId);
    const staticPaths = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/about', changefreq: 'monthly', priority: '0.6' },
      { loc: '/projects', changefreq: 'daily', priority: '0.8' },
    ];
    const xml = buildSitemap(baseUrl, staticPaths, projects);
    const outPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    console.log(`sitemap.xml generated with ${projects.length} project URLs at ${outPath}`);
  } catch (err) {
    console.error('Failed to generate dynamic sitemap, falling back to static:', err.message);
    // Do not fail the build; keep existing sitemap if any
  }
}

main();


