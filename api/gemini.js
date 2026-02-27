export default async function handler(req, res) {
    // Solo permitimos peticiones seguras tipo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { prompt } = req.body;
        
        // Vercel saca la llave secreta sin mostrársela a nadie
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Falta la API Key en el servidor' });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 250, temperature: 0.7 }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error('Error conectando con Google');
        }

        res.status(200).json(data);

    } catch (error) {
        console.error("Error en el backend:", error);
        res.status(500).json({ error: 'Servidor saturado' });
    }
}