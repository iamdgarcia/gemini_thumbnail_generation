import React, { useState, useCallback } from 'react';
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

const AspectRatioIcon: React.FC<{ ratio: string; isActive: boolean }> = ({ ratio, isActive }) => {
    const styles: { [key: string]: React.CSSProperties } = {
        '16:9': { width: '24px', height: '13.5px' },
        '9:16': { width: '13.5px', height: '24px' },
        '4:3': { width: '24px', height: '18px' },
        '1:1': { width: '20px', height: '20px' },
    };

    const bgColor = isActive ? 'bg-white' : 'bg-gray-400 group-hover:bg-gray-200';

    return (
        <div className="w-10 h-8 flex justify-center items-center mr-2">
            <div style={styles[ratio]} className={`${bgColor} transition-colors duration-200 rounded-sm`}></div>
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


export default function App() {
    const [faceImage, setFaceImage] = useState<ImageFile | null>(null);
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [colorPalette, setColorPalette] = useState<Palette | null>(null);

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
                aspectRatio,
                colorPalette,
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
    
    const canSubmit = faceImage && title && !isLoading;

    const aspectRatioOptions = [
        { value: '16:9', label: 'Landscape' },
        { value: '9:16', label: 'Portrait' },
        { value: '4:3', label: 'Standard' },
        { value: '1:1', label: 'Square' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
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
                        
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">4. Aspect Ratio</label>
                             <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-1 rounded-md">
                                {aspectRatioOptions.map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setAspectRatio(value)}
                                        className={`group flex items-center justify-start px-3 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 text-left ${
                                            aspectRatio === value
                                                ? 'bg-blue-600 text-white shadow'
                                                : 'bg-transparent text-gray-400 hover:bg-gray-700/50'
                                        }`}
                                    >
                                        <AspectRatioIcon ratio={value} isActive={aspectRatio === value} />
                                        <div className="flex flex-col leading-tight">
                                            <span className="font-bold">{value}</span>
                                            <span className="text-xs opacity-80">{label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">5. Color Palette (Optional)</label>
                             <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                <button
                                    onClick={() => setColorPalette(null)}
                                    className={`col-span-1 flex items-center justify-center p-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                                        colorPalette === null
                                            ? 'bg-blue-600 text-white shadow ring-2 ring-blue-500'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                   Auto
                                </button>
                                {palettes.map((palette) => (
                                    <button
                                        key={palette.name}
                                        onClick={() => setColorPalette(palette)}
                                        className={`col-span-1 flex flex-col items-center justify-center p-2 text-xs font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                                            colorPalette?.name === palette.name
                                                ? 'ring-2 ring-blue-500'
                                                : 'ring-1 ring-transparent hover:ring-blue-600'
                                        }`}
                                    >
                                        <div className="flex space-x-1 mb-1">
                                            {palette.colors.map(color => (
                                                <div key={color} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                                            ))}
                                        </div>
                                        <span className={colorPalette?.name === palette.name ? 'text-white' : 'text-gray-400'}>{palette.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

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

                    {/* Display Area */}
                    <div className={`bg-gray-800/50 p-2 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-center items-center transition-all duration-300 ease-in-out ${getAspectRatioClass(aspectRatio)}`}>
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
                             <img src={generatedThumbnail} alt="Generated Thumbnail" className="w-full h-full object-contain rounded-md" />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}