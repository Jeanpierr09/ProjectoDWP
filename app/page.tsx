import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, MessageSquare } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Asistente de Documentos</CardTitle>
          <CardDescription>
            Sube documentos PDF y chatea con ellos usando IA
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Link href="/upload" className="w-full">
            <Button variant="outline" className="w-full justify-start" asChild>
              <div>
                <FileText className="mr-2 h-4 w-4" />
                Subir Documento
              </div>
            </Button>
          </Link>
          
          <Link href="/chat" className="w-full">
            <Button variant="outline" className="w-full justify-start" asChild>
              <div>
                <MessageSquare className="mr-2 h-4 w-4" />
                Ir al Chat
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
