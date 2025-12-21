import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Check availability of API Key
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error: 'API Key Missing',
                    details: 'Sistem yöneticisi Vercel panelinden GOOGLE_GENERATIVE_AI_API_KEY tanımlamalıdır.'
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const result = await streamText({
            model: google('gemini-2.0-flash-exp'),
            messages,
            system: `Sen 'Özel Kurtbeyoğlu Ağız ve Diş Sağlığı Polikliniği' klinik yönetim sisteminin süper zeki yapay zeka asistanısın. 
    Kullanıcıya nazik, profesyonel ve yardımcı bir dille cevap ver. 
    
    ÖNEMLİ YETENEKLERİN:
    1. Fotoğrafları analiz edebilirsin (el yazısı notlar, reçeteler vb.).
    2. Sesli komutları veya doğal dille yazılan istekleri "Aksiyonlara" dönüştürebilirsin.
    
    KURALLAR:
    - Eğer kullanıcı bir işlem yapmak istiyorsa (Randevu ver, Hasta ekle), ilgili "Tool"u çağır.
    - Emin değilsen kullanıcıdan detay iste.
    - Telefon numaraları kesinlikle 10 haneli ve başında 5 olacak şekilde (5XX XXX XX XX) sistemde tutulur. Kullanıcı eksik verirse uyar.
    - Tarihleri her zaman ISO formatında (YYYY-MM-DDTHH:MM:SS) argüman olarak ver. Bugünün tarihi: ${new Date().toISOString()}`,
            tools: {
                createPatient: tool({
                    description: 'Yeni bir hasta kartı oluşturmak için kullanılır. İsim ve telefon zorunludur.',
                    parameters: z.object({
                        name: z.string().describe('Hastanın adı ve soyadı'),
                        phone: z.string().describe('Hastanın telefon numarası (5 ile başlamalı). Örn: 5321234567'),
                        anamnez: z.string().optional().describe('Varsa hastanın şikayeti veya hikayesi'),
                    }),
                }),
                createAppointment: tool({
                    description: 'Randevu oluşturmak için kullanılır.',
                    parameters: z.object({
                        patientName: z.string().describe('Randevu alınacak hastanın adı'),
                        date: z.string().describe('Randevu tarihi (YYYY-MM-DD formatında)'),
                        time: z.string().describe('Randevu saati (HH:MM)'),
                        notes: z.string().optional().describe('Randevu notu'),
                    }),
                }),
                createTreatment: tool({
                    description: 'Yapılan bir tedaviyi veya işlemin ücretini girmek için kullanılır.',
                    parameters: z.object({
                        patientName: z.string().describe('İşlem yapılan hasta adı'),
                        procedure: z.string().describe('Yapılan işlem (Kanal, Dolgu vb.)'),
                        cost: z.number().describe('İşlem ücreti (TL)'),
                        toothNo: z.string().optional().describe('Varsa diş numarası'),
                        notes: z.string().optional().describe('İşlem notları'),
                    }),
                }),
            },
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('AI Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
