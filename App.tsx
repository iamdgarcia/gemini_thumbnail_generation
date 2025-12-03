import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageFile } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { generateThumbnail } from './services/geminiService';

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

const DocumentTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const VideoCameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-4 h-4"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
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
                    Face Image
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
                                <PhotoIcon /> Replace Image
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center space-y-3 p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                            <UploadIcon />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium text-gray-300">Click to upload or drag & drop</p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP (max 10MB)</p>
                        </div>
                    </div>
                )}
                <input type="file" name="file_upload" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} />
            </label>
        </div>
    );
};


interface TextInputProps {
    label: string;
    step?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
}
const TextInput: React.FC<TextInputProps> = ({ label, step, value, onChange, placeholder }) => {
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
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 pointer-events-none group-hover:ring-white/10"></div>
            </div>
        </div>
    );
};

interface TextAreaProps {
    label: string;
    step?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
}
const TextArea: React.FC<TextAreaProps> = ({ label, step, value, onChange, placeholder }) => {
    return (
        <div className="w-full">
             <label className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                {step && <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">{step}</span>}
                {label}
            </label>
            <div className="relative group">
                <textarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={6}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 pointer-events-none group-hover:ring-white/10"></div>
            </div>
        </div>
    );
}

// Modern segmented control for aspect ratio
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
                            className={`relative py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive 
                                ? 'bg-gray-700 text-white shadow-lg' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                        >
                            {opt.value}
                            {isActive && (
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>
                            )}
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
                <div className="flex-1 truncate flex items-center">
                    {renderOption(selected)}
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-30 mt-2 w-full bg-gray-800/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto focus:outline-none overflow-hidden ring-1 ring-black/50">
                    <div className="py-1">
                    {options.map((option) => {
                        const isSelected = keyExtractor(selected) === keyExtractor(option);
                        return (
                            <div
                                key={keyExtractor(option)}
                                onClick={() => {
                                    onSelect(option);
                                    setIsOpen(false);
                                }}
                                className={`cursor-pointer select-none relative py-2.5 pl-4 pr-4 hover:bg-blue-500/20 transition-colors ${isSelected ? 'bg-blue-500/10 text-blue-200 font-medium' : 'text-gray-300'}`}
                            >
                                <div className="flex items-center">
                                    {renderOption(option)}
                                    {isSelected && (
                                        <span className="absolute right-4 flex items-center text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            )}
        </div>
    );
};

const getAspectRatioClass = (ratio: string): string => {
    switch (ratio) {
        case '16:9': return 'aspect-video';
        case '9:16': return 'aspect-[9/16]';
        case '4:3': return 'aspect-[4/3]';
        case '1:1': return 'aspect-square';
        default: return 'aspect-video';
    }
};

interface Palette {
    name: string;
    colors: string[];
}

const palettes: Palette[] = [
    { name: 'YouTube', colors: ['#FF0000', '#FFFFFF', '#282828'] },
    { name: 'LinkedIn', colors: ['#0A66C2', '#FFFFFF', '#434649'] },
    { name: 'Medium', colors: ['#000000', '#FFFFFF', '#A8A8A8'] },
    { name: 'Substack', colors: ['#FF6719', '#FFFFFF', '#404040'] },
    { name: 'Vibrant', colors: ['#FF3E3E', '#FFC107', '#00D1FF', '#FFFFFF'] },
    { name: 'Neon', colors: ['#39FF14', '#FF40E3', '#00FFFF', '#FDFD96'] },
    { name: 'Pastel', colors: ['#A0E7E5', '#F8C8DC', '#B4F8C8', '#FFAEBC'] },
    { name: 'Dark Mode', colors: ['#0F172A', '#334155', '#94A3B8', '#F8FAFC'] },
    { name: 'Earthy', colors: ['#A87B00', '#568203', '#4E2A04', '#C2B280'] },
    { name: 'Sunset', colors: ['#F65B49', '#F9A825', '#FFD54F', '#4A148C'] },
    { name: 'Cyberpunk', colors: ['#FCEE0A', '#00F0FF', '#FF003C', '#120458'] }
];

const autoPalette: Palette = { name: 'Auto', colors: [] };
const expressionOptions = ['Auto', 'Shocked', 'Excited', 'Angry', 'Fearful', 'Sad', 'Serious', 'Confused', 'Triumphant', 'Suspicious'];
const fontOptions = ['Bold Sans-Serif', 'Impact Style', 'Handwritten Marker', 'Futuristic', 'Retro', 'Comic/Cartoon', 'Minimalist'];
const generationStyles = ['Professional', 'Casual', 'Cinematic', '3D Render', 'Comic Book', 'Retro'];

export default function App() {
    const [faceImage, setFaceImage] = useState<ImageFile | null>(null);
    const [inputMode, setInputMode] = useState<'title' | 'article'>('title');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [articleText, setArticleText] = useState('');
    const [expression, setExpression] = useState('Auto');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [colorPalette, setColorPalette] = useState<Palette>(autoPalette);
    const [fontStyle, setFontStyle] = useState('Bold Sans-Serif');
    const [generationStyle, setGenerationStyle] = useState('Professional');

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

    const handleImageUpload = useCallback((imageFile: ImageFile) => {
        setFaceImage(imageFile);
    }, []);

    const handleSubmit = async () => {
        const hasContent = inputMode === 'title' ? !!title : !!articleText;

        if (!faceImage || !hasContent) {
            setError("Please upload a face image and provide the video details or article content.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedThumbnail(null);

        try {
            const resultUrl = await generateThumbnail(
                { base64: faceImage.base64, mimeType: faceImage.mimeType },
                inputMode === 'title' ? title : '',
                inputMode === 'title' ? subtitle : '',
                inputMode === 'article' ? articleText : '',
                expression,
                generationStyle,
                aspectRatio,
                colorPalette.name === 'Auto' ? null : colorPalette,
                fontStyle,
                setLoadingMessage
            );
            setGeneratedThumbnail(resultUrl);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    const handleDownload = () => {
        if (generatedThumbnail) {
            const link = document.createElement('a');
            link.href = generatedThumbnail;
            link.download = `thumbnail-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const canSubmit = faceImage && (inputMode === 'title' ? title : articleText) && !isLoading;

    const aspectRatioOptions = [
        { value: '16:9', label: 'Landscape' },
        { value: '9:16', label: 'Portrait' },
        { value: '4:3', label: 'Standard' },
        { value: '1:1', label: 'Square' },
    ];

    const allPalettes = [autoPalette, ...palettes];

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-slate-200 font-sans selection:bg-blue-500/30 selection:text-blue-200">
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-600/10 blur-[100px]"></div>
            </div>

             <style>{`
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); filter: blur(8px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                .gradient-text {
                     background: linear-gradient(135deg, #60A5FA 0%, #A855F7 100%);
                     -webkit-background-clip: text;
                     -webkit-text-fill-color: transparent;
                }
            `}</style>
            
            <main className="relative z-10 container mx-auto px-4 py-12 max-w-6xl">
                <header className="flex flex-col items-center mb-16">
                    <div className="inline-flex items-center space-x-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10 mb-6">
                        <SparklesIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs font-medium tracking-wide uppercase text-gray-300">Powered by Gemini 2.5</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-center mb-6">
                        <span className="gradient-text">Viral Thumbnails</span> <br/>
                        <span className="text-white">in Seconds.</span>
                    </h1>
                    <p className="text-lg text-gray-400 max-w-xl text-center leading-relaxed">
                        Create click-worthy, high-engagement thumbnails tailored to your content using advanced generative AI.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Controls */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="glass-panel p-6 md:p-8 rounded-3xl space-y-8 shadow-2xl shadow-black/50">
                            
                            <ImageUploader onImageUpload={handleImageUpload} previewUrl={faceImage ? URL.createObjectURL(faceImage.file) : undefined} />
                            
                            <div className="space-y-4">
                                <label className="text-sm font-semibold text-gray-300 flex items-center mb-2">
                                     <span className="bg-gray-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-2">2</span>
                                     Content Source
                                </label>
                                <div className="bg-gray-900/50 p-1 rounded-xl border border-gray-700 grid grid-cols-2 gap-1 mb-4">
                                    <button
                                        onClick={() => setInputMode('title')}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'title' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                                    >
                                        <VideoCameraIcon />
                                        Video Title
                                    </button>
                                    <button
                                        onClick={() => setInputMode('article')}
                                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${inputMode === 'article' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
                                    >
                                        <DocumentTextIcon />
                                        Article Text
                                    </button>
                                </div>

                                {inputMode === 'title' ? (
                                    <div className="space-y-5 animate-[popIn_0.3s_ease-out]">
                                        <TextInput label="Video Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., I Built a Secret Base..." />
                                        <TextInput label="Subtitle (Optional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g., You won't believe this!" />
                                    </div>
                                ) : (
                                    <div className="animate-[popIn_0.3s_ease-out]">
                                         <TextArea label="Article Content" value={articleText} onChange={(e) => setArticleText(e.target.value)} placeholder="Paste your article or script here..." />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Dropdown 
                                    label="Expression"
                                    step="3"
                                    options={expressionOptions}
                                    selected={expression}
                                    onSelect={setExpression}
                                    keyExtractor={(opt) => opt}
                                    renderOption={(opt) => (
                                        <span className="font-medium">{opt}</span>
                                    )}
                                />
                                
                                <Dropdown 
                                    label="Font Style"
                                    step="4"
                                    options={fontOptions}
                                    selected={fontStyle}
                                    onSelect={setFontStyle}
                                    keyExtractor={(opt) => opt}
                                    renderOption={(opt) => (
                                        <span className="truncate">{opt}</span>
                                    )}
                                />
                            </div>

                             <SegmentedControl label="Aspect Ratio" step="5" options={aspectRatioOptions} selected={aspectRatio} onSelect={setAspectRatio} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Dropdown 
                                    label="Visual Style"
                                    step="6"
                                    options={generationStyles}
                                    selected={generationStyle}
                                    onSelect={setGenerationStyle}
                                    keyExtractor={(opt) => opt}
                                    renderOption={(opt) => (
                                        <span className="font-medium">{opt}</span>
                                    )}
                                />

                                <Dropdown 
                                    label="Color Palette"
                                    step="7"
                                    options={allPalettes}
                                    selected={colorPalette}
                                    onSelect={setColorPalette}
                                    keyExtractor={(p) => p.name}
                                    renderOption={(palette) => (
                                        <div className="flex items-center justify-between w-full group">
                                            <span className="font-medium flex items-center gap-2 truncate">
                                                {palette.name === 'Auto' && <SparklesIcon className="w-4 h-4 text-purple-400" />}
                                                {palette.name}
                                            </span>
                                            {palette.colors.length > 0 && (
                                                <div className="flex -space-x-2 shrink-0">
                                                    {palette.colors.slice(0, 3).map((color, i) => (
                                                        <div key={i} className="w-5 h-5 rounded-full ring-2 ring-gray-800 shadow-sm" style={{ backgroundColor: color }}></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={`group relative w-full inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-2xl text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20 overflow-hidden ${
                                    canSubmit 
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-purple-500/40' 
                                        : 'bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700'
                                }`}
                            >
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/10 z-10 animate-[shimmer_2s_infinite]"></div>
                                )}
                                <span className="relative z-20 flex items-center gap-3">
                                    {isLoading ? (
                                        <>
                                            <Spinner />
                                            <span>Generating Magic...</span>
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-6 h-6 text-yellow-200 animate-[float_3s_ease-in-out_infinite]" />
                                            Generate Thumbnail
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Result */}
                    <div className="lg:col-span-7 lg:sticky lg:top-8 space-y-6">
                        <div className={`glass-panel rounded-3xl p-2 transition-all duration-500 relative overflow-hidden group ${!generatedThumbnail && !isLoading ? 'bg-gray-900/30 border-dashed border-2 border-gray-700' : 'bg-black/40 shadow-2xl shadow-black/50'}`}>
                             {/* Aspect Ratio Wrapper */}
                            <div className={`relative w-full rounded-2xl overflow-hidden bg-black/20 flex items-center justify-center transition-all duration-500 ${getAspectRatioClass(aspectRatio)}`}>
                                
                                {error && (
                                    <div className="text-center text-red-400 p-8 max-w-md">
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                            </svg>
                                        </div>
                                        <h3 className="font-bold text-xl mb-2">Generation Failed</h3>
                                        <p className="text-sm text-red-300/80 leading-relaxed">{error}</p>
                                    </div>
                                )}

                                {isLoading && (
                                    <div className="text-center p-8 z-20">
                                        <div className="relative w-20 h-20 mx-auto mb-6">
                                            <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                                        </div>
                                        <p className="text-2xl font-bold text-white mb-2 animate-pulse">{loadingMessage}</p>
                                        <p className="text-sm text-gray-400">AI is brainstorming & designing...</p>
                                    </div>
                                )}

                                {!isLoading && !generatedThumbnail && !error && (
                                    <div className="text-center text-gray-600">
                                        <div className="w-24 h-24 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <SparklesIcon className="w-10 h-10 text-gray-700" />
                                        </div>
                                        <p className="text-xl font-medium text-gray-500">Preview Area</p>
                                        <p className="text-sm text-gray-600 mt-2">Your masterpiece will appear here</p>
                                    </div>
                                )}

                                {generatedThumbnail && (
                                    <img 
                                        src={generatedThumbnail} 
                                        alt="Generated Thumbnail" 
                                        className="w-full h-full object-contain"
                                        style={{ animation: 'popIn 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                    />
                                )}
                            </div>
                            
                            {generatedThumbnail && (
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end">
                                    <span className="text-white/70 text-xs font-mono bg-black/50 px-2 py-1 rounded">Generated by Gemini</span>
                                </div>
                            )}
                        </div>

                        {generatedThumbnail && (
                            <div className="flex justify-end animate-[popIn_0.5s_ease-out_0.2s_both]">
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center justify-center px-8 py-4 rounded-xl shadow-lg text-white font-bold bg-green-600 hover:bg-green-500 transition-all transform hover:-translate-y-1 hover:shadow-green-500/30 ring-1 ring-white/10"
                                >
                                    <DownloadIcon className="w-5 h-5 mr-2" />
                                    Download Image
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}