export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key no configurada' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://retovirtual5kvzla.vercel.app'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.1-8b-instruct:free', // ✅ MODELO QUE FUNCIONA
                messages: [{ 
                    role: 'user', 
                    content: prompt 
                }],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Error OpenRouter:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error de OpenRouter',
                details: data
            });
        }

        if (!data.choices?.[0]?.message?.content) {
            console.error('❌ Respuesta sin contenido:', data);
            return res.status(500).json({ 
                error: 'Respuesta inválida del modelo' 
            });
        }

        const texto = data.choices[0].message.content;

        // Adaptar al formato que espera tu frontend (Gemini format)
        return res.status(200).json({
            candidates: [{
                content: {
                    parts: [{ text: texto }]
                }
            }]
        });

    } catch (error) {
        console.error('❌ Error catch:', error);
        return res.status(500).json({ 
            error: error.message 
        });
    }
}