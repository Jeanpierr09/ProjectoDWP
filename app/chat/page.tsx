"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
  const sessionId = useRef(uuidv4());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sessionId.current,
    resume: false
  });

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Estado local para el input
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSend = () => {
    const value = inputRef.current?.value;
    if (value && value.trim() !== "") {
      sendMessage({ text: value });
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="container max-w-4xl py-8 h-[calc(100vh-4rem)]">
      <Card className="h-full flex flex-col">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message: any) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <CardContent className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <Input
              ref={inputRef}
              placeholder="Escribe tu mensaje..."
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button type="button" size="icon" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}