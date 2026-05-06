export default async function handler(req, res) {
    // CORS
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

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key no configurada' });
    }

    try {
        // Usando v1 (más estable) en lugar de v1beta
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Error de Gemini:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error al generar respuesta'
            });
        }

        if (!data.candidates?.[0]?.content) {
            console.error('Respuesta inválida:', data);
            return res.status(500).json({ 
                error: 'Respuesta inválida de la IA'
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: error.message
        });
    }
}