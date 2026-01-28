import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageFile } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { generateThumbnailSketch, refineThumbnailSketch, ThumbnailMetadata } from './services/geminiService';

// --- Global AI Studio Helpers ---
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

// --- Icons ---

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-8 h-8"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-5 h-5"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 3v13.5M8.25 12.75 12 16.5l3.75-3.75" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className || "w-4 h-4"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
);

const ArrowPathIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const AdjustIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-5 h-5"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Components ---

interface ImageUploaderProps {
    onImageUpload: (imageFile: ImageFile) => void;
    previewUrl?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, previewUrl }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = async (files: FileList | null) => {
        if (files && files[0]) {
            const file = files[0];
            try {
                const { base64, mimeType } = await fileToBase64(file);
                onImageUpload({ file, base64, mimeType });
            } catch (error) {
                console.error("Error converting file to base64", error);
                alert("Could not process file. Please try another image.");
            }
        }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    };

    return (
        <div className="w-full group">
            <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-gray-300 flex items-center">
                    <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">1</span>
                    Your Face (Preserve Identity)
                </label>
                {previewUrl && <span className="text-xs text-blue-400 group-hover:underline cursor-pointer">Change image</span>}
            </div>
            
            <label
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col justify-center items-center w-full h-48 transition-all duration-300 rounded-xl cursor-pointer overflow-hidden
                ${previewUrl ? 'border-none' : 'border-2 border-dashed'} 
                ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500'}
                `}
            >
                {previewUrl ? (
                    <>
                        <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <span className="text-white font-medium flex items-center gap-2">
                                <PhotoIcon /> Replace Face
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center space-y-3 p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                            <UploadIcon />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-gray-300">Upload identity reference</p>
                            <p className="text-xs text-gray-500">Free, fast generation</p>
                        </div>
                    </div>
                )}
                <input type="file" name="file_upload" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} />
            </label>
        </div>
    );
};

interface BrandAssetUploaderProps {
    assets: ImageFile[];
    onAssetsChange: (assets: ImageFile[]) => void;
}

const BrandAssetUploader: React.FC<BrandAssetUploaderProps> = ({ assets, onAssetsChange }) => {
    const handleFileChange = async (files: FileList | null) => {
        if (files) {
            const newAssets: ImageFile[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (assets.length + newAssets.length >= 2) break;
                try {
                    const { base64, mimeType } = await fileToBase64(file);
                    newAssets.push({ file, base64, mimeType });
                } catch (error) {
                    console.error("Error processing asset", error);
                }
            }
            onAssetsChange([...assets, ...newAssets]);
        }
    };

    const removeAsset = (index: number) => {
        const updated = [...assets];
        updated.splice(index, 1);
        onAssetsChange(updated);
    };

    return (
        <div className="w-full">
            <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">3</span>
                Branding Assets
            </label>
            
            <div className="flex gap-3 overflow-x-auto pb-2">
                {assets.map((asset, idx) => (
                    <div key={idx} className="relative w-20 h-20 shrink-0 rounded-lg border border-gray-700 overflow-hidden group">
                        <img src={URL.createObjectURL(asset.file)} alt="Asset" className="w-full h-full object-cover bg-gray-800" />
                        <button 
                            onClick={() => removeAsset(idx)}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                ))}

                {assets.length < 2 && (
                    <label className="w-20 h-20 shrink-0 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30 hover:bg-gray-800 hover:border-gray-500 cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 transition-all">
                        <span className="text-2xl font-light">+</span>
                        <span className="text-[10px] font-medium">Add Logo</span>
                        <input type="file" multiple className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} />
                    </label>
                )}
            </div>
        </div>
    );
};

interface TextInputProps {
    label: string;
    step?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    variant?: 'default' | 'small';
}
const TextInput: React.FC<TextInputProps> = ({ label, step, value, onChange, placeholder, variant = 'default' }) => {
    return (
        <div className="w-full">
            <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                {step && <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">{step}</span>}
                {label}
            </label>
            <div className="relative group">
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`w-full px-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${variant === 'small' ? 'py-2 text-sm' : 'py-3'}`}
                />
            </div>
        </div>
    );
};

const SegmentedControl = ({ options, selected, onSelect, label, step }: { options: { value: string, label: string }[], selected: string, onSelect: (val: string) => void, label: string, step: string }) => {
    return (
        <div className="w-full">
            <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">{step}</span>
                {label}
            </label>
            <div className="grid grid-cols-4 gap-2 p-1 bg-gray-900/50 rounded-xl border border-gray-700">
                {options.map((opt) => {
                    const isActive = selected === opt.value;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onSelect(opt.value)}
                            className={`relative py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                        >
                            {opt.value}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

interface DropdownProps<T> {
    label: string;
    step?: string;
    options: T[];
    selected: T;
    onSelect: (item: T) => void;
    renderOption: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string | number;
}

const Dropdown = <T,>({ label, step, options, selected, onSelect, renderOption, keyExtractor }: DropdownProps<T>) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full relative" ref={containerRef}>
            <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                {step && <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">{step}</span>}
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-left flex justify-between items-center transition-all hover:border-gray-600 ${isOpen ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
            >
                <div className="flex-1 truncate flex items-center">{renderOption(selected)}</div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-30 mt-2 w-full bg-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-hidden">
                    {options.map((option) => (
                        <div
                            key={keyExtractor(option)}
                            onClick={() => { onSelect(option); setIsOpen(false); }}
                            className={`cursor-pointer select-none relative py-2.5 pl-4 pr-4 hover:bg-blue-500/20 transition-colors ${keyExtractor(selected) === keyExtractor(option) ? 'bg-blue-500/10 text-blue-200' : 'text-gray-300'}`}
                        >
                            {renderOption(option)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

interface Palette {
    name: string;
    colors: string[];
}

const palettes: Palette[] = [
    { name: 'YouTube', colors: ['#FF0000', '#FFFFFF', '#282828'] },
    { name: 'LinkedIn', colors: ['#0A66C2', '#FFFFFF', '#434649'] },
    { name: 'Vibrant', colors: ['#FF3E3E', '#FFC107', '#00D1FF', '#FFFFFF'] },
    { name: 'Neon', colors: ['#39FF14', '#FF40E3', '#00FFFF', '#FDFD96'] },
    { name: 'Cyberpunk', colors: ['#FCEE0A', '#00F0FF', '#FF003C', '#120458'] }
];

const autoPalette: Palette = { name: 'Auto', colors: [] };
const generationStyles = ['Professional', 'Casual', 'Cinematic', '3D Render', 'Comic Book', 'Retro'];

export default function App() {
    const [faceImage, setFaceImage] = useState<ImageFile | null>(null);
    const [inputMode, setInputMode] = useState<'title' | 'article'>('title');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [articleText, setArticleText] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [colorPalette, setColorPalette] = useState<Palette>(autoPalette);
    const [fontStyle, setFontStyle] = useState('Impact Style');
    const [generationStyle, setGenerationStyle] = useState('Professional');
    const [brandAssets, setBrandAssets] = useState<ImageFile[]>([]);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // Two-step state
    const [sketchImage, setSketchImage] = useState<string | null>(null);
    const [sketchMetadata, setSketchMetadata] = useState<ThumbnailMetadata | null>(null);
    const [finalImage, setFinalImage] = useState<string | null>(null);

    const handleImageUpload = (imageFile: ImageFile) => setFaceImage(imageFile);

    const resetSteps = () => {
        setSketchImage(null);
        setSketchMetadata(null);
        setFinalImage(null);
    }

    const handleGenerateSketch = async (isRegen = false) => {
        const hasContent = inputMode === 'title' ? !!title : !!articleText;
        if (!faceImage || !hasContent) {
            setError("Missing face reference or content details.");
            return;
        }

        setIsLoading(true);
        setError(null);
        if (!isRegen) resetSteps();

        try {
            const { sketchUrl, metadata } = await generateThumbnailSketch(
                { base64: faceImage.base64, mimeType: faceImage.mimeType },
                inputMode === 'title' ? title : '',
                inputMode === 'title' ? subtitle : '',
                inputMode === 'article' ? articleText : '',
                'Auto',
                generationStyle,
                aspectRatio,
                brandAssets.map(a => ({ base64: a.base64, mimeType: a.mimeType })),
                setLoadingMessage,
                isRegen ? sketchMetadata || undefined : undefined
            );
            setSketchImage(sketchUrl);
            setSketchMetadata(metadata);
        } catch (e: any) {
            setError(e.message || "Failed to strategize the layout.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleMetadataChange = (key: keyof ThumbnailMetadata, value: any) => {
        if (!sketchMetadata) return;
        setSketchMetadata({ ...sketchMetadata, [key]: value });
    }

    const handleFinalize = async () => {
        if (!sketchImage || !sketchMetadata || !faceImage) return;

        setIsLoading(true);
        setError(null);

        try {
            const resultUrl = await refineThumbnailSketch(
                sketchImage,
                { base64: faceImage.base64, mimeType: faceImage.mimeType },
                brandAssets.map(a => ({ base64: a.base64, mimeType: a.mimeType })),
                sketchMetadata,
                generationStyle,
                aspectRatio,
                colorPalette.name === 'Auto' ? null : colorPalette,
                fontStyle,
                setLoadingMessage
            );
            setFinalImage(resultUrl);
        } catch (e: any) {
            console.error("Masterpiece render failed", e);
            setError(e.message || "Final render failed. Try a different image or prompt.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }
    
    const handleDownload = () => {
        const img = finalImage || sketchImage;
        if (img) {
            const link = document.createElement('a');
            link.href = img;
            link.download = `thumbnail-${Date.now()}.png`;
            link.click();
        }
    };

    const canSubmit = faceImage && (inputMode === 'title' ? title : articleText) && !isLoading;

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-slate-200 font-sans">
            <style>{`
                @keyframes popIn { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
                .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
                .gradient-text { background: linear-gradient(135deg, #60A5FA 0%, #A855F7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            `}</style>
            
            <main className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
                <header className="flex flex-col items-center mb-16">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center mb-4">
                        <span className="gradient-text">Thumbnail</span> <span className="text-white">Gen</span>
                    </h1>
                    <p className="text-gray-400 max-w-xl text-center leading-relaxed">
                        Anchor your face in a strategic layout, then render a photorealistic thumbnail. Fast, free, and identity-preserved.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 space-y-6">
                        <div className="glass p-6 md:p-8 rounded-3xl space-y-8 shadow-2xl">
                            {!sketchImage ? (
                                <>
                                    <ImageUploader onImageUpload={handleImageUpload} previewUrl={faceImage ? URL.createObjectURL(faceImage.file) : undefined} />
                                    <div className="space-y-4">
                                        <div className="bg-gray-900/50 p-1 rounded-xl border border-gray-700 grid grid-cols-2 gap-1 mb-4">
                                            <button onClick={() => setInputMode('title')} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'title' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Quick Hook</button>
                                            <button onClick={() => setInputMode('article')} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'article' ? 'bg-gray-700 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Full Script</button>
                                        </div>
                                        {inputMode === 'title' ? (
                                            <div className="space-y-4">
                                                <TextInput label="Target Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title text hook..." />
                                                <TextInput label="Subtext" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Extra hook details..." />
                                            </div>
                                        ) : (
                                            <textarea value={articleText} onChange={(e) => setArticleText(e.target.value)} placeholder="Paste your article or script..." rows={6} className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                                        )}
                                    </div>
                                    <BrandAssetUploader assets={brandAssets} onAssetsChange={setBrandAssets} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Dropdown label="Style" options={generationStyles} selected={generationStyle} onSelect={setGenerationStyle} keyExtractor={o => o} renderOption={o => <span>{o}</span>} />
                                        <SegmentedControl label="Aspect Ratio" step="5" options={[{value: '16:9', label: 'YT'}, {value: '9:16', label: 'Short'}, {value: '1:1', label: 'Sq'}, {value: '4:3', label: 'Sd'}]} selected={aspectRatio} onSelect={setAspectRatio} />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6 animate-[popIn_0.3s_ease-out]">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-bold flex items-center gap-2"><AdjustIcon className="text-blue-400" /> Plan Refinement</h3>
                                        <button onClick={resetSteps} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Restart</button>
                                    </div>
                                    
                                    <div className="space-y-5">
                                        <TextInput variant="small" label="Impact Text" value={sketchMetadata?.clickbait_text || ''} onChange={(e) => handleMetadataChange('clickbait_text', e.target.value)} placeholder="Text on thumbnail..." />
                                        <TextInput variant="small" label="Action Pose" value={sketchMetadata?.visual_description || ''} onChange={(e) => handleMetadataChange('visual_description', e.target.value)} placeholder="Describe the action..." />
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400">Remarkable Hooks</label>
                                            <div className="flex flex-wrap gap-2">
                                                {sketchMetadata?.visual_hooks.map((h, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-blue-900/40 border border-blue-500/30 px-3 py-1 rounded-full text-xs text-blue-100">
                                                        <span>{h}</span>
                                                        <button onClick={() => handleMetadataChange('visual_hooks', sketchMetadata.visual_hooks.filter((_, idx) => idx !== i))} className="text-blue-400 hover:text-red-400">×</button>
                                                    </div>
                                                ))}
                                                <button onClick={() => { const h = prompt("Add visual hook:"); if(h) handleMetadataChange('visual_hooks', [...(sketchMetadata?.visual_hooks || []), h]) }} className="px-3 py-1 rounded-full border border-gray-700 text-xs hover:bg-gray-800 text-gray-400">+</button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400">Props</label>
                                            <div className="flex flex-wrap gap-2">
                                                {sketchMetadata?.props.map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full text-xs">
                                                        <span>{p}</span>
                                                        <button onClick={() => handleMetadataChange('props', sketchMetadata.props.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400">×</button>
                                                    </div>
                                                ))}
                                                <button onClick={() => { const p = prompt("Add prop:"); if(p) handleMetadataChange('props', [...(sketchMetadata?.props || []), p]) }} className="px-3 py-1 rounded-full border border-gray-700 text-xs hover:bg-gray-800">+</button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400">Background</label>
                                            <textarea value={sketchMetadata?.background_context || ''} onChange={(e) => handleMetadataChange('background_context', e.target.value)} className="w-full text-sm bg-gray-900/50 border border-gray-700 rounded-xl p-3 focus:outline-none min-h-[80px]" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Dropdown label="Final Style" options={generationStyles} selected={generationStyle} onSelect={setGenerationStyle} keyExtractor={o => o} renderOption={o => <span>{o}</span>} />
                                            <Dropdown label="Palette" options={[autoPalette, ...palettes]} selected={colorPalette} onSelect={setColorPalette} keyExtractor={p => p.name} renderOption={p => <span>{p.name}</span>} />
                                        </div>
                                    </div>

                                    <button onClick={() => handleGenerateSketch(true)} className="w-full py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                                        <ArrowPathIcon className="w-4 h-4" /> Re-sync Blueprint
                                    </button>
                                </div>
                            )}

                            <div className="space-y-3">
                                <button onClick={() => sketchImage ? handleFinalize() : handleGenerateSketch()} disabled={!canSubmit} className={`w-full py-4 text-lg font-bold rounded-2xl text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${canSubmit ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/20' : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'}`}>
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-3"><Spinner /> {loadingMessage || 'Generating...'}</span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-3">
                                            {sketchImage ? <SparklesIcon /> : <ArrowPathIcon />} 
                                            {sketchImage ? "Generate Final Image" : "Create Layout Plan"}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7 lg:sticky lg:top-8 space-y-6">
                        <div className={`glass rounded-3xl p-2 min-h-[440px] flex items-center justify-center transition-all ${!sketchImage && !isLoading ? 'border-dashed border-2 border-gray-800' : 'bg-black/40 shadow-2xl'}`}>
                            {isLoading ? (
                                <div className="text-center p-12">
                                    <div className="w-20 h-20 mx-auto mb-6 relative"><div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div></div>
                                    <p className="text-2xl font-bold animate-pulse text-white">{loadingMessage}</p>
                                </div>
                            ) : error ? (
                                <div className="text-center p-12 text-red-400 max-w-sm">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                                    </div>
                                    <p className="font-bold text-lg mb-2">Error Occurred</p>
                                    <p className="text-sm opacity-80 leading-relaxed">{error}</p>
                                    <button onClick={() => setError(null)} className="mt-6 px-4 py-2 bg-gray-800 rounded-lg text-xs font-medium hover:bg-gray-700">Dismiss</button>
                                </div>
                            ) : finalImage ? (
                                <div className="w-full h-full animate-[popIn_0.8s_cubic-bezier(0.16,1,0.3,1)]">
                                    <img src={finalImage} alt="Final Thumbnail" className="w-full rounded-2xl shadow-inner border border-white/5" />
                                    <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-between items-center px-2">
                                        <button onClick={resetSteps} className="text-gray-500 text-xs hover:text-white transition-colors">Start New</button>
                                        <button onClick={handleDownload} className="w-full sm:w-auto bg-blue-600 px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all transform hover:-translate-y-1 shadow-lg shadow-blue-500/20"><DownloadIcon /> Download Image</button>
                                    </div>
                                </div>
                            ) : sketchImage ? (
                                <div className="w-full h-full relative group p-6">
                                    <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-[10px] font-bold uppercase tracking-wider">Layout Blueprint</div>
                                    <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                        <img src={sketchImage} alt="Strategic Draft" className="w-full opacity-100" />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                        <div className="bg-black/80 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
                                            <SparklesIcon className="text-blue-400" />
                                            <p className="font-medium text-white text-sm">Hooks Identified. Polisher ready.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-700">
                                    <SparklesIcon className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                    <p className="font-medium opacity-30 text-lg">Viral Strategy Blueprint</p>
                                    <p className="text-xs opacity-20 mt-1 max-w-[200px] mx-auto">Upload a photo to see the AI identify hooks and remarkable elements for your content.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
