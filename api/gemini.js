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

    console.log('✅ Llamando a Hugging Face...');

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

        console.log('📥 Status:', response.status);

        // Leer el body UNA SOLA VEZ
        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('❌ Respuesta no JSON:', text.substring(0, 300));
            return res.status(500).json({ 
                error: 'Hugging Face devolvió una respuesta inválida',
                hint: 'El modelo puede no estar disponible'
            });
        }

        console.log('📥 Data:', JSON.stringify(data).substring(0, 300));

        // Si el modelo está cargando
        if (response.status === 503 && data.error?.includes('loading')) {
            return res.status(503).json({ 
                error: 'El modelo está inicializando. Espera 30 segundos e intenta de nuevo.' 
            });
        }

        // Si hay error de Hugging Face
        if (!response.ok || data.error) {
            console.error('❌ Error HF:', data);
            return res.status(response.status || 500).json({ 
                error: data.error || 'Error de Hugging Face',
                details: data
            });
        }

        // Extraer texto generado
        let texto = '';
        
        if (Array.isArray(data) && data.length > 0) {
            texto = data[0]?.generated_text || data[0]?.summary_text || '';
        } else if (data.generated_text) {
            texto = data.generated_text;
        }

        if (!texto) {
            console.error('❌ Sin texto en respuesta:', data);
            return res.status(500).json({ 
                error: 'El modelo no generó texto',
                hint: 'Intenta con otro modelo',
                data: data
            });
        }

        console.log('✅ Generado:', texto.substring(0, 100));

        // Formato compatible con frontend
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
            error: error.message,
            hint: 'Revisa los logs en Vercel Functions'
        });
    }
}