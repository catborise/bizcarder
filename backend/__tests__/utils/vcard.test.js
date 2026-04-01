const { generateVCard } = require('../../utils/vcard');

describe('generateVCard', () => {
    test('generates valid vCard with all fields', () => {
        const card = { firstName: 'John', lastName: 'Doe', company: 'TestCorp', title: 'Engineer', email: 'john@testcorp.com', phone: '+905551234567', website: 'https://testcorp.com', address: '123 Main St', city: 'Istanbul', country: 'Turkey', notes: 'Met at conference' };
        const vcard = generateVCard(card);
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('VERSION:3.0');
        expect(vcard).toContain('FN:John Doe');
        expect(vcard).toContain('N:Doe;John;;;');
        expect(vcard).toContain('ORG:TestCorp');
        expect(vcard).toContain('END:VCARD');
    });
    test('generates valid vCard with minimal fields', () => {
        const vcard = generateVCard({ firstName: 'Jane', lastName: 'Smith' });
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('FN:Jane Smith');
        expect(vcard).not.toContain('ORG:');
    });
    test('handles special characters', () => {
        const vcard = generateVCard({ firstName: 'Mühammet', lastName: 'Sağ', company: 'Şirket & Co.' });
        expect(vcard).toContain('Mühammet Sağ');
    });
});
