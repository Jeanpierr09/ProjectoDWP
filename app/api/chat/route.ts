
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // Validar variable de entorno
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('La URL del webhook n8n no está configurada');
    }

    // Leer el body y reenviar al webhook
    const body = await req.text();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    // Reenviar la respuesta del webhook
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });

  } catch (error: any) {
    console.error('Error en proxy chat API:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor',
      details: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}