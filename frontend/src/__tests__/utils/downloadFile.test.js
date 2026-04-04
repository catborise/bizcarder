import { downloadFile } from '../../utils/downloadHelper';

describe('downloadFile', () => {
    let appendChildSpy;
    let removeChildSpy;
    let createObjectURLSpy;
    let revokeObjectURLSpy;
    let createdLink;

    beforeEach(() => {
        // Track the link element created by downloadFile
        createdLink = null;
        const origCreateElement = document.createElement.bind(document);

        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
            if (tag === 'a') {
                const link = origCreateElement('a');
                // Spy on click
                vi.spyOn(link, 'click').mockImplementation(() => {});
                createdLink = link;
                return link;
            }
            return origCreateElement(tag);
        });

        appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
        createObjectURLSpy = vi.fn(() => 'blob:http://localhost/fake-url');
        revokeObjectURLSpy = vi.fn();
        window.URL.createObjectURL = createObjectURLSpy;
        window.URL.revokeObjectURL = revokeObjectURLSpy;

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('creates a Blob with correct MIME type', () => {
        const data = 'test content';
        downloadFile(data, 'test.txt', 'text/plain');

        expect(createObjectURLSpy).toHaveBeenCalledOnce();
        const blob = createObjectURLSpy.mock.calls[0][0];
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('text/plain');
    });

    it('sets the download attribute on the link', () => {
        downloadFile('data', 'myfile.csv', 'text/csv');

        expect(createdLink).not.toBeNull();
        expect(createdLink.getAttribute('download')).toBe('myfile.csv');
    });

    it('sets href to the blob URL', () => {
        downloadFile('data', 'file.txt', 'text/plain');

        expect(createdLink.href).toContain('blob:http://localhost/fake-url');
    });

    it('appends link to document body and triggers click', () => {
        downloadFile('data', 'export.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        expect(appendChildSpy).toHaveBeenCalledOnce();
        expect(createdLink.click).toHaveBeenCalledOnce();
    });

    it('cleans up after timeout', () => {
        downloadFile('data', 'file.pdf', 'application/pdf');

        // Before timeout, removeChild should not have been called
        expect(removeChildSpy).not.toHaveBeenCalled();

        // Advance timers past the 500ms cleanup timeout
        vi.advanceTimersByTime(600);

        expect(removeChildSpy).toHaveBeenCalledOnce();
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/fake-url');
    });

    it('uses fallback MIME type when none provided', () => {
        downloadFile('data', 'file.bin');

        const blob = createObjectURLSpy.mock.calls[0][0];
        expect(blob.type).toBe('application/octet-stream');
    });

    it('handles VCF file downloads', () => {
        const vcfData = 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD';
        downloadFile(vcfData, 'contacts.vcf', 'text/vcard');

        expect(createObjectURLSpy).toHaveBeenCalledOnce();
        const blob = createObjectURLSpy.mock.calls[0][0];
        expect(blob.type).toBe('text/vcard');
        expect(createdLink.click).toHaveBeenCalledOnce();
    });
});
