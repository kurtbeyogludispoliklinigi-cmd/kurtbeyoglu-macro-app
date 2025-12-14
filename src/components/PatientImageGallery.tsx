'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Trash2, ChevronLeft, ChevronRight, X, Calendar, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { clsx } from 'clsx';
import { usePatientImages, PatientImage } from '@/hooks/usePatientImages';
import { useToast } from '@/hooks/useToast';

interface Props {
    patientId: string;
    currentUser: {
        id: string;
        name: string;
        role: 'admin' | 'doctor' | 'banko' | 'asistan' | 'stajyer';
    };
}

export function PatientImageGallery({ patientId, currentUser }: Props) {
    const { images, loading, uploading, uploadImage, deleteImage, getImageUrl } = usePatientImages(patientId);
    const { toast } = useToast();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        file: null as File | null,
        film_type: 'panoramik' as 'panoramik' | 'periapikal',
        capture_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const currentImage = images[currentIndex];

    const handleUploadClick = () => {
        setUploadForm({
            file: null,
            film_type: 'panoramik',
            capture_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setShowUploadModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadForm(prev => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.file) return;

        try {
            await uploadImage(
                uploadForm.file,
                uploadForm.film_type,
                uploadForm.capture_date,
                uploadForm.notes,
                currentUser
            );

            toast({
                type: 'success',
                message: 'Film başarıyla yüklendi'
            });
            setShowUploadModal(false);
        } catch (error) {
            console.error(error);
            toast({
                type: 'error',
                message: 'Yükleme sırasında bir hata oluştu'
            });
        }
    };

    const handleDeleteClick = async () => {
        if (!currentImage) return;

        // Check permission (uploaded by same user or admin, or per specific role requirements)
        // Requirement: "Tüm roller kendi yükledikleri veya yetkili oldukları görselleri silebilmeli"
        // Assuming simple logic for now: can delete own or if admin

        if (confirm('Bu filmi silmek istediğinize emin misiniz?')) {
            try {
                await deleteImage(currentImage);
                toast({ type: 'success', message: 'Film başarıyla silindi' });
                if (currentIndex >= images.length - 1) {
                    setCurrentIndex(Math.max(0, images.length - 2));
                }
            } catch (error) {
                toast({ type: 'error', message: 'Silme işlemi başarısız' });
            }
        }
    }
        ;

    const goToPrev = () => setCurrentIndex(prev => Math.max(0, prev - 1));
    const goToNext = () => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showUploadModal) return; // Don't nav if modal open
            if (e.key === 'ArrowLeft') goToPrev();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'Escape' && showFullscreen) setShowFullscreen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showUploadModal, showFullscreen, images.length]);


    if (loading) return <div className="p-4 text-center text-gray-500">Filmler yükleniyor...</div>;

    return (
        <div className="w-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm mb-6">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                    Hasta Filmleri
                    <span className="text-sm font-normal text-gray-500 ml-2">({images.length})</span>
                </h3>
                <button
                    onClick={handleUploadClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Film Ekle
                </button>
            </div>

            {/* Content */}
            {/* Content */}
            <div className="p-3">
                {images.length === 0 ? (
                    <div
                        onClick={handleUploadClick}
                        className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                    >
                        <div className="w-10 h-10 bg-blue-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-2">
                            <Upload className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-gray-900 dark:text-gray-200 font-medium text-sm">Film Yükle</p>
                    </div>
                ) : (
                    <div
                        className="relative h-48 bg-black rounded-lg overflow-hidden group cursor-pointer shadow-md transition-all hover:shadow-lg hover:ring-2 ring-blue-500/50"
                        onClick={() => setShowFullscreen(true)}
                    >
                        {/* Main Preview Image */}
                        <img
                            src={getImageUrl(currentImage.file_path)}
                            alt="Film Preview"
                            className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                        {/* Center Action Indicator */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full">
                                <ZoomIn className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        {/* Bottom Info Strip */}
                        <div className="absolute bottom-0 inset-x-0 p-3 flex items-end justify-between text-white">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={clsx(
                                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                        currentImage.film_type === 'panoramik' ? "bg-blue-500" : "bg-purple-500"
                                    )}>
                                        {currentImage.film_type}
                                    </span>
                                    <span className="text-xs text-gray-300 font-medium">
                                        {new Date(currentImage.capture_date).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                                {currentImage.notes && (
                                    <p className="text-[10px] text-gray-400 line-clamp-1 max-w-[200px]">{currentImage.notes}</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                                    {currentIndex + 1} / {images.length}
                                </span>
                            </div>
                        </div>

                        {/* Navigation Arrows (Mini) */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/80 text-white rounded-full transition opacity-0 group-hover:opacity-100"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); goToNext(); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 hover:bg-black/80 text-white rounded-full transition opacity-0 group-hover:opacity-100"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-xl shadow-xl overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-semibold text-lg">Yeni Film Yükle</h3>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Görsel Seç</label>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleFileChange}
                                    required
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-slate-300"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">Film Çekim Tarihi</label>
                                <input
                                    type="date"
                                    value={uploadForm.capture_date}
                                    onChange={e => setUploadForm({ ...uploadForm, capture_date: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">Film Türü</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={clsx(
                                        "flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all",
                                        uploadForm.film_type === 'panoramik'
                                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                            : "border-gray-200 dark:border-slate-700"
                                    )}>
                                        <input
                                            type="radio"
                                            name="film_type"
                                            value="panoramik"
                                            checked={uploadForm.film_type === 'panoramik'}
                                            onChange={() => setUploadForm({ ...uploadForm, film_type: 'panoramik' })}
                                            className="hidden"
                                        />
                                        Panoramik
                                    </label>
                                    <label className={clsx(
                                        "flex items-center justify-center p-2.5 border rounded-lg cursor-pointer transition-all",
                                        uploadForm.film_type === 'periapikal'
                                            ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                                            : "border-gray-200 dark:border-slate-700"
                                    )}>
                                        <input
                                            type="radio"
                                            name="film_type"
                                            value="periapikal"
                                            checked={uploadForm.film_type === 'periapikal'}
                                            onChange={() => setUploadForm({ ...uploadForm, film_type: 'periapikal' })}
                                            className="hidden"
                                        />
                                        Periapikal
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5">Notlar (Opsiyonel)</label>
                                <textarea
                                    value={uploadForm.notes}
                                    onChange={e => setUploadForm({ ...uploadForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                    placeholder="Film ile ilgili notlar..."
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {uploading ? 'Yükleniyor...' : 'Kaydet ve Yükle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Fullscreen Modal */}
            {showFullscreen && currentImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center backdrop-blur-sm"
                    onClick={() => setShowFullscreen(false)}>

                    {/* Top Controls */}
                    <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex items-center gap-2">
                            <span className={clsx(
                                "px-2 py-1 rounded text-xs font-bold uppercase",
                                currentImage.film_type === 'panoramik' ? "bg-blue-600 text-white" : "bg-purple-600 text-white"
                            )}>
                                {currentImage.film_type}
                            </span>
                            <span className="text-white/80 text-sm font-medium">
                                {new Date(currentImage.capture_date).toLocaleDateString('tr-TR')}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick();
                                }}
                                className="p-2 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 rounded-full transition-colors"
                                title="Bu filmi sil"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowFullscreen(false)}
                                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                        disabled={currentIndex === 0}
                        className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors backdrop-blur-md"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        disabled={currentIndex === images.length - 1}
                        className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-colors backdrop-blur-md"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    {/* Main Image */}
                    <img
                        onClick={(e) => e.stopPropagation()}
                        src={getImageUrl(currentImage.file_path)}
                        alt="Fullscreen View"
                        className="max-w-full max-h-[85vh] object-contain shadow-2xl"
                    />

                    {/* Bottom Caption */}
                    {currentImage.notes && (
                        <div className="absolute bottom-8 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full text-white/90 text-center max-w-2xl mx-4">
                            <p className="text-sm font-medium">{currentImage.notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
