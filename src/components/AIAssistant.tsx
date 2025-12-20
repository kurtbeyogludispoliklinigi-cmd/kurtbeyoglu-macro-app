// @ts-nocheck
'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, AlertCircle, Mic, Paperclip } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function AIAssistant() {
    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [files, setFiles] = useState<FileList | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isListening, setIsListening] = useState(false);

    // Voice Recognition Logic
    const toggleListening = () => {
        if (isListening) {
            setIsListening(false);
            return; // Managed by onend usually, but manual stop here if needed depends on API
        }

        if (!('webkitSpeechRecognition' in window)) {
            alert('Tarayıcınız sesli komut özelliğini desteklemiyor.');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            handleInputChange({ target: { value: (input || '') + ' ' + transcript } } as any);
        };
        recognition.onerror = (event: any) => {
            console.error(event.error);
            setIsListening(false);
        };
        recognition.onend = () => setIsListening(false);

        recognition.start();
    };

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
                className="fixed bottom-40 md:bottom-6 right-6 p-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105 z-50 flex items-center gap-2"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && <span className="font-semibold px-1">Asistan</span>}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-60 md:bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-300" style={{ height: '500px' }}>

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
                                    <button className="text-xs bg-white border p-2 rounded hover:bg-teal-50" onClick={() => handleInputChange({ target: { value: "Bugünkü randevularım?" } } as any)}>
                                        "Bugünkü randevularım?"
                                    </button>
                                    <button className="text-xs bg-white border p-2 rounded hover:bg-teal-50" onClick={() => handleInputChange({ target: { value: "Toplam ciromuz ne kadar?" } } as any)}>
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
                                    {/* Display Attachments if any */}
                                    {m.experimental_attachments?.map((attachment, index) => (
                                        <div key={index} className="mb-2">
                                            {attachment.contentType?.startsWith('image/') && (
                                                <img
                                                    src={attachment.url}
                                                    alt="attachment"
                                                    className="max-w-full rounded-lg max-h-40 object-cover"
                                                />
                                            )}
                                        </div>
                                    ))}
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs p-2 bg-red-50 rounded">
                                <AlertCircle size={14} />
                                <span>
                                    {/* Try to parse error message if it's JSON string or default fallback */}
                                    {error.message?.includes('{')
                                        ? JSON.parse(error.message).details || 'Bir hata oluştu.'
                                        : 'Yapay zeka servisine ulaşılamıyor (API Key eksik olabilir).'}
                                </span>
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

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t space-y-2">
                        {/* Image Preview */}
                        {files && files.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {Array.from(files).map((file, i) => (
                                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="preview" />
                                        <button
                                            onClick={() => setFiles(undefined)}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();

                                const currentFiles = files;
                                setFiles(undefined); // Clear UI immediately

                                let attachments: FileList | undefined | any[] = currentFiles;

                                if (currentFiles && currentFiles.length > 0) {
                                    attachments = await Promise.all(
                                        Array.from(currentFiles).map(async (file) => {
                                            return new Promise((resolve, reject) => {
                                                const reader = new FileReader();
                                                reader.onload = () => resolve({
                                                    name: file.name,
                                                    contentType: file.type,
                                                    url: reader.result as string
                                                });
                                                reader.onerror = reject;
                                                reader.readAsDataURL(file);
                                            });
                                        })
                                    );
                                }

                                handleSubmit(e, {
                                    experimental_attachments: attachments as any,
                                });
                            }}
                            className="flex gap-2 items-center"
                        >
                            {/* File Upload */}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files) setFiles(e.target.files);
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-gray-400 hover:text-teal-600 transition"
                                title="Resim Ekle"
                            >
                                <Paperclip size={20} />
                            </button>

                            {/* Voice Input */}
                            <button
                                type="button"
                                onClick={toggleListening}
                                className={cn(
                                    "p-2 transition rounded-full",
                                    isListening ? "bg-red-100 text-red-500 animate-pulse" : "text-gray-400 hover:text-teal-600"
                                )}
                                title="Sesli Yaz"
                            >
                                <Mic size={20} />
                            </button>

                            <input
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                value={input ?? ''}
                                onChange={handleInputChange}
                                placeholder="Bir soru sorun..."
                                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder:text-gray-500"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || (!(input ?? '').trim() && (!files || files.length === 0))}
                                className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 transition"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
