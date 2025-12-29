import { GoogleGenAI, Type, Modality } from '@google/genai';

// Do not instantiate here, it will be created on-demand in the main function.
// This is to ensure the latest API key is used if it's managed externally.

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ThumbnailPrompts {
    visual_description: string;
    clickbait_text: string;
    suggested_assets: string[];
}

const cleanJSON = (text: string) => {
    return text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
};

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
    brandAssets: { base64: string; mimeType: string }[],
    setLoadingMessage: (message: string) => void
): Promise<string> => {
    const ai = getAIClient();

    // Mapping styles to specific visual keywords
    const stylePromptMap: Record<string, string> = {
        'Professional': "Hyper-realistic photography, high-end studio lighting, sharp focus, professional depth of field, 8k resolution, realistic skin texture, clean composition.",
        'Casual': "Hyper-realistic vlog aesthetic, high-quality smartphone camera look, authentic lighting, natural setting, extremely detailed and lifelike.",
        'Cinematic': "Hyper-realistic movie scene, anamorphic lens flares, dramatic rim lighting, cinematic color grade, 8k resolution, epic scale, photorealistic textures.",
        '3D Render': "Hyper-realistic 3D render, ray-tracing, Octane Render style, high-fidelity materials, subsurface scattering, Pixar-like but with realistic lighting.",
        'Comic Book': "Hyper-realistic comic book illustration, dynamic high-contrast lighting, detailed cel-shading, vibrant hyper-real textures within an illustrative style.",
        'Retro': "Hyper-realistic vintage aesthetic, 90s film grain, authentic retro lighting, nostalgic atmosphere, high-fidelity details with a vintage filter."
    };

    const specificStylePrompt = stylePromptMap[generationStyle] || stylePromptMap['Professional'];
    
    // Always emphasize realism
    const realismRequirement = "The final output must be hyper-realistic, with meticulous attention to detail, lighting, and textures.";

    const paletteInstruction = colorPalette
        ? `Adhere strictly to a ${colorPalette.name} color palette (${colorPalette.colors.join(', ')}).`
        : "Use a vibrant, high-contrast, and visually arresting color palette.";

    const expressionInstruction = expressionMode === 'Auto'
        ? "suggest a high-energy facial expression that matches the content's viral potential"
        : `show the subject with a clearly defined "${expressionMode}" facial expression`;

    const contextInput = articleContent
        ? `Source Article: """${articleContent.substring(0, 5000)}..."""`
        : `Main Title: "${title}", Subtitle: "${subtitle}"`;

    // Step 1: Ideation - Designing the thumbnail logic
    setLoadingMessage("1/2: Designing high-engagement concept...");
    
    const ideationPrompt = `You are a world-class YouTube thumbnail designer for creators like MrBeast. 
${contextInput}
Requested Style: ${generationStyle}.
${paletteInstruction}

Task: Create a detailed plan for a hyper-realistic thumbnail.
1. 'visual_description': Describe a dynamic scene. The person in the provided photo (IMAGE 1) is the STAR of this thumbnail. 
   - Describe their pose, what they are wearing, and the background.
   - Expression: ${expressionInstruction}.
   - ${brandAssets.length > 0 ? `Incorporate the ${brandAssets.length} provided brand assets (Logos/Props) naturally.` : ""}
   - Focus on high-stakes, exciting, or intriguing visual metaphors.
2. 'overlay_text': 2-5 words of punchy, high-CTR text. Must be in the same language as the input content.
3. 'suggested_assets': 1-3 specific props to include.

Respond ONLY with valid JSON: {"visual_description": "...", "overlay_text": "...", "suggested_assets": ["..."]}`;

    const promptGenResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: ideationPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visual_description: { type: Type.STRING },
                    overlay_text: { type: Type.STRING },
                    suggested_assets: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["visual_description", "overlay_text", "suggested_assets"]
            }
        }
    });

    let prompts: ThumbnailPrompts;
    try {
        const text = cleanJSON(promptGenResponse.text || "{}");
        const json = JSON.parse(text);
        prompts = {
            visual_description: json.visual_description,
            clickbait_text: json.overlay_text || "WOW!",
            suggested_assets: json.suggested_assets
        };
    } catch (e) {
        console.error("Ideation JSON Parse Error:", e);
        throw new Error("Failed to design thumbnail concept. The AI might be busy, please try again.");
    }
    
    // Step 2: Generation - Creating the actual image
    setLoadingMessage("2/2: Generating hyper-realistic thumbnail...");

    const imagePrompt = `You are generating a hyper-realistic YouTube thumbnail.
    
    STRICT GUIDELINES:
    1. SUBJECT: IMAGE 1 is the main person. They must be the central character in the scene. Match their identity and expression perfectly.
    2. ASSETS: ${brandAssets.length > 0 ? `The following images are logos or props provided by the user. Integrate them realistically into the scene.` : ""}
    3. SCENE: ${prompts.visual_description}
    4. TEXT: Add the text "${prompts.clickbait_text}" in a ${fontStyle} font. It must be massive, legible, and have extreme contrast (bright text with dark strokes/shadows).
    5. QUALITY: ${specificStylePrompt} ${realismRequirement}
    6. ASPECT RATIO: ${aspectRatio}
    7. COLOR: ${paletteInstruction}

    Output a single, complete, high-impact thumbnail image.`;

    const parts = [
        { inlineData: { data: faceImage.base64, mimeType: faceImage.mimeType } },
        ...brandAssets.map(asset => ({ inlineData: { data: asset.base64, mimeType: asset.mimeType } })),
        { text: imagePrompt }
    ];

    const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: parts
        },
        config: { 
            imageConfig: {
                aspectRatio: aspectRatio as any
            }
        }
    });

    let finalImagePart = null;
    let fallbackText = "";
    
    const candidates = finalResponse.candidates;
    if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    finalImagePart = part;
                    break;
                }
                if (part.text) {
                    fallbackText += part.text + " ";
                }
            }
        }
    }

    if (!finalImagePart?.inlineData) {
        const finishReason = candidates?.[0]?.finishReason;
        
        console.warn("Generation Issue Detected", { finishReason, fallbackText });

        if (finishReason === 'SAFETY') {
            throw new Error("Safety Block: The AI refused to generate this specific combination of images/text. Try a more neutral photo or avoiding brand names.");
        }
        
        if (finishReason === 'IMAGE_OTHER' || finishReason === 'OTHER' || !finishReason) {
             // Specific fix for the user's error: 
             // Frame it as a technical limitation or a 'too complex' prompt refusal.
             throw new Error("The model declined to generate this specific image. This often happens if the input face image is low quality, or if the scene description is too complex. Try a 'Professional' style or a clearer headshot.");
        }

        if (fallbackText) {
             throw new Error(`Model Response: ${fallbackText.substring(0, 200)}`);
        }
        
        throw new Error("Failed to generate thumbnail. Please check your inputs and try again.");
    }

    return `data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`;
};