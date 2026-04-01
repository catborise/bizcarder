const { parseCSV } = require('../../controllers/importController');

describe('parseCSV', () => {
    test('parses simple CSV correctly', () => {
        const csv = 'name,email,phone\nJohn,john@test.com,555-1234\nJane,jane@test.com,555-5678';
        const rows = parseCSV(csv);
        expect(rows).toHaveLength(3);
        expect(rows[0]).toEqual(['name', 'email', 'phone']);
        expect(rows[1]).toEqual(['John', 'john@test.com', '555-1234']);
    });
    test('handles quoted fields with commas', () => {
        const rows = parseCSV('name,company\nJohn,"Acme, Inc."');
        expect(rows[1][1]).toBe('Acme, Inc.');
    });
    test('handles double-quoted escapes', () => {
        const rows = parseCSV('name,note\nJohn,"He said ""hello"""');
        expect(rows[1][1]).toBe('He said "hello"');
    });
    test('handles embedded newlines in quoted fields', () => {
        const rows = parseCSV('name,address\nJohn,"123 Main St\nSuite 4"');
        expect(rows).toHaveLength(2);
        expect(rows[1][1]).toBe('123 Main St\nSuite 4');
    });
    test('handles CRLF line endings', () => {
        const rows = parseCSV('a,b\r\n1,2\r\n3,4');
        expect(rows).toHaveLength(3);
        expect(rows[1]).toEqual(['1', '2']);
    });
    test('handles trailing newline', () => {
        const rows = parseCSV('a,b\n1,2\n');
        expect(rows.filter(r => r.length > 1 || r[0] !== '')).toHaveLength(2);
    });
});
