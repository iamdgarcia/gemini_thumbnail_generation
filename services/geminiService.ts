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
    - Capture the head and facial features of the person from IMAGE 1 realistically in the layout.
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
 * STEP 2: Refines the layout into a high-quality masterpiece.
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
        'Retro': "vintage film photograph, warm film grain, nostalgic lighting.",
        'Hyper-Realistic': "ultra-realistic 8k masterwork photograph, hyper-realistic skin textures, pore-level detail, masterfully lit cinematic environment with perfect depth of field."
    };

    const specificStylePrompt = stylePromptMap[generationStyle] || stylePromptMap['Professional'];
    const isHyper = generationStyle === 'Hyper-Realistic';

    const paletteInstruction = colorPalette
        ? `Use a color scheme inspired by ${colorPalette.name} (${colorPalette.colors.join(', ')}).`
        : "Use vibrant, high-contrast, attention-grabbing colors.";

    setLoadingMessage("Rendering masterpiece draft...");

    const sketchBase64 = sketchUrl.split(',')[1];
    const sketchMimeType = sketchUrl.split(',')[0].split(':')[1].split(';')[0];

    const finalPrompt = `Produce a high-end professional thumbnail following the layout in IMAGE 1.

CRITICAL IDENTITY REQUIREMENT: 
The subject MUST be the exact individual from IMAGE 2. 
- 100% LIKENESS: Transfer every unique facial feature, nose shape, eyes, and bone structure from IMAGE 2.
- COLORIZATION: If IMAGE 2 is black and white, you MUST realistically colorize the face to match a natural human skin tone integrated with the scene's lighting.
- REALISM: The person must look like a 100% real human, not an illustration (unless the style is Comic Book).

${isHyper ? 'HYPER-REALISM MODE: Both the human and the environment MUST be indistinguishable from reality, using master-level photographic clarity.' : ''}

Specs:
1. Composition: Follow IMAGE 1 precisely.
2. Scene: Detailed ${metadata.background_context} with ${metadata.visual_hooks.join(', ')}.
3. Text: Overlay "${metadata.clickbait_text}" in bold ${fontStyle}.
4. Style: ${specificStylePrompt}.

Integrate the person from IMAGE 2 into this world with flawless photographic blending.`;

    const finalParts = [
        { inlineData: { data: sketchBase64, mimeType: sketchMimeType } }, // Blueprint
        { inlineData: { data: faceImage.base64, mimeType: faceImage.mimeType } }, // Identity Reference
        ...brandAssets.map(asset => ({ inlineData: { data: asset.base64, mimeType: asset.mimeType } })),
        { text: finalPrompt }
    ];

    try {
        const finalResponse = await ai.models.generateContent({
            model: DEFAULT_IMAGE_MODEL,
            contents: { parts: finalParts },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
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
            if (!finalImagePart) throw new Error("No image generated.");
        } else {
            throw new Error("Empty service response.");
        }

        return `data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`;
    } catch (error: any) {
        if (error.message?.includes("OTHER")) throw new Error("The image engine failed. Try a simpler title.");
        throw error;
    }
};

/**
 * STEP 3: Reflection & Self-Correction Step.
 * Critiques the masterpiece and performs a final perfection pass.
 */
export const reflectAndRefineMasterpiece = async (
    masterpieceUrl: string,
    originalFaceImage: { base64: string; mimeType: string },
    metadata: ThumbnailMetadata,
    generationStyle: string,
    aspectRatio: string,
    setLoadingMessage: (message: string) => void
): Promise<string> => {
    const ai = getAIClient();
    setLoadingMessage("Critiquing likeness and polishing realism...");

    const masterpieceBase64 = masterpieceUrl.split(',')[1];
    const masterpieceMimeType = masterpieceUrl.split(',')[0].split(':')[1].split(';')[0];

    const reflectionPrompt = `Perform a CRITICAL REFLECTION and SELF-CORRECTION on the masterpiece (IMAGE 1).

Compare IMAGE 1 (The Masterpiece) to IMAGE 2 (The Original Identity Reference).

Critique Tasks:
1. IDENTITY FIDELITY: Does the subject in IMAGE 1 look exactly like the person in IMAGE 2? Correct any deviations in facial structure, features, or likeness.
2. COLOURIZATION CHECK: If IMAGE 2 was black and white, ensure the face in the final result is realistically colorized and perfectly skin-toned to match a high-end photograph.
3. REALISM: Ensure the subject and environment are 100% realistic and indistinguishable from professional photography. Remove any "AI-looking" artifacts or smoothing.
4. TEXTURE: Add micro-details to the skin, hair, and clothing to reach hyper-realistic quality.

Final Instruction:
Generate the PERFECTED final version of the thumbnail. Maintain the exact composition of IMAGE 1 but fix the face to be a 100% realistic and faithful replica of the person in IMAGE 2. Both the human and the environment must be hyper-realistic.`;

    const correctionParts = [
        { inlineData: { data: masterpieceBase64, mimeType: masterpieceMimeType } }, // The current masterpiece
        { inlineData: { data: originalFaceImage.base64, mimeType: originalFaceImage.mimeType } }, // The original face reference
        { text: reflectionPrompt }
    ];

    try {
        const finalResponse = await ai.models.generateContent({
            model: DEFAULT_IMAGE_MODEL,
            contents: { parts: correctionParts },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });

        let perfectedImagePart = null;
        if (finalResponse.candidates && finalResponse.candidates.length > 0) {
            const candidate = finalResponse.candidates[0];
            for (const part of candidate.content?.parts || []) {
                if (part.inlineData) {
                    perfectedImagePart = part;
                    break;
                }
            }
            if (!perfectedImagePart) throw new Error("No image generated during reflection.");
        }

        return `data:${perfectedImagePart!.inlineData.mimeType};base64,${perfectedImagePart!.inlineData.data}`;
    } catch (error: any) {
        console.error("Reflection Error:", error);
        // Fallback to masterpiece if reflection fails
        return masterpieceUrl;
    }
};
