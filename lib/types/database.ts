export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: number;
          file_name: string;
          status: 'pending' | 'processing' | 'completed';
          created_at?: string;
        };
        Insert: {
          file_name: string;
          status: 'pending' | 'processing' | 'completed';
        };
        Update: {
          file_name?: string;
          status?: 'pending' | 'processing' | 'completed';
        };
      };
      document_vectors: {
        Row: {
          id: number;
          content: string;
          embedding: number[];
          metadata: Record<string, any>;
          created_at?: string;
        };
        Insert: {
          content: string;
          embedding: number[];
          metadata: Record<string, any>;
        };
        Update: {
          content?: string;
          embedding?: number[];
          metadata?: Record<string, any>;
        };
      };
      chat_messages: {
        Row: {
          id: number;
          session_id: string;
          role: 'user' | 'ai';
          content: string;
          created_at?: string;
        };
        Insert: {
          session_id: string;
          role: 'user' | 'ai';
          content: string;
        };
        Update: {
          session_id?: string;
          role?: 'user' | 'ai';
          content?: string;
        };
      };
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: Array<{
          content: string;
          similarity: number;
        }>;
      };
    };
  };
}