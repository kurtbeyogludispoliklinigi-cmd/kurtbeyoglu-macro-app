// @ts-nocheck
'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function AIAssistant() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105 z-50 flex items-center gap-2"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && <span className="font-semibold px-1">Asistan</span>}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-300" style={{ height: '500px' }}>

                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 flex items-center gap-2 text-white">
                        <Sparkles size={18} className="animate-pulse" />
                        <span className="font-bold">Gemini Klinik Asistanı</span>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 text-sm mt-10 space-y-2">
                                <Sparkles className="mx-auto text-teal-300" size={32} />
                                <p>Merhaba! Size nasıl yardımcı olabilirim?</p>
                                <div className="grid grid-cols-1 gap-2 mt-4 px-4">
                                    <button className="text-xs bg-white border p-2 rounded hover:bg-teal-50" onClick={() => { /* TODO: pre-fill */ }}>
                                        "Bugünkü randevularım?"
                                    </button>
                                    <button className="text-xs bg-white border p-2 rounded hover:bg-teal-50">
                                        "Toplam ciromuz ne kadar?"
                                    </button>
                                </div>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={cn(
                                    "flex w-full",
                                    m.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[80%] p-3 rounded-2xl text-sm",
                                        m.role === 'user'
                                            ? "bg-teal-600 text-white rounded-tr-none"
                                            : "bg-white border shadow-sm text-gray-800 rounded-tl-none"
                                    )}
                                >
                                    {/* Basic markdown rendering can be added here if needed */}
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs p-2 bg-red-50 rounded">
                                <AlertCircle size={14} />
                                <span>Bir hata oluştu. API anahtarını kontrol edin.</span>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 bg-white border-t flex gap-2">
                        <input
                            value={input ?? ''}
                            onChange={handleInputChange}
                            placeholder="Bir soru sorun..."
                            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !(input ?? '').trim()}
                            className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 transition"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
