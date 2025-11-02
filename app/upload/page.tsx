'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 as Spinner } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/types/database';

// Constantes
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf'];
const BUCKET_NAME = 'documentos';

export default function UploadPage() {
  const [isLoading, setIsLoading] = useState(false);
  // Sonner no requiere hook, solo se llama toast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0];

    // Validaciones iniciales
    if (!file) {
      toast.error('Por favor selecciona un archivo');
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Solo se permiten archivos PDF');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('El archivo no debe superar los 10MB');
      return;
    }

    // Validar URL del webhook
    if (!process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL) {
      toast.error('Error de configuración: URL del webhook no definida');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Generar nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;

      // 2. Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      // 3. Insertar en la tabla documents
      const { data: documentArr, error: dbError } = await supabase
        .from('documents')
        .insert([{ file_name: fileName, status: 'pending' }])
        .select();
      const document = documentArr?.[0];

      if (dbError) {
        // Si falla la inserción, intentamos eliminar el archivo subido
        await supabase.storage.from(BUCKET_NAME).remove([fileName]);
        throw new Error(`Error en base de datos: ${dbError.message}`);
      }

      if (!document) {
        throw new Error('No se pudo crear el registro del documento');
      }

      // 4. Activar webhook de n8n
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: document.id,
          file_path: fileName
        }),
      });

      if (!response.ok) {
        // Si falla el webhook, marcar el documento como error
        await supabase
          .from('documents')
          .update({ status: 'error' })
          .eq('id', document?.id);
        throw new Error(`Error en webhook: ${await response.text()}`);
      }

      toast.success('¡Archivo subido! El procesamiento ha comenzado.');

      // Limpiar el formulario
      form.reset();

    } catch (error) {
      console.error('Error:', error);
      toast.error('Hubo un error al procesar tu archivo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Subir Documento</CardTitle>
          <CardDescription>
            Sube un PDF para que la IA pueda aprender de él
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input
                type="file"
                accept=".pdf"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Subir Archivo'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}