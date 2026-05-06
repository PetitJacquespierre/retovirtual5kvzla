export default async function handler(req, res) {
    // Configuración de Cabeceras CORS
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
        return res.status(400).json({ error: 'Falta el parámetro prompt' });
    }

    // Usamos la nueva variable de entorno de OpenRouter
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'La API Key de OpenRouter no está configurada en Vercel.' });
    }

    try {
        // Conexión con OpenRouter usando el modelo gratuito de Gemini 2.0 Flash
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://retovirtualvzla.com', // Requerido por OpenRouter
                'X-Title': 'Reto Virtual VZLA'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-exp:free', // Modelo gratis sin restricciones de región
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1200
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Error de OpenRouter:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error en el proveedor de IA externa.' 
            });
        }

        // Extraemos el texto generado por el modelo
        const textoGenerado = data.choices[0].message.content;

        // Simulamos la estructura exacta de Gemini para no romper tu entrenador.html anterior
        const respuestaEstructurada = {
            candidates: [{
                content: {
                    parts: [{ text: textoGenerado }]
                }
            }]
        };

        return res.status(200).json(respuestaEstructurada);

    } catch (error) {
        console.error('Error del servidor:', error);
        return res.status(500).json({ error: 'Error de red en el servidor: ' + error.message });
    }
}