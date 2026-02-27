export default async function handler(req, res) {
  // 1. Verificación de seguridad (Solo permitimos peticiones POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Extraer el prompt que envió el usuario desde la página web
    const { prompt } = req.body;
    
    // 3. Obtener la clave secreta de Vercel (que configuraste en el Paso 1)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Falta la API Key en las variables de entorno de Vercel.");
      return res.status(500).json({ error: 'Configuración del servidor incompleta' });
    }

    // 4. Hacer la petición real a Google Gemini de forma segura
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    // 5. Devolver la respuesta de Gemini a tu página web
    const data = await geminiResponse.json();
    
    if (!geminiResponse.ok) {
       console.error("Error de la API de Gemini:", data);
       return res.status(geminiResponse.status).json(data);
    }

    res.status(200).json(data);

  } catch (error) {
    // 6. Manejo de errores genéricos
    console.error('Error en la función serverless:', error);
    res.status(500).json({ error: 'Error procesando la solicitud con IA' });
  }
}