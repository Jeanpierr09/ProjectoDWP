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

    try {
      // Validaciones iniciales
      if (!file) throw new Error('Por favor selecciona un archivo');
      if (!ALLOWED_FILE_TYPES.includes(file.type)) throw new Error('Solo se permiten archivos PDF');
      if (file.size > MAX_FILE_SIZE) throw new Error('El archivo no debe superar los 10MB');

      setIsLoading(true);

      // Generar nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;

      // Paso A: Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Error al subir archivo: ${uploadError.message}`);
      }

      // Paso D: Llamar a la nueva API Route /api/ingest
      const ingestResponse = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName }),
      });

      if (!ingestResponse.ok) {
        // Intentar borrar el archivo subido si falla la ingestión
        await supabase.storage.from(BUCKET_NAME).remove([fileName]);
        const errorData = await ingestResponse.json();
        throw new Error(errorData?.error || 'Error al procesar el documento');
      }

      toast.success('¡Archivo subido! El procesamiento ha comenzado.');
      form.reset();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.message || 'Hubo un error al procesar tu archivo');
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