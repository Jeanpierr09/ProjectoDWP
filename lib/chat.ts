import { ChatCompletionRequestMessage } from 'openai-edge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'ai';
  content: string;
}

export interface DatabaseMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface RelevantDocument {
  content: string;
  similarity: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  sessionId?: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

export type OpenAIResponse = {
  data: Array<{
    embedding: number[];
  }>;
}

export const CHAT_SETTINGS = {
  MAX_HISTORY_LENGTH: 10,
  SIMILARITY_THRESHOLD: 0.7,
  MAX_CONTEXT_CHUNKS: 5,
  TEMPERATURE: 0.7,
  MODEL: 'gpt-4-1106-preview',
  EMBEDDING_MODEL: 'text-embedding-ada-002'
} as const;

export function createSystemPrompt(context: string, history: string): string {
  return `Eres un asistente especializado en responder preguntas basadas en documentos. Tu tarea es:

1. Analizar cuidadosamente el contexto proporcionado
2. Considerar el historial de la conversación para mantener coherencia
3. Responder de manera precisa y concisa
4. Si la información no está en el contexto, decirlo honestamente
5. No inventar ni inferir información que no esté en el contexto

Contexto del documento:
----------------
${context || 'No hay contexto disponible para esta pregunta.'}
----------------

Historial de la conversación:
----------------
${history || 'No hay historial previo.'}
----------------

Responde la siguiente pregunta del usuario usando SOLO la información proporcionada arriba.`;
}

export function formatChatHistory(messages: ChatMessage[]): string {
  return messages
    .map(msg => `${msg.role === 'assistant' ? 'AI' : 'Usuario'}: ${msg.content}`)
    .join('\n');
}