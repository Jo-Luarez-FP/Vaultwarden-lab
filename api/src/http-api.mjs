import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { API, ERROR, HTTP_STATUS, RESPONSE_HEADERS } from './constants.mjs';
import { ApiError } from './api-error.mjs';
import { resolveOperation } from './routes.mjs';

const localHostPattern = new RegExp(`^${API.HOST.replaceAll('.', '\\.')}:\\d+$`);

function reply(res, status, body) {
  res.writeHead(status, RESPONSE_HEADERS);
  res.end(JSON.stringify(body));
}

function rejectError(res, error) {
  if (error instanceof ApiError) return reply(res, error.status, { error: error.message });
  reply(res, HTTP_STATUS.SERVICE_UNAVAILABLE, { error: ERROR.RETRIEVAL_FAILED });
}

function authenticate(req, expected) {
  if (req.headers.origin || !localHostPattern.test(req.headers.host ?? '')) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR.FORBIDDEN);
  }
  const actual = Buffer.from(req.headers.authorization ?? '');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR.UNAUTHORIZED);
  }
}

function createExecutor() {
  let busy = false;
  return async (res, operation) => {
    if (busy) return reply(res, HTTP_STATUS.TOO_MANY_REQUESTS, { error: ERROR.BUSY });
    busy = true;
    try { reply(res, HTTP_STATUS.OK, await operation()); }
    catch (error) { rejectError(res, error); }
    finally { busy = false; }
  };
}

export function createApi({ token, vault, fetchSecret }) {
  if (!token || token.length < API.MIN_TOKEN_LENGTH) throw new Error(ERROR.TOKEN_REQUIRED);
  const expected = Buffer.from(`${API.AUTH_SCHEME} ${token}`);
  const execute = createExecutor();
  const server = http.createServer(async (req, res) => {
    try {
      authenticate(req, expected);
      const operation = resolveOperation(req, { vault, fetchSecret });
      await execute(res, operation);
    } catch (error) { rejectError(res, error); }
  });
  server.requestTimeout = API.REQUEST_TIMEOUT_MS;
  return server;
}
