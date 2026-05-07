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

    console.log('✅ Llamando a Hugging Face...');

    try {
        // Usar un modelo que SÍ funciona con la API de inferencia
        const response = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                    'x-wait-for-model': 'true'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 800,
                        temperature: 0.7,
                        top_p: 0.9,
                        return_full_text: false
                    },
                    options: {
                        wait_for_model: true
                    }
                })
            }
        );

        console.log('📥 Status:', response.status);
        
        const text = await response.text();
        console.log('📥 Raw response:', text.substring(0, 500));

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('❌ No JSON:', text.substring(0, 200));
            return res.status(500).json({ 
                error: 'Respuesta inválida',
                raw: text.substring(0, 200)
            });
        }

        // Si el modelo está cargando
        if (data.error && data.error.includes('loading')) {
            console.log('⏳ Modelo cargando...');
            return res.status(503).json({ 
                error: 'El modelo está inicializando. Intenta de nuevo en 20 segundos.',
                estimated_time: data.estimated_time
            });
        }

        // Si hay otro error
        if (data.error) {
            console.error('❌ Error HF:', data.error);
            return res.status(500).json({ 
                error: data.error
            });
        }

        // Extraer texto
        let texto = '';
        if (Array.isArray(data) && data.length > 0) {
            texto = data[0]?.generated_text || '';
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

        console.log('✅ Generado:', texto.substring(0, 100));

        return res.status(200).json({
            candidates: [{
                content: {
                    parts: [{ text: texto }]
                }
            }]
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({ 
            error: error.message
        });
    }
}