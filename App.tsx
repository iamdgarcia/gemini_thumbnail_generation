import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ImageFile } from './types';
import { fileToBase64 } from './utils/fileUtils';
import { generateThumbnail } from './services/geminiService';

const UploadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-10 h-10 text-gray-500"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 3v13.5M8.25 12.75 12 16.5l3.75-3.75" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">1. Upload Face Image</label>
            <label
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex justify-center items-center w-full h-48 px-6 transition bg-gray-800 border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-400 focus:outline-none ${isDragging ? 'border-blue-400' : 'border-gray-600'}`}>
                {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
                ) : (
                    <span className="flex flex-col items-center space-y-2">
                        <UploadIcon />
                        <span className="font-medium text-gray-400">
                            Drop files to attach, or <span className="text-blue-400 underline">browse</span>
                        </span>
                        <span className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</span>
                    </span>
                )}
                <input type="file" name="file_upload" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={(e) => handleFileChange(e.target.files)} />
            </label>
        </div>
    );
};


interface TextInputProps {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    step: string;
}
const TextInput: React.FC<TextInputProps> = ({ label, value, onChange, placeholder, step }) => {
    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-2">{step}. {label}</label>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
};

interface DropdownProps<T> {
    label: string;
    options: T[];
    selected: T;
    onSelect: (item: T) => void;
    renderOption: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string | number;
}

const Dropdown = <T,>({ label, options, selected, onSelect, renderOption, keyExtractor }: DropdownProps<T>) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="w-full relative" ref={containerRef}>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left flex justify-between items-center"
            >
                <div className="flex-1 truncate">
                    {renderOption(selected)}
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-20 mt-1 w-full bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto focus:outline-none py-1">
                    {options.map((option) => {
                        const isSelected = keyExtractor(selected) === keyExtractor(option);
                        return (
                            <div
                                key={keyExtractor(option)}
                                onClick={() => {
                                    onSelect(option);
                                    setIsOpen(false);
                                }}
                                className={`cursor-pointer select-none relative py-2 pl-4 pr-4 hover:bg-gray-700 ${isSelected ? 'bg-gray-700/50 text-white font-medium' : 'text-gray-300'}`}
                            >
                                {renderOption(option)}
                            </div>
                        );
                    })}
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
    { name: 'Vibrant', colors: ['#FF3E3E', '#FFC107', '#00D1FF', '#FFFFFF'] },
    { name: 'Neon', colors: ['#39FF14', '#FF40E3', '#00FFFF', '#FDFD96'] },
    { name: 'Pastel', colors: ['#A0E7E5', '#F8C8DC', '#B4F8C8', '#FFAEBC'] },
    { name: 'Monochrome', colors: ['#1C1C1C', '#585858', '#D8D8D8', '#FFFFFF'] },
    { name: 'Earthy', colors: ['#A87B00', '#568203', '#4E2A04', '#C2B280'] },
    { name: 'Sunset', colors: ['#F65B49', '#F9A825', '#FFD54F', '#4A148C'] }
];

const autoPalette: Palette = { name: 'Auto', colors: [] };
const expressionOptions = ['Auto', 'Shocked', 'Excited', 'Angry', 'Fearful', 'Sad', 'Serious', 'Confused'];

export default function App() {
    const [faceImage, setFaceImage] = useState<ImageFile | null>(null);
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [expression, setExpression] = useState('Auto');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [colorPalette, setColorPalette] = useState<Palette>(autoPalette);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

    const handleImageUpload = useCallback((imageFile: ImageFile) => {
        setFaceImage(imageFile);
    }, []);

    const handleSubmit = async () => {
        if (!faceImage || !title) {
            setError("Please upload a face image and provide a title.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedThumbnail(null);

        try {
            const resultUrl = await generateThumbnail(
                { base64: faceImage.base64, mimeType: faceImage.mimeType },
                title,
                subtitle,
                expression,
                aspectRatio,
                colorPalette.name === 'Auto' ? null : colorPalette,
                setLoadingMessage
            );
            setGeneratedThumbnail(resultUrl);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "An unknown error occurred during thumbnail generation.");
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

    const canSubmit = faceImage && title && !isLoading;

    const aspectRatioOptions = [
        { value: '16:9', label: 'Landscape' },
        { value: '9:16', label: 'Portrait' },
        { value: '4:3', label: 'Standard' },
        { value: '1:1', label: 'Square' },
    ];

    const allPalettes = [autoPalette, ...palettes];

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
             <style>{`
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); filter: blur(4px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
                }
            `}</style>
            <main className="container mx-auto px-4 py-8">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                        AI Thumbnail Generator
                    </h1>
                    <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                        Turn a photo and a title into a viral-style thumbnail with the power of Gemini.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {/* Control Panel */}
                    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col space-y-6">
                        <h2 className="text-2xl font-semibold border-b border-gray-700 pb-3">Create your thumbnail</h2>
                        <ImageUploader onImageUpload={handleImageUpload} previewUrl={faceImage ? URL.createObjectURL(faceImage.file) : undefined} />
                        <TextInput label="Title" step="2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., I Tried to Survive 100 Days..." />
                        <TextInput label="Subtitle (Optional)" step="3" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g., ...And This Happened" />
                        
                        <Dropdown 
                            label="4. Facial Expression"
                            options={expressionOptions}
                            selected={expression}
                            onSelect={(opt) => setExpression(opt)}
                            keyExtractor={(opt) => opt}
                            renderOption={(opt) => (
                                <span className="font-medium">{opt}</span>
                            )}
                        />

                        <Dropdown 
                            label="5. Aspect Ratio"
                            options={aspectRatioOptions}
                            selected={aspectRatioOptions.find(opt => opt.value === aspectRatio) || aspectRatioOptions[0]}
                            onSelect={(opt) => setAspectRatio(opt.value)}
                            keyExtractor={(opt) => opt.value}
                            renderOption={(opt) => (
                                <div className="flex items-center">
                                    <span className="font-medium mr-2">{opt.value}</span>
                                    <span className="text-gray-400 text-sm">({opt.label})</span>
                                </div>
                            )}
                        />

                        <Dropdown 
                            label="6. Color Palette (Optional)"
                            options={allPalettes}
                            selected={colorPalette}
                            onSelect={(p) => setColorPalette(p)}
                            keyExtractor={(p) => p.name}
                            renderOption={(palette) => (
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-medium">{palette.name}</span>
                                    <div className="flex space-x-1 ml-2">
                                        {palette.colors.map(color => (
                                            <div key={color} className="w-3 h-3 rounded-full ring-1 ring-white/10" style={{ backgroundColor: color }}></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        />

                        <div className="pt-4">
                           <button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={`w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-all duration-200 ${
                                    canSubmit 
                                        ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900' 
                                        : 'bg-gray-600 cursor-not-allowed'
                                }`}
                           >
                               {isLoading ? (
                                   <>
                                       <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                       Generating...
                                   </>
                               ) : (
                                   <>
                                      <SparklesIcon className="w-5 h-5 mr-2" />
                                      Generate Thumbnail
                                   </>
                               )}
                           </button>
                        </div>
                    </div>

                    {/* Display Area Wrapper */}
                    <div className="flex flex-col space-y-4">
                        {/* Display Area */}
                        <div className={`bg-gray-800/50 p-2 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center items-center transition-all duration-300 ease-in-out w-full ${getAspectRatioClass(aspectRatio)}`}>
                        {error && (
                                <div className="text-center text-red-400 p-4">
                                    <h3 className="font-bold text-lg mb-2">Generation Failed</h3>
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}
                            {isLoading && (
                                <div className="text-center p-4">
                                    <Spinner />
                                    <p className="mt-4 text-lg font-semibold text-gray-300">{loadingMessage}</p>
                                    <p className="text-sm text-gray-500">This may take a moment...</p>
                                </div>
                            )}
                            {!isLoading && !generatedThumbnail && !error && (
                                <div className="text-center text-gray-500">
                                    <SparklesIcon className="w-16 h-16 mx-auto" />
                                    <p className="mt-4 text-xl">Your generated thumbnail will appear here</p>
                                </div>
                            )}
                            {generatedThumbnail && (
                                <img 
                                    src={generatedThumbnail} 
                                    alt="Generated Thumbnail" 
                                    className="w-full h-full object-contain rounded-md shadow-2xl ring-1 ring-white/10"
                                    style={{ animation: 'popIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                                />
                            )}
                        </div>

                        {/* Download Button */}
                        {generatedThumbnail && (
                            <button
                                onClick={handleDownload}
                                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900 transition-all duration-200"
                            >
                                <DownloadIcon className="w-5 h-5 mr-2" />
                                Download Thumbnail
                            </button>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}