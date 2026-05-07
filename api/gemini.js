export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

    const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
    if (!HF_TOKEN) {
        return res.status(500).json({ 
            error: 'HUGGINGFACE_TOKEN no configurado en Vercel' 
        });
    }

    console.log('✅ Token encontrado, llamando a Hugging Face...');

    try {
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
                        max_new_tokens: 1024,
                        temperature: 0.7,
                        top_p: 0.9,
                        return_full_text: false
                    }
                })
            }
        );

        const data = await response.json();
        console.log('📥 Respuesta HF:', JSON.stringify(data).substring(0, 200));

        if (!response.ok) {
            console.error('❌ Error de Hugging Face:', data);
            return res.status(response.status).json({ 
                error: data.error || 'Error de Hugging Face',
                details: data
            });
        }

        // Hugging Face puede devolver array o objeto
        let texto = '';
        
        if (Array.isArray(data)) {
            texto = data[0]?.generated_text || '';
        } else if (data.generated_text) {
            texto = data.generated_text;
        }

        if (!texto) {
            console.error('❌ Sin texto en respuesta:', data);
            return res.status(500).json({ 
                error: 'Sin respuesta del modelo',
                received: data
            });
        }

        console.log('✅ Texto generado (100 chars):', texto.substring(0, 100));

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