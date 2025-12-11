import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

export interface PatientImage {
    id: string;
    patient_id: string;
    file_path: string;
    file_name: string;
    film_type: 'panoramik' | 'periapikal';
    capture_date: string;
    notes?: string;
    uploaded_by_name: string;
    created_at: string;
}

export function usePatientImages(patientId: string) {
    const [images, setImages] = useState<PatientImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!patientId) return;

        fetchImages();

        const channel = supabase
            .channel(`patient-images-${patientId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'patient_images', filter: `patient_id=eq.${patientId}` },
                () => fetchImages()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [patientId]);

    const fetchImages = async () => {
        try {
            const { data, error } = await supabase
                .from('patient_images')
                .select('*')
                .eq('patient_id', patientId)
                .order('capture_date', { ascending: false });

            if (error) throw error;
            setImages(data || []);
        } catch (error) {
            console.error('Error fetching images:', error);
        } finally {
            setLoading(false);
        }
    };

    const uploadImage = async (
        file: File,
        filmType: 'panoramik' | 'periapikal',
        captureDate: string,
        notes?: string,
        currentUser?: { id: string; name: string }
    ) => {
        setUploading(true);
        try {
            // 1. Compress image
            const options = {
                maxSizeMB: 2,
                maxWidthOrHeight: 1920,
                useWebWorker: true
            };

            let compressedFile = file;
            try {
                compressedFile = await imageCompression(file, options);
            } catch (e) {
                console.warn('Compression failed, using original file', e);
            }

            // Check size limit (10MB)
            if (compressedFile.size > 10 * 1024 * 1024) {
                throw new Error('Dosya boyutu çok büyük (Max 10MB)');
            }

            // 2. Upload to Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${patientId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('patient-images')
                .upload(fileName, compressedFile);

            if (uploadError) throw uploadError;

            // 3. Insert into DB
            const { error: dbError } = await supabase
                .from('patient_images')
                .insert({
                    patient_id: patientId,
                    file_path: fileName,
                    file_name: file.name,
                    file_size: compressedFile.size,
                    mime_type: compressedFile.type,
                    film_type: filmType,
                    capture_date: captureDate,
                    notes: notes,
                    uploaded_by: currentUser?.id,
                    uploaded_by_name: currentUser?.name
                });

            if (dbError) throw dbError;

            return { success: true };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        } finally {
            setUploading(false);
        }
    };

    const deleteImage = async (image: PatientImage) => {
        try {
            const { error: storageError } = await supabase.storage
                .from('patient-images')
                .remove([image.file_path]);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from('patient_images')
                .delete()
                .eq('id', image.id);

            if (dbError) throw dbError;

            return { success: true };
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    };

    const getImageUrl = (filePath: string) => {
        const { data } = supabase.storage.from('patient-images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    return {
        images,
        loading,
        uploading,
        uploadImage,
        deleteImage,
        getImageUrl
    };
}
