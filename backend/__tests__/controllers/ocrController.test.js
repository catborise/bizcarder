const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('axios');
const axios = require('axios');
const { encrypt } = require('../../utils/encryption');
const { analyzeWithAI } = require('../../controllers/ocrController');

function createMockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function createTempImageFile(name = 'ocr-test.png', content = 'fake-image-bytes') {
    const filePath = path.join(os.tmpdir(), `${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`);
    fs.writeFileSync(filePath, content);
    return filePath;
}

describe('OCR Controller (analyzeWithAI)', () => {
    const tempFiles = [];
    const encryptedKey = encrypt('sk-secret-test-api-key');

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        while (tempFiles.length > 0) {
            const fp = tempFiles.pop();
            try {
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            } catch (_) {}
        }
    });

    test('returns 400 when aiOcrEnabled is false and still cleans up uploaded file', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        const req = { user: { aiOcrEnabled: false }, file: { path: fp, mimetype: 'image/jpeg' } };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(fs.existsSync(fp)).toBe(false);
    });

    test('returns 400 when encrypted API key is missing or undecryptable', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: 'bad-encrypted-value', aiOcrProvider: 'openai' },
            file: { path: fp, mimetype: 'image/jpeg' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(fs.existsSync(fp)).toBe(false);
    });

    test('returns 400 when no file is uploaded', async () => {
        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'openai' },
            file: null,
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 400 INVALID_AI_PROVIDER for unknown provider', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'unknown-llm' },
            file: { path: fp, mimetype: 'image/png' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'INVALID_AI_PROVIDER' }));
        expect(fs.existsSync(fp)).toBe(false);
    });

    test('analyzes card with OpenAI using Bearer token and actual mimeType', async () => {
        const fp = createTempImageFile('card.webp');
        tempFiles.push(fp);
        axios.post.mockResolvedValueOnce({
            data: {
                choices: [
                    {
                        message: {
                            content: JSON.stringify({ firstName: 'Ahmet', lastName: 'Yilmaz', company: 'Acme' }),
                        },
                    },
                ],
            },
        });

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'openai' },
            file: { path: fp, mimetype: 'image/webp' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(axios.post).toHaveBeenCalledWith(
            'https://api.openai.com/v1/chat/completions',
            expect.objectContaining({
                model: 'gpt-4o-mini',
                messages: [
                    expect.objectContaining({
                        content: expect.arrayContaining([
                            expect.objectContaining({
                                image_url: { url: expect.stringMatching(/^data:image\/webp;base64,/) },
                            }),
                        ]),
                    }),
                ],
            }),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer sk-secret-test-api-key' }),
            }),
        );
        expect(res.json).toHaveBeenCalledWith({ firstName: 'Ahmet', lastName: 'Yilmaz', company: 'Acme' });
        expect(fs.existsSync(fp)).toBe(false);
    });

    test('analyzes card with Gemini using x-goog-api-key header (not URL query) and strips markdown fences', async () => {
        const fp = createTempImageFile('card.png');
        tempFiles.push(fp);
        axios.post.mockResolvedValueOnce({
            data: {
                candidates: [
                    {
                        content: {
                            parts: [{ text: '```json\n{"firstName":"Zeynep","lastName":"Demir"}\n```' }],
                        },
                    },
                ],
            },
        });

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'gemini' },
            file: { path: fp, mimetype: 'image/png' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        const [url, body, config] = axios.post.mock.calls[0];
        expect(url).toContain('gemini-2.5-flash');
        expect(url).not.toContain('key=');
        expect(config.headers['x-goog-api-key']).toBe('sk-secret-test-api-key');
        expect(body.contents[0].parts[1].inline_data.mime_type).toBe('image/png');
        expect(res.json).toHaveBeenCalledWith({ firstName: 'Zeynep', lastName: 'Demir' });
    });

    test('analyzes card with Anthropic Claude using actual media_type and parses JSON with preamble', async () => {
        const fp = createTempImageFile('card.png');
        tempFiles.push(fp);
        axios.post.mockResolvedValueOnce({
            data: {
                content: [{ text: 'Here is the extracted data:\n{"firstName":"Mehmet","email":"m@test.com"}' }],
            },
        });

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'anthropic' },
            file: { path: fp, mimetype: 'image/png' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        const [url, body, config] = axios.post.mock.calls[0];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(config.headers['x-api-key']).toBe('sk-secret-test-api-key');
        expect(body.messages[0].content[0].source.media_type).toBe('image/png');
        expect(res.json).toHaveBeenCalledWith({ firstName: 'Mehmet', email: 'm@test.com' });
    });

    test('maps 429 quota error to 429 AI_QUOTA_EXCEEDED', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        axios.post.mockRejectedValueOnce({
            response: { status: 429, data: { error: { code: 'insufficient_quota' } } },
        });

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'openai' },
            file: { path: fp, mimetype: 'image/jpeg' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AI_QUOTA_EXCEEDED' }));
    });

    test('maps 401/403 error to 400 AI_API_KEY_INVALID', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        axios.post.mockRejectedValueOnce({ response: { status: 401, data: {} } });

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'gemini' },
            file: { path: fp, mimetype: 'image/jpeg' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AI_API_KEY_INVALID' }));
    });

    test('maps malformed JSON from AI provider to 502 AI_INVALID_RESPONSE', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        axios.post.mockResolvedValueOnce({
            data: { choices: [{ message: { content: '{ invalid json }' } }] },
        });

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'openai' },
            file: { path: fp, mimetype: 'image/jpeg' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AI_INVALID_RESPONSE' }));
    });

    test('hides raw internal error messages and API keys on generic failure', async () => {
        const fp = createTempImageFile();
        tempFiles.push(fp);
        axios.post.mockRejectedValueOnce(new Error('Request failed with key sk-secret-test-api-key'));

        const req = {
            user: { aiOcrEnabled: true, aiOcrApiKey: encryptedKey, aiOcrProvider: 'openai' },
            file: { path: fp, mimetype: 'image/jpeg' },
        };
        const res = createMockRes();

        await analyzeWithAI(req, res);

        expect(res.status).toHaveBeenCalledWith(502);
        const payload = res.json.mock.calls[0][0];
        expect(payload.errorCode).toBe('AI_OCR_FAILED');
        expect(payload.error).not.toContain('sk-secret-test-api-key');
    });
});
