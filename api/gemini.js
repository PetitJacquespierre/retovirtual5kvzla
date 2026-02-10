export default async function handler(req, res) {
  // --- 1. CONFIGURACIÓN DE SEGURIDAD (CORS) ---
  // Esto permite que tu página HTML hable con este archivo sin errores
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Permite a cualquier dominio (útil para pruebas)
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Si el navegador pregunta "¿Puedo pasar?", le decimos que sí (Preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // --- 2. VALIDACIÓN ---
  // Solo aceptamos peticiones tipo POST (envío de datos)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    // --- 3. RECIBIR DATOS ---
    // Sacamos el "prompt" (lo que pide el usuario) del cuerpo del mensaje
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Falta el prompt' });
    }

    // --- 4. OBTENER LA LLAVE SECRETA ---
    // Buscamos la llave en las variables de entorno de Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Error: No se encontró la GEMINI_API_KEY en Vercel");
      return res.status(500).json({ error: 'Error de configuración en el servidor' });
    }

    // --- 5. LLAMAR A GOOGLE GEMINI ---
    // Esta es la parte que habla con la IA
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    // --- 6. PROCESAR RESPUESTA ---
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error en Google API');
    }

    const data = await response.json();

    // --- 7. DEVOLVER AL HTML ---
    return res.status(200).json(data);

  } catch (error) {
    console.error("Error en la función serverless:", error);
    return res.status(500).json({ error: error.message });
  }
}