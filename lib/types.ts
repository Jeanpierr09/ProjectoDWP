export interface Document {
  id: number;
  file_name: string;
  status: 'pending' | 'processing' | 'completed';
  created_at?: string;
}

export interface DocumentVector {
  id: number;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

export interface ChatMessage {
  id: number;
  session_id: string;
  role: 'user' | 'ai';
  content: string;
  created_at?: string;
}

export interface MatchDocumentsResponse {
  content: string;
  similarity: number;
}

// SQL function type for match_documents
export const MATCH_DOCUMENTS_SQL = `
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dv.content,
    1 - (dv.embedding <=> query_embedding) as similarity
  FROM document_vectors dv
  WHERE 1 - (dv.embedding <=> query_embedding) > match_threshold
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`;