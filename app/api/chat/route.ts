import { streamText } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/lib/types/database';
import { 
  ChatRequest, 
  ErrorResponse,
  DatabaseMessage,
  RelevantDocument,
  OpenAIResponse,
  CHAT_SETTINGS, 
  createSystemPrompt,
  formatChatHistory
} from '@/lib/chat';

// Validación de variables de entorno
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

// Configuración de OpenAI
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 1. Validar la solicitud
    const { messages, sessionId: customSessionId }: ChatRequest = await req.json();
    const sessionId = customSessionId || req.headers.get('x-session-id') || 'default-session';

    if (!messages?.length) {
      throw new Error('No messages provided');
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      throw new Error('Invalid message format');
    }

    // 2. Vectorizar la pregunta del usuario
    const embeddingResponse = await openai.createEmbedding({
      model: CHAT_SETTINGS.EMBEDDING_MODEL,
      input: lastMessage.content,
    });
    
    const embeddingData = await embeddingResponse.json();
    if (!embeddingData?.data?.[0]?.embedding) {
      throw new Error('Failed to create embedding');
    }

    const queryEmbedding = embeddingData.data[0].embedding;

    // 3. Buscar documentos relevantes usando la función RPC
    const { data: relevantDocs, error: matchError } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: CHAT_SETTINGS.SIMILARITY_THRESHOLD,
        match_count: CHAT_SETTINGS.MAX_CONTEXT_CHUNKS
      }
    );

    if (matchError) {
      console.error('Error matching documents:', matchError);
      throw new Error('Failed to search documents');
    }

    // 4. Obtener historial de chat
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select<string, DatabaseMessage>('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(CHAT_SETTINGS.MAX_HISTORY_LENGTH);

    if (historyError) {
      console.error('Error fetching chat history:', historyError);
      throw new Error('Failed to fetch chat history');
    }

    // 5. Construir el prompt
    const context = relevantDocs
      ? relevantDocs
          .sort((a: RelevantDocument, b: RelevantDocument) => b.similarity - a.similarity)
          .map((doc: RelevantDocument) => doc.content)
          .filter(Boolean)
          .join('\n\n')
      : '';

    const systemPrompt = createSystemPrompt(
      context,
      chatHistory ? formatChatHistory(chatHistory.map((msg: DatabaseMessage) => ({
        ...msg,
        id: 'historic-message',
        role: msg.role === 'ai' ? 'assistant' : msg.role
      }))) : ''
    );

    // 6. Llamar al modelo de lenguaje
    const response = await openai.createChatCompletion({
      model: CHAT_SETTINGS.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: lastMessage.content }
      ],
      temperature: CHAT_SETTINGS.TEMPERATURE,
      stream: true,
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    // 7. Crear el stream de respuesta y devolverlo
    // Usamos streamText para streaming y persistencia
    return await streamText({
      model: CHAT_SETTINGS.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: lastMessage.content }
      ],
      temperature: CHAT_SETTINGS.TEMPERATURE,
      onFinish: async ({ text }) => {
        try {
          await supabase.from('chat_messages').insert([
            { session_id: sessionId, role: 'user', content: lastMessage.content },
            { session_id: sessionId, role: 'ai', content: text }
          ]);
        } catch (error) {
          console.error('Error saving chat messages:', error);
        }
      }
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}