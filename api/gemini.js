export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt requerido' });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        return res.status(500).json({ 
            error: 'GROQ_API_KEY no configurada en Vercel' 
        });
    }

    console.log('✅ Llamando a Groq...');

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile', // Modelo potente y rápido
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.9
            })
        });

        console.log('📥 Status:', response.status);

        const data = await response.json();
        console.log('📥 Data recibida');

        if (!response.ok) {
            console.error('❌ Error Groq:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'Error de Groq'
            });
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('❌ Estructura inválida:', data);
            return res.status(500).json({ 
                error: 'Respuesta inválida de Groq'
            });
        }

        const texto = data.choices[0].message.content;
        console.log('✅ Texto generado:', texto.substring(0, 100));

        // Formato compatible con tu frontend (Gemini format)
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