'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
}

export function useSpeechToText() {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            const supported = !!SpeechRecognitionAPI;
            if (supported) {
                // Defer state update to avoid synchronous render warning
                setTimeout(() => setIsSupported(true), 0);
            }

            if (SpeechRecognitionAPI) {
                const recognition = new SpeechRecognitionAPI();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'tr-TR'; // Turkish language

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    let finalTranscript = '';
                    let interimTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const result = event.results[i];
                        if (result.isFinal) {
                            finalTranscript += result[0].transcript;
                        } else {
                            interimTranscript += result[0].transcript;
                        }
                    }

                    setTranscript(prev => prev + finalTranscript + interimTranscript);
                };

                recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                    console.error('Speech recognition error:', event.error);
                    setError(event.error);
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onstart = () => {
                    setIsListening(true);
                    setError(null);
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const start = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            setError(null);
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.error('Failed to start speech recognition:', e);
            }
        }
    }, [isListening]);

    const stop = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const reset = useCallback(() => {
        setTranscript('');
        setError(null);
    }, []);

    return {
        transcript,
        isListening,
        isSupported,
        error,
        start,
        stop,
        reset,
    };
}
