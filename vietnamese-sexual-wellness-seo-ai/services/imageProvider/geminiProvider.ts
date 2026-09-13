import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Modality } from '@google/genai';
import { 
    ImageProvider, 
    ImageGenerationOptions, 
    ImageGenerationResult 
} from './types';

export class GeminiImageProvider implements ImageProvider {
    public readonly id = 'gemini';
    public readonly name = 'Google Gemini Image Provider';

    private ai: GoogleGenAI | null = null;

    private readonly safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    constructor() {
        const apiKey = typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : undefined;
        if (apiKey) {
            this.ai = new GoogleGenAI({ apiKey });
        }
    }

    public isAvailable(): boolean {
        return Boolean(this.ai);
    }

    /**
     * Sinh ảnh từ options & scene brief
     */
    public async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        if (!this.ai) {
            const apiKey = typeof process !== 'undefined' ? (process.env.API_KEY || process.env.GEMINI_API_KEY) : undefined;
            if (!apiKey) {
                throw new Error("Không tìm thấy API_KEY trong môi trường ứng dụng.");
            }
            this.ai = new GoogleGenAI({ apiKey });
        }

        const { prompt, sceneBrief, reference } = options;

        // Nếu có Product Reference Image, ưu tiên sử dụng Multimodal Reference Generation
        if (reference && reference.imageDataUrl) {
            return this.generateFromReference(options);
        }

        // 1. Thử nghiệm model Gemini Flash Image (hỗ trợ Modality.IMAGE)
        const flashModels = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'];
        for (const modelName of flashModels) {
            try {
                const response = await this.ai.models.generateContent({
                    model: modelName,
                    contents: { parts: [{ text: prompt }] },
                    config: {
                        responseModalities: [Modality.IMAGE],
                        safetySettings: this.safetySettings,
                    },
                });

                if (response.candidates && response.candidates[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            const dataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                            return {
                                imageUrl: dataUrl,
                                altText: sceneBrief.altTextSuggestion,
                                caption: sceneBrief.captionSuggestion || sceneBrief.altTextSuggestion,
                                seoFilename: sceneBrief.seoFilenameSlug,
                                provider: this.id,
                                modelUsed: modelName,
                                sceneBrief,
                                isFallback: false,
                            };
                        }
                    }
                }
            } catch (err) {
                console.warn(`Thử nghiệm model ${modelName} thất bại:`, err);
            }
        }

        // 2. Thử nghiệm Imagen 3 nếu có
        try {
            const imagenResponse: any = await this.ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: options.aspectRatio === '16:9' ? '16:9' : (options.aspectRatio === '4:3' ? '4:3' : '1:1'),
                    outputMimeType: 'image/jpeg',
                },
            });

            if (imagenResponse?.generatedImages && imagenResponse.generatedImages.length > 0) {
                const imgBytes = imagenResponse.generatedImages[0].image.imageBytes;
                const dataUrl = `data:image/jpeg;base64,${imgBytes}`;
                return {
                    imageUrl: dataUrl,
                    altText: sceneBrief.altTextSuggestion,
                    caption: sceneBrief.captionSuggestion || sceneBrief.altTextSuggestion,
                    seoFilename: sceneBrief.seoFilenameSlug,
                    provider: this.id,
                    modelUsed: 'imagen-3.0-generate-002',
                    sceneBrief,
                    isFallback: false,
                };
            }
        } catch (imagenErr) {
            console.warn("Thử nghiệm Imagen-3 thất bại:", imagenErr);
        }

        throw new Error("Không thể sinh ảnh với các model Gemini Image hiện hành.");
    }

    /**
     * Sinh ảnh với sự hỗ trợ của Reference Image (Product photo / packaging)
     */
    public async generateFromReference(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        if (!this.ai) {
            throw new Error("Gemini AI client chưa được khởi tạo.");
        }

        const { prompt, sceneBrief, reference } = options;
        if (!reference || !reference.imageDataUrl) {
            return this.generateImage(options);
        }

        // Tách MIME type và raw base64 data
        let mimeType = 'image/jpeg';
        let base64Data = reference.imageDataUrl;
        if (reference.imageDataUrl.startsWith('data:')) {
            const matches = reference.imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
            }
        }

        const multimodalPrompt = `Maintain the exact physical product form, color palette, material textures, and packaging aesthetics from the provided reference image: ${prompt}`;

        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: base64Data,
            },
        };

        const textPart = {
            text: multimodalPrompt,
        };

        const flashModels = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'];
        for (const modelName of flashModels) {
            try {
                const response = await this.ai.models.generateContent({
                    model: modelName,
                    contents: { parts: [imagePart, textPart] },
                    config: {
                        responseModalities: [Modality.IMAGE],
                        safetySettings: this.safetySettings,
                    },
                });

                if (response.candidates && response.candidates[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            const dataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                            return {
                                imageUrl: dataUrl,
                                altText: sceneBrief.altTextSuggestion,
                                caption: sceneBrief.captionSuggestion || sceneBrief.altTextSuggestion,
                                seoFilename: sceneBrief.seoFilenameSlug,
                                provider: this.id,
                                modelUsed: `${modelName}-reference`,
                                sceneBrief,
                                isFallback: false,
                            };
                        }
                    }
                }
            } catch (err) {
                console.warn(`Reference generation with ${modelName} failed:`, err);
            }
        }

        // Nếu multimodal reference generation bị giới hạn, fallback về text prompt thông thường
        return this.generateImage({
            ...options,
            reference: undefined,
        });
    }
}
