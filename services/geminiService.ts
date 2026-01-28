import { GoogleGenAI, Type } from '@google/genai';

/**
 * Creates a fresh AI client. 
 */
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ThumbnailMetadata {
    visual_description: string;
    clickbait_text: string;
    props: string[];
    background_context: string;
    visual_hooks: string[];
}

const cleanJSON = (text: string) => {
    return text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
};

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

/**
 * STEP 1: Generates a strategic layout plan and an informative draft.
 */
export const generateThumbnailSketch = async (
    faceImage: { base64: string; mimeType: string },
    title: string,
    subtitle: string,
    articleContent: string,
    expressionMode: string,
    generationStyle: string,
    aspectRatio: string,
    brandAssets: { base64: string; mimeType: string }[],
    setLoadingMessage: (message: string) => void,
    previousMetadata?: ThumbnailMetadata
): Promise<{ sketchUrl: string; metadata: ThumbnailMetadata }> => {
    const ai = getAIClient();

    const contextInput = articleContent
        ? `Content: """${articleContent.substring(0, 4000)}..."""`
        : `Title: "${title}", Subtitle: "${subtitle}"`;

    if (!previousMetadata) {
        setLoadingMessage("Strategizing visual impact...");
        
        const strategyPrompt = `You are a professional visual content strategist. 
        
Context: ${contextInput}
Style: ${generationStyle}.

Task: Create a visual design strategy for a high-engagement thumbnail.
1. 'visual_hooks': 3 specific elements to make the image remarkable.
2. 'visual_description': The subject's pose and expression.
3. 'clickbait_text': Impactful headline text (2-3 words).
4. 'props': 2-3 supporting objects.
5. 'background_context': Description of the setting and lighting.

Respond ONLY with JSON: 
{
  "visual_hooks": ["...", "...", "..."],
  "visual_description": "...",
  "clickbait_text": "...",
  "props": ["..."],
  "background_context": "..."
}`;

        const strategyResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: strategyPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visual_hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        visual_description: { type: Type.STRING },
                        clickbait_text: { type: Type.STRING },
                        props: { type: Type.ARRAY, items: { type: Type.STRING } },
                        background_context: { type: Type.STRING }
                    },
                    required: ["visual_hooks", "visual_description", "clickbait_text", "props", "background_context"]
                }
            }
        });

        try {
            const text = cleanJSON(strategyResponse.text || "{}");
            previousMetadata = JSON.parse(text);
        } catch (e) {
            throw new Error("Could not generate strategy.");
        }
    }

    setLoadingMessage("Drafting compositional guide...");

    const sketchPrompt = `Please create a compositional layout for a thumbnail.
    
    The individual from the reference photo (IMAGE 1) should be the central figure in this pose: ${previousMetadata!.visual_description}.
    
    Layout Details:
    - Use the actual face of the person from IMAGE 1 for the subject's head.
    - Render the rest of the scene as a clean, simple black-and-white ink sketch.
    - Include clear outlines for: ${previousMetadata!.visual_hooks.join(', ')}.
    - Set the scene in: ${previousMetadata!.background_context}.
    
    The goal is a clear blueprint showing where every element is placed.
    
    Aspect Ratio: ${aspectRatio}`;

    const sketchParts = [
        { inlineData: { data: faceImage.base64, mimeType: faceImage.mimeType } },
        { text: sketchPrompt }
    ];

    try {
        const sketchResponse = await ai.models.generateContent({
            model: DEFAULT_IMAGE_MODEL,
            contents: { parts: sketchParts },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });

        let sketchBase64 = "";
        let sketchMimeType = "";
        for (const part of sketchResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                sketchBase64 = part.inlineData.data;
                sketchMimeType = part.inlineData.mimeType;
                break;
            }
        }

        if (!sketchBase64) throw new Error("Blueprint render failed.");

        return { 
            sketchUrl: `data:${sketchMimeType};base64,${sketchBase64}`,
            metadata: previousMetadata! 
        };
    } catch (error: any) {
        console.error("Sketch Error:", error);
        if (error.message?.includes("OTHER")) {
            throw new Error("The layout drafting failed. Try using a simpler title or a different photo.");
        }
        throw error;
    }
};

/**
 * STEP 2: Refines the layout into a high-quality masterpiece with strict identity preservation.
 */
export const refineThumbnailSketch = async (
    sketchUrl: string,
    faceImage: { base64: string; mimeType: string },
    brandAssets: { base64: string; mimeType: string }[],
    metadata: ThumbnailMetadata,
    generationStyle: string,
    aspectRatio: string,
    colorPalette: { name: string; colors: string[] } | null,
    fontStyle: string,
    setLoadingMessage: (message: string) => void
): Promise<string> => {
    const ai = getAIClient();

    const stylePromptMap: Record<string, string> = {
        'Professional': "premium commercial photograph, sharp focus, professional lighting, vibrant color balance.",
        'Casual': "realistic vlog-style photography, natural sunlight, authentic details.",
        'Cinematic': "epic cinematic film still, moody rim lighting, deep contrast.",
        '3D Render': "high-detail 3D digital render, realistic materials, octane render style.",
        'Comic Book': "vibrant digital illustration, dynamic linework, high-contrast colors.",
        'Retro': "vintage film photograph, warm film grain, nostalgic lighting."
    };

    const specificStylePrompt = stylePromptMap[generationStyle] || stylePromptMap['Professional'];

    const paletteInstruction = colorPalette
        ? `Use a color scheme inspired by ${colorPalette.name} (${colorPalette.colors.join(', ')}).`
        : "Use vibrant, high-contrast, attention-grabbing colors.";

    setLoadingMessage("Rendering final masterpiece...");

    const sketchBase64 = sketchUrl.split(',')[1];
    const sketchMimeType = sketchUrl.split(',')[0].split(':')[1].split(';')[0];

    // Prompts revised to be softer but firm on identity to avoid IMAGE_OTHER
    const finalPrompt = `Please generate a finished, high-quality professional thumbnail based on the layout in IMAGE 1.

The subject of the final image must be the exact same individual as shown in IMAGE 2. Please carefully preserve their facial features, likeness, and appearance to maintain a realistic and authentic identity. They should look like a real person in a high-quality photograph.

Instructions:
1. Scene: Transform the sketches from IMAGE 1 into fully realized, realistic details. 
2. Setting: The background should be a detailed ${metadata.background_context} featuring these hooks: ${metadata.visual_hooks.join(', ')}.
3. Text: Include the headline "${metadata.clickbait_text}" in a bold, striking ${fontStyle}.
4. Style: ${specificStylePrompt}.
5. Integration: Use professional studio lighting to naturally integrate the person from IMAGE 2 into the rendered scene.

The final result should be a sharp, engaging, and professional composition.`;

    const finalParts = [
        { inlineData: { data: sketchBase64, mimeType: sketchMimeType } }, // IMAGE 1: Blueprint
        { inlineData: { data: faceImage.base64, mimeType: faceImage.mimeType } }, // IMAGE 2: Face Reference
        ...brandAssets.map(asset => ({ inlineData: { data: asset.base64, mimeType: asset.mimeType } })),
        { text: finalPrompt }
    ];

    try {
        const finalResponse = await ai.models.generateContent({
            model: DEFAULT_IMAGE_MODEL,
            contents: { parts: finalParts },
            config: { 
                imageConfig: { 
                    aspectRatio: aspectRatio as any
                }
            }
        });

        let finalImagePart = null;
        if (finalResponse.candidates && finalResponse.candidates.length > 0) {
            const candidate = finalResponse.candidates[0];
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData) {
                    finalImagePart = part;
                    break;
                }
            }

            if (!finalImagePart) {
                if (candidate.finishReason === 'SAFETY') {
                    throw new Error("The image content was flagged by safety filters. Try adjusting your title or using a different image.");
                }
                throw new Error(`The image engine could not complete the request (Reason: ${candidate.finishReason}).`);
            }
        } else {
            throw new Error("The image service returned an empty response.");
        }

        return `data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`;
    } catch (error: any) {
        console.error("Polishing Error:", error);
        
        if (error.message?.includes("OTHER")) {
            throw new Error("The final render failed due to a temporary engine error. This often happens with overly complex text or lighting instructions. Try a simpler title or a different style like 'Cinematic' or 'Casual'.");
        }

        throw error;
    }
};