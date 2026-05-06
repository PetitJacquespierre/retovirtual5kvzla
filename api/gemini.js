export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt requerido' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY; // Cambié el nombre

    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key no configurada' });
    }

    try {
        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://retovirtualvzla.com', // Cambia a tu dominio
                    'X-Title': 'Reto Virtual VZLA'
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-exp:free', // Gemini gratis vía OpenRouter
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Error de OpenRouter:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error al generar respuesta'
            });
        }

        // Adaptar respuesta al formato de Gemini
        const textoGenerado = data.choices[0].message.content;
        
        // Formato compatible con tu frontend
        const respuestaAdaptada = {
            candidates: [{
                content: {
                    parts: [{ text: textoGenerado }]
                }
            }]
        };

        return res.status(200).json(respuestaAdaptada);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: error.message
        });
    }
}