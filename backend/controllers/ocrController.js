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
        let result = {};

        if (user.aiOcrProvider === 'openai') {
            result = await analyzeWithOpenAI(imageBase64, apiKey);
        } else if (user.aiOcrProvider === 'gemini') {
            result = await analyzeWithGemini(imageBase64, apiKey);
        } else if (user.aiOcrProvider === 'anthropic') {
            result = await analyzeWithClaude(imageBase64, apiKey);
        } else {
            return res.status(400).json({ error: 'Geçersiz sağlayıcı.' });
        }

        res.json(result);
    } catch (error) {
        console.error('AI OCR Error Details:', error.response?.data || error.message);

        let errorMessage = 'AI analizi sırasında bir hata oluştu.';
        const apiError = error.response?.data?.error;

        if (error.response?.status === 429 || (apiError && (apiError.code === 'insufficient_quota' || apiError.type === 'insufficient_quota'))) {
            errorMessage = 'AI Sağlayıcı Kotası Dolu: Lütfen API kredilerinizi kontrol edin veya farklı bir sağlayıcı deneyin.';
        } else if (error.response?.status === 401 || error.response?.status === 403) {
            errorMessage = 'API Anahtarı Geçersiz: Lütfen ayarlar sayfasından API anahtarınızı kontrol edin.';
        } else if (apiError?.message) {
            errorMessage = `AI Sağlayıcı Hatası: ${apiError.message}`;
        } else {
            errorMessage = `Sistem Hatası: ${error.message}`;
        }

        res.status(error.response?.status || 500).json({
            error: errorMessage,
            providerError: apiError || error.message
        });
    } finally {
        // Geçici dosyayı sil (isteğe bağlı, multer diskStorage kullanıyorsa)
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch (e) { }
        }
    }
};

async function analyzeWithOpenAI(base64, apiKey) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: PROMPT },
                    {
                        type: "image_url",
                        image_url: { url: `data:image/jpeg;base64,${base64}` }
                    }
                ]
            }
        ],
        response_format: { type: "json_object" }
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return JSON.parse(response.data.choices[0].message.content);
}

async function analyzeWithGemini(base64, apiKey) {
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        contents: [{
            parts: [
                { text: PROMPT + " Yanıt sadece temiz bir JSON olmalı, markdown backtickleri içermemeli." },
                {
                    inline_data: {
                        mime_type: "image/jpeg",
                        data: base64
                    }
                }
            ]
        }]
    });

    let text = response.data.candidates[0].content.parts[0].text;
    // Markdown temizliği (eğer gelirse)
    text = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(text);
}

async function analyzeWithClaude(base64, apiKey) {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [{
            role: "user",
            content: [
                {
                    type: "image",
                    source: {
                        type: "base64",
                        media_type: "image/jpeg",
                        data: base64
                    }
                },
                { type: "text", text: PROMPT + " Yanıt sadece JSON formatında olsun." }
            ]
        }]
    }, {
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }
    });

    const text = response.data.content[0].text;
    return JSON.parse(text);
}

module.exports = { analyzeWithAI };
