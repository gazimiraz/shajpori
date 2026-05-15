'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Brain, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date; }

const EXAMPLES = [
  'What were my top 5 products by revenue last month?',
  'Which customers are at risk of churning?',
  'Show me low-stock items that need replenishment',
  'What is my projected revenue for next month?',
  'Which product categories have the highest margins?',
];

export default function AIQueryPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your AI Sales Intelligence assistant. Ask me anything about your business data — sales trends, inventory, customers, forecasts, and more.", timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const queryMutation = useMutation({
    mutationFn: (query: string) => api.post('/ai/query', { query }).then(r => r.data.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: 'assistant', content: data.response ?? data.answer ?? JSON.stringify(data), timestamp: new Date() }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't process that query. Please try rephrasing or check your data connection.", timestamp: new Date() }]);
    },
  });

  const send = (q?: string) => {
    const query = q ?? input.trim();
    if (!query) return;
    setMessages(prev => [...prev, { role: 'user', content: query, timestamp: new Date() }]);
    setInput('');
    queryMutation.mutate(query);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div><h1 className="text-2xl font-bold">AI Query</h1><p className="text-muted-foreground text-sm">Natural language business intelligence</p></div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Chat area */}
        <Card className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-purple-500 to-blue-600' : 'bg-primary'}`}>
                    {msg.role === 'assistant' ? <Sparkles className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}`}>
                    {msg.content.split('\n').map((line, j) => <p key={j} className={j > 0 ? 'mt-1' : ''}>{line}</p>)}
                    <p className={`text-xs mt-1.5 opacity-60 ${msg.role === 'user' ? 'text-right' : ''}`}>{msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </motion.div>
              ))}
              {queryMutation.isPending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Analyzing your data...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </Card>

        {/* Example queries */}
        {messages.length <= 1 && (
          <div className="flex gap-2 flex-wrap">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => send(ex)} className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about your business data..."
            disabled={queryMutation.isPending}
            className="flex-1"
          />
          <Button onClick={() => send()} disabled={queryMutation.isPending || !input.trim()} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
