import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { parseRowsToStudents } from './src/utils/samsExcelParser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory cache for fast repeated syncs (30s TTL to guarantee fresh data on 1-minute sync)
interface CacheEntry {
  timestamp: number;
  students: any[];
}
const urlCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000;

interface ExtractedUrls {
  fastCsvUrls: string[];
  fallbackUrls: string[];
}

function getOptimizedExportUrls(rawUrl: string): ExtractedUrls {
  const cleanUrl = rawUrl.trim().replace(/\/edit(#.*)?$/, '').replace(/\/view(#.*)?$/, '').replace(/\/preview(#.*)?$/, '');
  const fastCsvUrls: string[] = [];
  const fallbackUrls: string[] = [];

  // Extract gid if present
  const gidMatch = rawUrl.match(/[?#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  // 1. Google Sheets matching
  const sheetMatch = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) {
    const docId = sheetMatch[1];
    
    // Canonical full CSV export: exports ALL rows reliably without gviz pagination/truncation
    fastCsvUrls.push(`https://docs.google.com/spreadsheets/d/${docId}/export?format=csv${gid ? `&gid=${gid}` : ''}`);

    // Fallback: Full XLSX export
    fallbackUrls.push(`https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx${gid ? `&gid=${gid}` : ''}`);

    return { fastCsvUrls, fallbackUrls };
  }

  // 2. Google Published Sheet (/spreadsheets/d/e/2PACX-.../pubhtml or /pub)
  const pubMatch = cleanUrl.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    const pubCsv = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv${gid ? `&gid=${gid}` : ''}`;
    fastCsvUrls.push(pubCsv);
    return { fastCsvUrls, fallbackUrls };
  }

  // 3. Google Drive matching (/file/d/FILE_ID)
  const driveMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    fastCsvUrls.push(`https://drive.google.com/uc?export=download&id=${fileId}`);
    return { fastCsvUrls, fallbackUrls };
  }

  // 4. Dropbox sharing link (change dl=0 to dl=1)
  if (cleanUrl.includes('dropbox.com')) {
    const dlUrl = cleanUrl.replace(/[?&]dl=0/, '').replace(/\?/, '?dl=1&');
    fastCsvUrls.push(dlUrl.includes('dl=1') ? dlUrl : `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}dl=1`);
    return { fastCsvUrls, fallbackUrls };
  }

  // 5. OneDrive / SharePoint direct download link
  if (cleanUrl.includes('onedrive.live.com') || cleanUrl.includes('sharepoint.com') || cleanUrl.includes('1drv.ms')) {
    const dlUrl = cleanUrl.replace(/(\?|&)download=0/, '$1download=1');
    fastCsvUrls.push(dlUrl.includes('download=1') ? dlUrl : `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}download=1`);
    return { fastCsvUrls, fallbackUrls };
  }

  // 6. Generic direct URL (.xlsx, .csv, http)
  fastCsvUrls.push(cleanUrl);
  return { fastCsvUrls, fallbackUrls };
}

// Single fetch and parse with abort signal
async function attemptFetchAndParse(
  targetUrl: string, 
  signal: AbortSignal
): Promise<any[] | null> {
  try {
    const response = await fetch(targetUrl, {
      signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,*/*'
      },
      redirect: 'follow'
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Reject HTML login/error pages
    const preview = buffer.slice(0, 1000).toString('utf-8');
    if (preview.includes('<!DOCTYPE html>') || preview.includes('<html') || preview.includes('Sign in - Google Accounts')) {
      return null;
    }

    // Parse workbook with XLSX
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) return null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
      const students = parseRowsToStudents(rows);
      if (students.length > 0) {
        return students;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// True high-speed race: resolves the FIRST endpoint that successfully extracts students and aborts the others
async function raceSuccessfulFetch(urls: string[], timeoutMs = 8000): Promise<any[] | null> {
  if (urls.length === 0) return null;

  return new Promise((resolve) => {
    let hasResolved = false;
    let completedCount = 0;
    const controllers: AbortController[] = [];

    const masterTimer = setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        controllers.forEach(c => c.abort());
        resolve(null);
      }
    }, timeoutMs);

    for (const url of urls) {
      const controller = new AbortController();
      controllers.push(controller);

      attemptFetchAndParse(url, controller.signal)
        .then((students) => {
          if (!hasResolved && students && students.length > 0) {
            hasResolved = true;
            clearTimeout(masterTimer);
            controllers.forEach(c => c.abort());
            resolve(students);
          }
        })
        .catch(() => {})
        .finally(() => {
          completedCount++;
          if (completedCount === urls.length && !hasResolved) {
            hasResolved = true;
            clearTimeout(masterTimer);
            resolve(null);
          }
        });
    }
  });
}

// API endpoint to fetch and parse external Excel or Google Sheet
app.post('/api/sync-sheet', async (req, res) => {
  const startTime = Date.now();
  const { url, forceFresh } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ success: false, error: 'Please provide a valid sheet URL.' });
  }

  const cleanUrl = url.trim();

  // Fast cache hit (< 5ms response!)
  if (!forceFresh && urlCache.has(cleanUrl)) {
    const cached = urlCache.get(cleanUrl)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        count: cached.students.length,
        students: cached.students,
        fromCache: true,
        durationMs: Date.now() - startTime
      });
    }
  }

  const { fastCsvUrls, fallbackUrls } = getOptimizedExportUrls(cleanUrl);

  // Strategy 1: Race the fast CSV URLs in parallel! As soon as any completes in ~200ms, respond immediately!
  if (fastCsvUrls.length > 0) {
    const winningStudents = await raceSuccessfulFetch(fastCsvUrls, 4500);
    if (winningStudents && winningStudents.length > 0) {
      urlCache.set(cleanUrl, {
        timestamp: Date.now(),
        students: winningStudents
      });

      return res.json({
        success: true,
        count: winningStudents.length,
        students: winningStudents,
        durationMs: Date.now() - startTime
      });
    }
  }

  // Strategy 2: If fast CSV race returned empty, race fallback URLs (e.g. XLSX export)
  if (fallbackUrls.length > 0) {
    const fallbackStudents = await raceSuccessfulFetch(fallbackUrls, 6000);
    if (fallbackStudents && fallbackStudents.length > 0) {
      urlCache.set(cleanUrl, {
        timestamp: Date.now(),
        students: fallbackStudents
      });

      return res.json({
        success: true,
        count: fallbackStudents.length,
        students: fallbackStudents,
        durationMs: Date.now() - startTime
      });
    }
  }

  return res.status(422).json({
    success: false,
    error: 'Could not extract student records from the provided URL. Ensure the sheet is public ("Anyone with the link can view") and contains student column headers (Roll No, Name, Stream, Subject, etc.), or use Method 2 (Direct Excel File Upload).'
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = process.env.PORT || 3000;

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer().catch(console.error);
