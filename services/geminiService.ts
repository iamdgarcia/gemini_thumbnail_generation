import { GoogleGenAI, Type, Modality } from '@google/genai';

// Do not instantiate here, it will be created on-demand in the main function.
// This is to ensure the latest API key is used if it's managed externally.

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ThumbnailPrompts {
    background_prompt: string;
    expression_prompt: string;
    clickbait_text: string;
}

export const generateThumbnail = async (
    faceImage: { base64: string; mimeType: string },
    title: string,
    subtitle: string,
    expressionMode: string,
    aspectRatio: string,
    colorPalette: { name: string; colors: string[] } | null,
    setLoadingMessage: (message: string) => void
): Promise<string> => {
    const ai = getAIClient();

    const paletteInstruction = colorPalette
        ? `The design must heavily feature a ${colorPalette.name} color palette. The key colors to use are: ${colorPalette.colors.join(', ')}.`
        : "The design should have a visually appealing and appropriate color palette chosen by you to maximize engagement.";
    
    const expressionInstruction = expressionMode === 'Auto'
        ? "The expression should be exaggerated, highly engaging, and perfectly match the emotional tone of the title/subtitle."
        : `The facial expression MUST strictly be "${expressionMode}". Describe a detailed, exaggerated, and highly engaging "${expressionMode}" look that fits the style of a YouTube thumbnail.`;

    // Step 1: Generate creative prompts for background, expression, and clickbait text
    setLoadingMessage("1/4: Brainstorming thumbnail ideas...");
    const promptGenResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `You are an expert YouTube thumbnail designer. For a video titled "${title}" with subtitle "${subtitle}", I need to create a click-worthy thumbnail. 
${paletteInstruction}
1. Create a detailed, descriptive prompt for an AI image generator to create the background scene. This background should be visually interesting, relevant to the title, and use the specified color guidance.
2. Create a concise prompt describing a facial expression for a person that would be overlaid on this background. ${expressionInstruction}
3. Generate a very short, punchy, clickbait text (2-4 words MAX) derived from the title that could be overlaid on the thumbnail. Avoid generic phrases.
IMPORTANT: Detect the language of the video title. The 'clickbait_text' MUST be in the same language as the video title (e.g. if title is Spanish, text must be Spanish). However, keep 'background_prompt' and 'expression_prompt' in English for best image generation results.

Respond ONLY with a valid JSON object with keys "background_prompt", "expression_prompt", and "clickbait_text". For example: {"background_prompt": "A mysterious, ancient jungle temple...", "expression_prompt": "A look of pure terror, eyes wide, screaming silently", "clickbait_text": "IT'S REAL?!"}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    background_prompt: {
                        type: Type.STRING,
                        description: "A detailed prompt for generating the background image. Must be in English."
                    },
                    expression_prompt: {
                        type: Type.STRING,
                        description: "A prompt for modifying a face to have an engaging expression. Must be in English."
                    },
                    clickbait_text: {
                        type: Type.STRING,
                        description: "Short, punchy clickbait text for the thumbnail (2-4 words). Must match the language of the title."
                    }
                },
                required: ["background_prompt", "expression_prompt", "clickbait_text"]
            }
        }
    });

    const prompts: ThumbnailPrompts = JSON.parse(promptGenResponse.text);
    if (!prompts.background_prompt || !prompts.expression_prompt || !prompts.clickbait_text) {
        throw new Error("Failed to generate creative prompts from Gemini.");
    }

    // Step 2: Generate background image
    setLoadingMessage("2/4: Creating a stunning background...");
    const backgroundResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompts.background_prompt }] },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const backgroundPart = backgroundResponse.candidates?.[0]?.content?.parts?.[0];
    if (!backgroundPart?.inlineData) {
        throw new Error("Failed to generate thumbnail background image.");
    }
    const backgroundImage = {
        base64: backgroundPart.inlineData.data,
        mimeType: backgroundPart.inlineData.mimeType
    };

    // Step 3: Edit face with expression
    setLoadingMessage("3/4: Adding expression to the face...");
    const editedFaceResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: faceImage.base64, mimeType: faceImage.mimeType } },
                { text: `From the provided image, isolate the person's head and shoulders (a headshot). Remove the original background completely so it is transparent. Then, modify the person's facial expression to match this description: ${prompts.expression_prompt}. The final result should be only the person's headshot with the new expression and a transparent background.` }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const editedFacePart = editedFaceResponse.candidates?.[0]?.content?.parts?.[0];
    if (!editedFacePart?.inlineData) {
        throw new Error("Failed to edit face with expression.");
    }
    const editedFaceImage = {
        base64: editedFacePart.inlineData.data,
        mimeType: editedFacePart.inlineData.mimeType
    };

    // Step 4: Composite final image with text
    setLoadingMessage("4/4: Assembling the final thumbnail...");

    const paletteCompositeInstruction = colorPalette
        ? `The final image must be vibrant, high-contrast, and strictly adhere to a ${colorPalette.name} color palette using these main colors: ${colorPalette.colors.join(', ')}. The text "${prompts.clickbait_text}" should use colors from this palette to ensure it is highly visible and pops against the background.`
        : `The final image must be vibrant, high-contrast, and look like a professionally designed, viral YouTube thumbnail.`

    const compositePrompt = `Take the person from the first image (the one with the edited face) and place them prominently on the right side of the second image (the background). Blend them seamlessly. On the left side, add the text "${prompts.clickbait_text}" in a huge, bold, exciting font with a contrasting outline or drop shadow to make it pop. The text and the person should be the main focus. ${paletteCompositeInstruction} The final image must have a ${aspectRatio} aspect ratio. Do not add any other text.`;
    
    const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: editedFaceImage.base64, mimeType: editedFaceImage.mimeType } },
                { inlineData: { data: backgroundImage.base64, mimeType: backgroundImage.mimeType } },
                { text: compositePrompt }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const finalImagePart = finalResponse.candidates?.[0]?.content?.parts?.[0];
    if (!finalImagePart?.inlineData) {
        throw new Error("Failed to compose the final thumbnail.");
    }

    return `data:${finalImagePart.inlineData.mimeType};base64,${finalImagePart.inlineData.data}`;
};