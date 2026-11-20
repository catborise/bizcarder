const axios = require('axios');
const fs = require('fs');
const { decrypt } = require('../utils/encryption');

const PROMPT = `Aşağıdaki kartvizit görüntüsünden bilgileri ayıkla ve ayıklanan bilgileri + kartın 4 köşesinin (köşe koordinatları) koordinatlarını SADECE JSON formatında döndür.

JSON formatı şu şekilde olmalıdır:
{
  "firstName": "Ad",
  "lastName": "Soyad",
  "company": "Şirket Adı",
  "title": "Ünvan",
  "email": "E-posta",
  "phone": "Telefon",
  "address": "Adres",
  "city": "Şehir",
  "country": "Ülke",
  "website": "Web Sitesi",
  "ocrText": "Tüm metin",
  "corners": {
    "topLeft": {"x": 0-100, "y": 0-100},
    "topRight": {"x": 0-100, "y": 0-100},
    "bottomRight": {"x": 0-100, "y": 0-100},
    "bottomLeft": {"x": 0-100, "y": 0-100}
  }
}

NOTLAR:
1. "corners" alanında, kartın gerçek köşelerini (kırpılacak alan) resmin genişlik ve yüksekliğine oranla %0-100 arasında tahmin et.
2. Eğer bilgi bulunamazsa boş string bırak.
3. Dil Türkçe'dir.
4. Yanıt SADECE geçerli bir JSON objesi olmalıdır.`;

/**
 * Safely parse AI response text that may contain markdown wrappers or preamble
 */
function safeParseAIResponse(text) {
    if (!text) throw new Error('Empty AI response');

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    let cleaned = text
        .replace(/```(?:json)?\s*\n?/gi, '')
        .replace(/\n?\s*```/g, '')
        .trim();

    // If response starts with non-JSON preamble, try to find the JSON object
    if (!cleaned.startsWith('{')) {
        const jsonStart = cleaned.indexOf('{');
        if (jsonStart === -1) throw new Error('No JSON object found in AI response');
        const jsonEnd = cleaned.lastIndexOf('}');
        if (jsonEnd === -1) throw new Error('Incomplete JSON object in AI response');
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(cleaned);
}

const analyzeWithAI = async (req, res) => {
    try {
        const user = req.user;
        if (!user.aiOcrEnabled) {
            return res.status(400).json({ error: 'AI OCR ayarı kapalı.' });
        }

        const apiKey = decrypt(user.aiOcrApiKey);
        if (!apiKey) {
            return res.status(400).json({ error: 'AI API anahtarı bulunamadı veya geçersiz.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Resim dosyası yüklenmedi.' });
        }

        const imageBase64 = fs.readFileSync(req.file.path, { encoding: 'base64' });
        const mimeType = req.file.mimetype || 'image/jpeg';
        let result = {};

        if (user.aiOcrProvider === 'openai') {
            result = await analyzeWithOpenAI(imageBase64, mimeType, apiKey);
        } else if (user.aiOcrProvider === 'gemini') {
            result = await analyzeWithGemini(imageBase64, mimeType, apiKey);
        } else if (user.aiOcrProvider === 'anthropic') {
            result = await analyzeWithClaude(imageBase64, mimeType, apiKey);
        } else {
            return res.status(400).json({ errorCode: 'INVALID_AI_PROVIDER', error: 'Geçersiz sağlayıcı.' });
        }

        res.json(result);
    } catch (error) {
        // Avoid logging full axios config/URL which may contain sensitive headers
        console.error('AI OCR Error:', error.response?.status || error.code || error.message);

        let errorMessage = 'AI analizi sırasında bir hata oluştu.';
        let errorCode = 'AI_OCR_FAILED';
        let statusCode = 502;
        const apiError = error.response?.data?.error;

        if (
            error.response?.status === 429 ||
            (apiError && (apiError.code === 'insufficient_quota' || apiError.type === 'insufficient_quota'))
        ) {
            errorMessage =
                'AI Sağlayıcı Kotası Dolu: Lütfen API kredilerinizi kontrol edin veya farklı bir sağlayıcı deneyin.';
            errorCode = 'AI_QUOTA_EXCEEDED';
            statusCode = 429;
        } else if (error.response?.status === 401 || error.response?.status === 403) {
            errorMessage = 'API Anahtarı Geçersiz: Lütfen ayarlar sayfasından API anahtarınızı kontrol edin.';
            errorCode = 'AI_API_KEY_INVALID';
            statusCode = 400;
        } else if (error instanceof SyntaxError) {
            errorMessage = 'AI yanıtı geçerli JSON değildi. Lütfen tekrar deneyin.';
            errorCode = 'AI_INVALID_RESPONSE';
            statusCode = 502;
        } else if (apiError?.message) {
            errorMessage = `AI Sağlayıcı Hatası: ${apiError.message}`;
            statusCode = 502;
        }

        res.status(statusCode).json({ errorCode, error: errorMessage });
    } finally {
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
        }
    }
};

const AI_TIMEOUT_MS = 30000;

async function analyzeWithOpenAI(base64, mimeType, apiKey) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: PROMPT },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                    ],
                },
            ],
            response_format: { type: 'json_object' },
        },
        {
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: AI_TIMEOUT_MS,
        },
    );

    return safeParseAIResponse(response.data?.choices?.[0]?.message?.content);
}

async function analyzeWithGemini(base64, mimeType, apiKey) {
    const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        {
            contents: [
                {
                    parts: [
                        { text: PROMPT + ' Yanıt sadece temiz bir JSON olmalı, markdown backtickleri içermemeli.' },
                        { inline_data: { mime_type: mimeType, data: base64 } },
                    ],
                },
            ],
        },
        {
            headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
            timeout: AI_TIMEOUT_MS,
        },
    );

    return safeParseAIResponse(response.data?.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function analyzeWithClaude(base64, mimeType, apiKey) {
    const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
                        { type: 'text', text: PROMPT + ' Yanıt sadece JSON formatında olsun.' },
                    ],
                },
            ],
        },
        {
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
            timeout: AI_TIMEOUT_MS,
        },
    );

    return safeParseAIResponse(response.data?.content?.[0]?.text);
}

module.exports = { analyzeWithAI };
