const { generateVCard } = require('../../utils/vcard');

describe('generateVCard', () => {
    test('generates valid vCard with all fields and RFC 6350 7-part ADR', () => {
        const card = {
            firstName: 'John',
            lastName: 'Doe',
            company: 'TestCorp',
            title: 'Engineer',
            email: 'john@testcorp.com',
            phone: '+905551234567',
            website: 'https://testcorp.com',
            address: '123 Main St',
            city: 'Istanbul',
            country: 'Turkey',
            notes: 'Met at conference',
        };
        const vcard = generateVCard(card);
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('VERSION:3.0');
        expect(vcard).toContain('FN:John Doe');
        expect(vcard).toContain('N:Doe;John;;;');
        expect(vcard).toContain('ORG:TestCorp');
        expect(vcard).toContain('ADR;TYPE=WORK:;;123 Main St;Istanbul;;;Turkey');
        expect(vcard).toContain('END:VCARD');
    });

    test('generates valid vCard with minimal fields', () => {
        const vcard = generateVCard({ firstName: 'Jane', lastName: 'Smith' });
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('FN:Jane Smith');
        expect(vcard).not.toContain('ORG:');
    });

    test('handles special characters and prevents CRLF vCard injection', () => {
        const vcard = generateVCard({
            firstName: 'Mühammet',
            lastName: 'Sağ',
            company: 'Şirket; A,B\\C',
            notes: 'Line1\r\nEMAIL:injected@evil.com',
        });
        expect(vcard).toContain('Mühammet Sağ');
        expect(vcard).toContain('ORG:Şirket\\; A\\,B\\\\C');
        expect(vcard).toContain('NOTE:Line1\\nEMAIL:injected@evil.com');
        expect(vcard).not.toContain('\r\nEMAIL:injected@evil.com');
    });
});
