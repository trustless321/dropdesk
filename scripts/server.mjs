import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const projectRootPrefix = projectRoot.endsWith(sep)
  ? projectRoot
  : `${projectRoot}${sep}`;
const port = Number.parseInt(process.env.PORT || '4173', 10);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function getFilePath(requestUrl) {
  const urlPath = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = normalize(join(projectRoot, requestedPath));

  if (filePath !== projectRoot && !filePath.startsWith(projectRootPrefix)) {
    return null;
  }

  return filePath;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' });
    response.end('Method Not Allowed');
    return;
  }

  let filePath;

  try {
    filePath = getFilePath(request.url || '/');
    if (!filePath) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      throw new Error('Not a file');
    }
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`DropDesk is running at http://localhost:${port}`);
});
