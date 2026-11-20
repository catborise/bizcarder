import i18n from '../../i18n';
import { resolveApiError, resolveApiMessage } from '../../utils/apiError';

describe('apiError utilities', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('en');
    });

    it('resolves backend errorCode via auth:errors namespace', () => {
        const err = { response: { data: { errorCode: 'INVALID_CREDENTIALS' } } };
        expect(resolveApiError(err)).toBe('Invalid username or password.');
    });

    it('resolves express-validator UPPER_SNAKE_CASE message code', () => {
        const err = { response: { data: { message: 'PASSWORD_TOO_SHORT' } } };
        expect(resolveApiError(err)).toBe('Password must be at least 8 characters.');
    });

    it('falls back to legacy error string when no known errorCode is present', () => {
        const err = { response: { data: { error: 'Legacy message' } } };
        expect(resolveApiError(err)).toBe('Legacy message');
    });

    it('falls back to provided fallbackKey when error payload is empty', () => {
        expect(resolveApiError({}, 'common:cancel')).toBe('Cancel');
    });

    it('resolves backend messageCode in resolveApiMessage', () => {
        expect(resolveApiMessage({ messageCode: 'TWO_FACTOR_ENABLED' })).toBe(
            'Two-factor authentication enabled successfully.',
        );
        expect(resolveApiMessage({ messageCode: 'TRASH_EMPTIED' })).toBe('Trash emptied successfully.');
    });

    it('falls back to raw message or fallbackKey in resolveApiMessage', () => {
        expect(resolveApiMessage({ message: 'Custom success' })).toBe('Custom success');
        expect(resolveApiMessage({}, 'common:save')).toBe('Save');
    });
});
