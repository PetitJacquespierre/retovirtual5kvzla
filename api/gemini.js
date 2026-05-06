export default async function handler(req, res) {
    // Habilitar CORS
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
        return res.status(500).json({ error: 'API Key no configurada en variables de entorno' });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                        topP: 0.8,
                        topK: 40
                    }
                })
            }
        );

        const data = await response.json();

        // Verificar si hay error en la respuesta
        if (!response.ok) {
            console.error('Error de Gemini API:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error al generar respuesta',
                details: data
            });
        }

        // Verificar estructura de respuesta
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Estructura inesperada:', data);
            return res.status(500).json({ 
                error: 'Respuesta inválida de la IA',
                details: data
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error en función:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
}