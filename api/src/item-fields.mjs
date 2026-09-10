import { ApiError } from './api-error.mjs';
import { FIELD, ERROR, HTTP_STATUS } from './constants.mjs';

function standardFields(item) {
  return FIELD.STANDARD.flatMap((selector) => {
    const value = selector.split('.').reduce((value, key) => value?.[key], item);
    if (typeof value !== 'string') return [];
    return [{ field: selector, type: FIELD.TEXT, value }];
  });
}

function customFields(item) {
  return (item.fields ?? []).map((entry) => ({
    field: `${FIELD.CUSTOM_PREFIX}${entry.name}`,
    type: FIELD.CUSTOM_TYPES[entry.type] ?? FIELD.UNKNOWN,
    value: entry.value,
    linked: entry.type === FIELD.LINKED_TYPE,
  }));
}

function allFields(item) {
  return [...standardFields(item), ...customFields(item)];
}

export function describeFields(item) {
  return allFields(item).map(({ field, type, linked }) => ({
    field,
    type,
    retrievable: !linked,
  }));
}

export function readField(item, selector) {
  const matches = allFields(item).filter(({ field }) => field === selector);
  if (!matches.length) throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR.FIELD_NOT_FOUND);
  if (matches.length > 1) throw new ApiError(HTTP_STATUS.CONFLICT, ERROR.DUPLICATE_FIELD);
  if (matches[0].linked) throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR.LINKED_FIELD);
  return { itemId: item.id, field: selector, value: matches[0].value ?? null };
}
