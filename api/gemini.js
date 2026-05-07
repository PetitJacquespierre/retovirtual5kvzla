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
        console.error('❌ Token no encontrado');
        return res.status(500).json({ 
            error: 'HUGGINGFACE_TOKEN no está configurado en Vercel Settings' 
        });
    }

    console.log('✅ Token encontrado');

    try {
        console.log('📤 Llamando a Hugging Face...');
        
        const response = await fetch(
            'https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 1000,
                        temperature: 0.7,
                        return_full_text: false
                    }
                })
            }
        );

        console.log('📥 Status:', response.status);

        const data = await response.json();
        console.log('📥 Data:', JSON.stringify(data).substring(0, 200));

        if (!response.ok) {
            console.error('❌ Error de HF:', data);
            
            // Si el modelo está cargando
            if (data.error?.includes('loading')) {
                return res.status(503).json({ 
                    error: 'El modelo se está cargando. Intenta de nuevo en 20 segundos.' 
                });
            }
            
            return res.status(response.status).json({ 
                error: data.error || 'Error de Hugging Face'
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
            console.error('❌ Sin texto en respuesta');
            return res.status(500).json({ 
                error: 'El modelo no generó texto',
                data: data
            });
        }

        console.log('✅ Texto generado:', texto.substring(0, 100));

        // Formato compatible
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
            error: error.message,
            stack: error.stack
        });
    }
}