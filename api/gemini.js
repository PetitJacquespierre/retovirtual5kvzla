export default async function handler(req, res) {
    // 1. Evitamos el bloqueo CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se acepta POST' });
    }

    try {
        const { prompt } = req.body;
        
        // 2. Leemos tu llave de Vercel
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Falta la API Key' });
        }

        // 3. 🔥 EL CAMBIO MÁGICO: Llamamos a "gemini-pro" que es el modelo estable universal
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
        
        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error("ERROR DE GOOGLE:", data);
            return res.status(500).json({ error: 'Google rechazó la conexión', detalles: data });
        }

        // 4. Todo salió bien
        res.status(200).json(data);

    } catch (error) {
        console.error("ERROR INTERNO:", error);
        res.status(500).json({ error: 'Falla interna del servidor', mensaje: error.message });
    }
}