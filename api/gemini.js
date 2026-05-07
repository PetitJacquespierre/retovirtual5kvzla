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
        return res.status(500).json({ 
            error: 'HUGGINGFACE_TOKEN no configurado' 
        });
    }

    console.log('✅ Token encontrado, llamando a Hugging Face...');

    try {
        const response = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 800,
                        temperature: 0.7,
                        top_p: 0.9,
                        return_full_text: false
                    }
                })
            }
        );

        console.log('📥 Status HF:', response.status);

        // Si es 503, el modelo está cargando
        if (response.status === 503) {
            return res.status(503).json({ 
                error: 'El modelo está inicializando. Intenta de nuevo en 20 segundos.' 
            });
        }

        // Intentar parsear JSON
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            const text = await response.text();
            console.error('❌ Respuesta no es JSON:', text.substring(0, 500));
            return res.status(500).json({ 
                error: 'Respuesta inválida de Hugging Face',
                details: text.substring(0, 200)
            });
        }

        console.log('📥 Data recibida:', JSON.stringify(data).substring(0, 300));

        if (!response.ok) {
            console.error('❌ Error de HF:', data);
            return res.status(response.status).json({ 
                error: data.error || 'Error de Hugging Face'
            });
        }

        // Extraer texto generado
        let texto = '';
        
        if (Array.isArray(data)) {
            // Formato: [{ generated_text: "..." }]
            texto = data[0]?.generated_text || data[0]?.summary_text || '';
        } else if (data.generated_text) {
            // Formato: { generated_text: "..." }
            texto = data.generated_text;
        } else if (data[0]) {
            // Formato alternativo
            texto = data[0];
        }

        if (!texto || typeof texto !== 'string') {
            console.error('❌ Sin texto válido:', data);
            return res.status(500).json({ 
                error: 'No se pudo extraer texto de la respuesta',
                data: data
            });
        }

        console.log('✅ Texto extraído:', texto.substring(0, 150));

        // Formato compatible con frontend
        return res.status(200).json({
            candidates: [{
                content: {
                    parts: [{ text: texto }]
                }
            }]
        });

    } catch (error) {
        console.error('❌ Error catch:', error.message);
        return res.status(500).json({ 
            error: error.message
        });
    }
}