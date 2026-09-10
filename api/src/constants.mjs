import { constants as httpConstants } from 'node:http2';

export const HTTP_STATUS = Object.freeze({
  OK: httpConstants.HTTP_STATUS_OK,
  BAD_REQUEST: httpConstants.HTTP_STATUS_BAD_REQUEST,
  CONFLICT: httpConstants.HTTP_STATUS_CONFLICT,
  PAYLOAD_TOO_LARGE: httpConstants.HTTP_STATUS_PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE: httpConstants.HTTP_STATUS_UNSUPPORTED_MEDIA_TYPE,
  UNAUTHORIZED: httpConstants.HTTP_STATUS_UNAUTHORIZED,
  FORBIDDEN: httpConstants.HTTP_STATUS_FORBIDDEN,
  NOT_FOUND: httpConstants.HTTP_STATUS_NOT_FOUND,
  METHOD_NOT_ALLOWED: httpConstants.HTTP_STATUS_METHOD_NOT_ALLOWED,
  TOO_MANY_REQUESTS: httpConstants.HTTP_STATUS_TOO_MANY_REQUESTS,
  SERVICE_UNAVAILABLE: httpConstants.HTTP_STATUS_SERVICE_UNAVAILABLE,
});

export const API = Object.freeze({
  HOST: '127.0.0.1',
  PORT: 8787,
  SECRET_ROUTE: '/secret',
  METHOD: 'GET',
  POST_METHOD: 'POST',
  JSON_TYPE: 'application/json',
  MAX_BODY_BYTES: 4096,
  MAX_SEARCH_LENGTH: 256,
  REQUEST_TIMEOUT_MS: 15_000,
  AUTH_SCHEME: 'Bearer',
  MIN_TOKEN_LENGTH: 32,
});

export const RESPONSE_HEADERS = Object.freeze({
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
});

export const ERROR = Object.freeze({
  FORBIDDEN: 'Forbidden',
  INVALID_METHOD: 'Method not allowed for this endpoint',
  INVALID_QUERY: 'Invalid query parameters',
  INVALID_BODY: 'Provide a JSON object containing only a nonempty field string',
  JSON_REQUIRED: 'Content-Type must be application/json',
  BODY_TOO_LARGE: 'Request body is too large',
  FIELD_NOT_FOUND: 'Field not found',
  ITEM_NOT_FOUND: 'Item not found',
  LINKED_FIELD: 'Use the original standard field instead of a linked custom field',
  UNAUTHORIZED: 'Unauthorized',
  NOT_FOUND: 'Not found',
  METHOD_NOT_ALLOWED: `Use ${API.METHOD}`,
  BUSY: 'A retrieval is already running',
  RETRIEVAL_FAILED:
    'Unable to retrieve secret. Check the configured item and restart to unlock the vault.',
  TOKEN_REQUIRED: 'A strong API token is required',
  DUPLICATE_FIELD: 'Duplicate field',
  MISSING_FIELDS: 'Required fields missing',
  EXACT_ITEM_REQUIRED: 'Exact item required',
  UNLOCK_REQUIRED: 'Start with start-api.ps1 to unlock and choose an item',
});

export const MESSAGE = Object.freeze({
  READY: `Secret API ready at http://${API.HOST}:${API.PORT}${API.SECRET_ROUTE}. Press Ctrl+C to stop.`,
  START_FAILED: `Cannot start API. Check whether port ${API.PORT} is already in use.`,
});

export const VAULT_FIELD = Object.freeze({
  CLIENT_ID: 'client_id',
  CLIENT_SECRET: 'client_secret',
});

// Paths are relative to the api folder, matching the PowerShell launch scripts.
export const FILE = Object.freeze({
  TOKEN: '.local/api-token.key',
  CLI_PACKAGE: '../node_modules/@bitwarden/cli',
  PACKAGE_MANIFEST: 'package.json',
  ENCODING: 'utf8',
});

export const CLI = Object.freeze({
  SYNC: 'sync',
  LIST: 'list',
  ITEMS: 'items',
  GET: 'get',
  ITEM: 'item',
  TIMEOUT_MS: 60_000,
  MAX_BUFFER_BYTES: 4 * 1024 * 1024,
});

export const ROUTE = Object.freeze({
  ITEMS: '/items',
  SEARCH_PARAM: 'search',
  FIELDS_ACTION: 'fields',
  ITEM_PATTERN: /^\/items\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(fields|secret)$/i,
});

export const FIELD = Object.freeze({
  TEXT: 'text',
  UNKNOWN: 'unknown',
  CUSTOM_PREFIX: 'custom.',
  LINKED_TYPE: 3,
  CUSTOM_TYPES: Object.freeze({ 0: 'text', 1: 'hidden', 2: 'boolean', 3: 'linked' }),
  STANDARD: Object.freeze([
    'login.username', 'login.password', 'login.totp', 'notes',
    'card.cardholderName', 'card.brand', 'card.number', 'card.expMonth',
    'card.expYear', 'card.code',
    'identity.title', 'identity.firstName', 'identity.middleName', 'identity.lastName',
    'identity.address1', 'identity.address2', 'identity.address3', 'identity.city',
    'identity.state', 'identity.postalCode', 'identity.country', 'identity.company',
    'identity.email', 'identity.phone', 'identity.ssn', 'identity.username',
    'identity.passportNumber', 'identity.licenseNumber',
    'sshKey.privateKey', 'sshKey.publicKey', 'sshKey.keyFingerprint',
  ]),
});

