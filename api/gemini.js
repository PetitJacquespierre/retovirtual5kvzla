export default async function handler(req, res) {
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

    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    if (!HF_TOKEN) {
        return res.status(500).json({ error: 'Token no configurado' });
    }

    console.log('✅ Llamando a Hugging Face (flan-t5-base)...');

    try {
        const response = await fetch(
            'https://api-inference.huggingface.co/models/google/flan-t5-base',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt
                })
            }
        );

        console.log('📥 Status:', response.status);
        
        const rawText = await response.text();
        console.log('📥 Raw (primeros 300 chars):', rawText.substring(0, 300));

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error('❌ Error parseando JSON');
            return res.status(500).json({ 
                error: 'Respuesta no válida de Hugging Face',
                rawResponse: rawText.substring(0, 200)
            });
        }

        // Si hay error de HF
        if (data.error) {
            console.error('❌ Error HF:', data.error);
            return res.status(503).json({ 
                error: data.error,
                hint: data.estimated_time ? `Espera ${data.estimated_time}s` : 'Token inválido o modelo no disponible'
            });
        }

        // Extraer texto
        let texto = '';
        if (Array.isArray(data) && data[0]?.generated_text) {
            texto = data[0].generated_text;
        } else if (data.generated_text) {
            texto = data.generated_text;
        }

        if (!texto) {
            console.error('❌ Sin texto:', data);
            return res.status(500).json({ 
                error: 'Sin texto generado',
                data: data
            });
        }

        console.log('✅ Texto generado:', texto.substring(0, 100));

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