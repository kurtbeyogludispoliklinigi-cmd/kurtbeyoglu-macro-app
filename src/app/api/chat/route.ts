// @ts-nocheck
import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';



export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // Server-side Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase environment variables are not set');
            return new Response(
                JSON.stringify({ error: 'Supabase configuration missing' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check if API key is available
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
            console.error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
            return new Response(
                JSON.stringify({ error: 'API key not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const result = await streamText({
            model: google('gemini-1.5-flash'),
            messages,
            system: `Sen 'DentistNote Pro' diş kliniği yönetim sisteminin yapay zeka asistanısın. 
    Kullanıcıya nazik, profesyonel ve yardımcı bir dille cevap ver. 
    Sadece sistemdeki verilerle ilgili soruları cevapla. 
    Eğer bir işlem yapman istenirse (veri çekme gibi) ilgili araçları kullan.
    Gizliliğe önem ver.
    Grafik çizmen istenirse, verileri analiz et ve özetle.`,
            tools: {
                getDoctors: tool({
                    description: 'Klinikteki tüm hekimleri listeler',
                    parameters: z.object({}),
                    execute: async (): Promise<any> => {
                        const { data, error } = await supabase.from('doctors').select('*');
                        if (error) return { error: error.message };
                        return data;
                    },
                }),
                getPatients: tool({
                    description: 'Tüm hastaları veya isme göre filtrelenmiş hastaları listeler',
                    parameters: z.object({
                        search: z.string().optional().describe('Hasta adı veya telefon araması için'),
                    }),
                    execute: async ({ search }: { search?: string }): Promise<any> => {
                        let query = supabase.from('patients').select('*');
                        if (search) {
                            query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
                        }
                        const { data, error } = await query.limit(20);
                        if (error) return { error: error.message };
                        return data;
                    },
                }),
                getTotalIncome: tool({
                    description: 'Klinik toplam gelirini hesaplar (tüm tedaviler)',
                    parameters: z.object({}),
                    execute: async (): Promise<any> => {
                        const { data, error } = await supabase.from('treatments').select('cost');
                        if (error) return { error: error.message };
                        const total = data.reduce((acc, curr) => acc + (curr.cost || 0), 0);
                        return { totalIncome: total, currency: 'TL' };
                    },
                }),
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Chat API Error:', error);
        return new Response(
            JSON.stringify({
                error: 'An error occurred while processing your request',
                details: error instanceof Error ? error.message : 'Unknown error'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
