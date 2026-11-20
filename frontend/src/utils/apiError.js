import i18n from 'i18next';

const CODE_PATTERN = /^[A-Z0-9_]+$/;

/**
 * Resolve a backend error response (axios error or response.data) into a localized string.
 * Supports `{ errorCode }`, `{ messageCode }`, and UPPER_SNAKE_CASE `{ message }` from express-validator.
 */
export function resolveApiError(errorOrData, fallbackKey = 'common:error') {
    const data = errorOrData?.response?.data ?? errorOrData;
    const rawCode =
        data?.errorCode ||
        data?.messageCode ||
        (typeof data?.message === 'string' && CODE_PATTERN.test(data.message) ? data.message : null);

    if (rawCode) {
        const translated = i18n.t(`auth:errors.${rawCode}`);
        if (translated && translated !== `errors.${rawCode}` && translated !== `auth:errors.${rawCode}`) {
            return translated;
        }
    }

    if (typeof data?.error === 'string' && data.error) {
        return data.error;
    }

    if (fallbackKey) {
        return i18n.t(fallbackKey) || fallbackKey;
    }

    return errorOrData?.message || '';
}

/**
 * Resolve a backend success response (`{ messageCode }` or `{ message }`) into a localized string.
 */
export function resolveApiMessage(data, fallbackKey = 'common:success') {
    if (data?.messageCode) {
        const translated = i18n.t(`auth:errors.${data.messageCode}`);
        if (
            translated &&
            translated !== `errors.${data.messageCode}` &&
            translated !== `auth:errors.${data.messageCode}`
        ) {
            return translated;
        }
    }

    if (typeof data?.message === 'string' && data.message) {
        return data.message;
    }

    return fallbackKey ? i18n.t(fallbackKey) || fallbackKey : '';
}
