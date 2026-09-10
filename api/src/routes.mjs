import { API, ERROR, HTTP_STATUS, ROUTE } from './constants.mjs';
import { ApiError } from './api-error.mjs';

function requireMethod(req, method) {
  if (req.method !== method) {
    throw new ApiError(HTTP_STATUS.METHOD_NOT_ALLOWED, ERROR.INVALID_METHOD);
  }
}

function rejectQuery(url) {
  if (url.search) throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.INVALID_QUERY);
}

async function readSelector(req) {
  const contentType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (contentType !== API.JSON_TYPE) {
    throw new ApiError(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE, ERROR.JSON_REQUIRED);
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= API.MAX_BODY_BYTES) chunks.push(chunk);
  }
  if (size > API.MAX_BODY_BYTES) {
    throw new ApiError(HTTP_STATUS.PAYLOAD_TOO_LARGE, ERROR.BODY_TOO_LARGE);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.INVALID_BODY); }
  if (!body || typeof body.field !== 'string' || !body.field.trim()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.INVALID_BODY);
  }
  if (Object.keys(body).length !== 1) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.INVALID_BODY);
  }
  return body.field;
}

function searchOperation(req, url, vault) {
  requireMethod(req, API.METHOD);
  const keys = [...url.searchParams.keys()];
  if (keys.some((key) => key !== ROUTE.SEARCH_PARAM) || keys.length > 1) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.INVALID_QUERY);
  }
  const search = url.searchParams.get(ROUTE.SEARCH_PARAM) ?? '';
  if (search.length > API.MAX_SEARCH_LENGTH) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.INVALID_QUERY);
  }
  return () => vault.search(search);
}

export function resolveOperation(req, { vault, fetchSecret }) {
  const url = new URL(req.url, `http://${API.HOST}:${API.PORT}`);
  if (req.url === API.SECRET_ROUTE && fetchSecret) {
    requireMethod(req, API.METHOD);
    return fetchSecret;
  }
  if (url.pathname === ROUTE.ITEMS && vault) return searchOperation(req, url, vault);
  const match = ROUTE.ITEM_PATTERN.exec(url.pathname);
  if (!match || !vault) throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR.NOT_FOUND);
  rejectQuery(url);
  const [, itemId, action] = match;
  if (action === ROUTE.FIELDS_ACTION) {
    requireMethod(req, API.METHOD);
    return () => vault.fields(itemId);
  }
  requireMethod(req, API.POST_METHOD);
  return async () => vault.secret(itemId, await readSelector(req));
}
