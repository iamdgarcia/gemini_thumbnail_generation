import { GoogleGenAI, Type, Modality } from '@google/genai';

// Do not instantiate here, it will be created on-demand in the main function.
// This is to ensure the latest API key is used if it's managed externally.

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ThumbnailPrompts {
    visual_description: string;
    clickbait_text: string;
}

export const generateThumbnail = async (
    faceImage: { base64: string; mimeType: string },
    title: string,
    subtitle: string,
    articleContent: string,
    expressionMode: string,
    generationStyle: string,
    aspectRatio: string,
    colorPalette: { name: string; colors: string[] } | null,
    fontStyle: string,
    setLoadingMessage: (message: string) => void
): Promise<string> => {
    const ai = getAIClient();

    const stylePromptMap: Record<string, string> = {
        'Professional': "Studio lighting, clean composition, high production value, sharp focus, professional photography, business-appropriate.",
        'Casual': "Authentic vlog style, natural lighting, selfie perspective, relatable and raw, spontaneous feel, YouTube personality style.",
        'Cinematic': "Dramatic lighting, movie poster aesthetic, color graded, teal and orange, 8k resolution, highly detailed background.",
        '3D Render': "3D animated style, Pixar-like, soft lighting, vibrant colors, cute and stylized proportions, digital art.",
        'Comic Book': "Comic book art style, bold outlines, cel-shaded, dynamic action lines, vibrant colors, 2D illustration.",
        'Retro': "90s VHS aesthetic, retro wave, slightly grainy, neon accents, vintage filter, nostalgic feel."
    };

    const specificStylePrompt = stylePromptMap[generationStyle] || stylePromptMap['Professional'];

    const paletteInstruction = colorPalette
        ? `The visual style should strictly adhere to a ${colorPalette.name} color palette. Key colors: ${colorPalette.colors.join(', ')}.`
        : "The visual style should be vibrant, high-contrast, and optimized for high click-through rate.";

    const expressionInstruction = expressionMode === 'Auto'
        ? "Choose an exaggerated facial expression that matches the emotional tone of the content."
        : `The character MUST have a "${expressionMode}" facial expression.`;

    const contextInput = articleContent
        ? `Content Source: Article text:\n"""${articleContent.substring(0, 10000)}"""\nTask: Extract the viral hook.`
        : `Content Source: Video Title "${title}" and Subtitle "${subtitle}".`;

    const languageInstruction = articleContent
        ? `IMPORTANT: Detect the primary language of the article. The 'clickbait_text' MUST be in that language.`
        : `IMPORTANT: Detect the language of the video title. The 'clickbait_text' MUST be in that language (e.g. Spanish title -> Spanish text).`;

    // Step 1: Ideation
    setLoadingMessage("1/2: Designing concept & animated character...");
    
    const ideationPrompt = `You are an expert YouTube thumbnail designer.
${contextInput}
${paletteInstruction}
Visual Style: ${generationStyle} (${specificStylePrompt}).

Your goal is to design a thumbnail concept that uses the user's face on an animated or stylized body that fits the content theme.
1. Create a 'visual_description'. This must describe the entire scene, including the background and the main character. 
   - The character description MUST specify an 'animated body', costume, or specific physical action (e.g. "wearing a space suit", "muscular superhero body", "cartoonish business suit", "body made of fire") that matches the "${generationStyle}" style.
   - The description should specify the pose and action.
   - ${expressionInstruction}
2. Create 'clickbait_text' (2-5 words, very punchy). ${languageInstruction}

Respond ONLY with valid JSON: {"visual_description": "...", "clickbait_text": "..."}`;

    const promptGenResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: ideationPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visual_description: { type: Type.STRING },
                    clickbait_text: { type: Type.STRING }
                },
                required: ["visual_description", "clickbait_text"]
            }
        }
    });

    const prompts: ThumbnailPrompts = JSON.parse(promptGenResponse.text);
    
    // Step 2: Generation
    setLoadingMessage("2/2: Generating thumbnail with your face...");

    const imagePrompt = `Generate a high-quality YouTube thumbnail.
Scene Description: ${prompts.visual_description}.
Important: The main character in the image MUST use the face of the person provided in the input image. Seamlessly blend the provided face onto the animated body described.
Overlay Text: Add the text "${prompts.clickbait_text}" to the image. 
Text Style: Use a ${fontStyle} font. Ensure it is huge, legible, and has high contrast (stroke/shadow) against the background.
Aspect Ratio: ${aspectRatio}.
Color Palette: ${paletteInstruction}
Overall Style: ${generationStyle}. ${specificStylePrompt}
Quality: High-quality, highly detailed, trending on ArtStation.`;

    const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: faceImage.base64, mimeType: faceImage.mimeType } },
                { text: imagePrompt }
            ]
        },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                aspectRatio: aspectRatio
            }
        }
    });

    const finalImagePart = finalResponse.candidates?.[0]?.content?.parts?.[0];
    if (!finalImagePart?.inlineData) {
        throw new Error("Failed to generate thumbnail.");
    }

    return `data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`;
};