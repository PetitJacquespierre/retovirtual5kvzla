export default async function handler(req, res) {
    // 1. Evitamos el bloqueo CORS para que la página pueda hablar con el API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. Si es una petición de pre-vuelo (OPTIONS), respondemos OK rápido
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Solo aceptamos POST reales
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se acepta POST' });
    }

    try {
        const { prompt } = req.body;
        
        // 4. Verificamos que Vercel esté leyendo la llave secreta
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("CRÍTICO: Vercel no está leyendo la GEMINI_API_KEY");
            return res.status(500).json({ error: 'Configuración de servidor incompleta (API_KEY missing)' });
        }

        // 5. La llamada simplificada a Google
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
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

        // 6. Todo salió bien
        res.status(200).json(data);

    } catch (error) {
        console.error("ERROR INTERNO:", error);
        res.status(500).json({ error: 'Falla interna del servidor', mensaje: error.message });
    }
}