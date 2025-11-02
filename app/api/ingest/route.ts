import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Crear cliente admin (service_role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL o Service Key no configurados');
    }
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Paso A: Insertar en documents
    const { data: insertData, error: insertError } = await adminClient
      .from('documents')
      .insert({ file_name: fileName, status: 'processing' })
      .select();

    if (insertError || !insertData || !insertData[0]?.id) {
      throw new Error('Error al insertar documento en la base de datos');
    }

    const documentId = insertData[0].id;

    // Paso C: Leer URL del webhook
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('La URL del webhook n8n no está configurada');
    }

    // Paso D: Activar n8n
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: documentId,
        file_path: fileName,
      }),
    });

    if (!n8nResponse.ok) {
      // Paso E: Marcar documento como error
      await adminClient
        .from('documents')
        .update({ status: 'error' })
        .eq('id', documentId);
      throw new Error(`Error en webhook n8n: ${await n8nResponse.text()}`);
    }

    // Paso F: Devolver éxito
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
