import React, { useState } from "react";
import { Send } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AssistantPanelProps {
  title: string;
  initialMessages?: Message[];
  onSendMessage?: (message: string) => void;
}

export function AssistantPanel({ title, initialMessages = [], onSendMessage }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue("");
    
    if (onSendMessage) {
      onSendMessage(newUserMsg.content);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] border-l border-[var(--color-border)] shadow-[-4px_0_16px_rgba(21,21,26,0.04)] w-[320px] lg:w-[380px] shrink-0">
      <div className="p-[var(--spacing-4)] border-b border-[var(--color-border)]">
        <h3 className="text-h3 text-[var(--color-ink)]">{title}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-[var(--spacing-4)] flex flex-col gap-[var(--spacing-4)]">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-body text-[var(--color-ink-faint)] italic">
            No messages yet.
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "self-end items-end" : "self-start items-start"}`}
            >
              <div 
                className={`rounded-[var(--radius-lg)] p-[var(--spacing-3)] ${
                  msg.role === "user" 
                    ? "bg-[var(--color-accent)] text-white rounded-br-sm" 
                    : "bg-[var(--color-surface-sunken)] text-[var(--color-ink)] rounded-bl-sm"
                }`}
              >
                <p className="text-body whitespace-pre-wrap">{msg.content}</p>
              </div>
              <span className="text-[10px] text-[var(--color-ink-faint)] mt-1 uppercase">
                {msg.role}
              </span>
            </div>
          ))
        )}
      </div>
      
      <div className="p-[var(--spacing-4)] border-t border-[var(--color-border)]">
        <div className="flex items-center gap-[var(--spacing-2)] bg-[var(--color-canvas)] rounded-[var(--radius-lg)] border border-[var(--color-border)] px-[var(--spacing-3)] py-[var(--spacing-2)] focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)] transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-body text-[var(--color-ink)] placeholder-[var(--color-ink-faint)]"
          />
          <button 
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="text-[var(--color-accent)] disabled:text-[var(--color-ink-faint)] hover:opacity-80 transition-opacity"
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
