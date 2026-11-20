const { escapeHtml } = require('../../utils/mailer');

describe('mailer HTML sanitization', () => {
    test('escapes HTML special characters to prevent injection', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(escapeHtml("O'Reilly & Sons")).toBe('O&#39;Reilly &amp; Sons');
    });

    test('handles null and undefined safely', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });
});
