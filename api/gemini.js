export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    // Get prompt from body
    const { prompt } = req.body;
    
    if (!prompt) {
        console.error('❌ No prompt provided');
        return res.status(400).json({ error: 'Prompt requerido' });
    }

    // Get API key
    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
        console.error('❌ OPENROUTER_API_KEY no configurada');
        return res.status(500).json({ 
            error: 'API Key no configurada en variables de entorno',
            hint: 'Configura OPENROUTER_API_KEY en Vercel Settings'
        });
    }

    console.log('✅ API Key encontrada');
    console.log('📤 Enviando prompt a OpenRouter...');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://retovirtualvzla.vercel.app',
                'X-Title': 'Reto Virtual VZLA'
            },
            body: JSON.stringify({
                model: 'google/gemini-flash-1.5',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        console.log('📥 Status:', response.status);
        console.log('📥 Respuesta:', JSON.stringify(data).substring(0, 200));

        // Check for errors
        if (!response.ok) {
            console.error('❌ Error de OpenRouter:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error al generar respuesta',
                details: data
            });
        }

        // Validate response structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('❌ Estructura de respuesta inválida:', data);
            return res.status(500).json({ 
                error: 'Respuesta inválida del modelo',
                details: data
            });
        }

        const textoGenerado = data.choices[0].message.content;
        console.log('✅ Texto generado (primeros 100 chars):', textoGenerado.substring(0, 100));
        
        // Adapt to Gemini format (what your frontend expects)
        const respuestaAdaptada = {
            candidates: [{
                content: {
                    parts: [{ text: textoGenerado }]
                }
            }]
        };

        console.log('✅ Enviando respuesta adaptada al frontend');
        return res.status(200).json(respuestaAdaptada);

    } catch (error) {
        console.error('❌ Error en función:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}