export type VisualPurpose = 
    | 'article_hero' 
    | 'section_illustration' 
    | 'product_showcase' 
    | 'product_comparison' 
    | 'how_to' 
    | 'lifestyle_editorial'
    | 'storage_care';

export type ImageStyle = 
    | 'photorealistic' 
    | 'commercial_product' 
    | 'editorial_luxury' 
    | 'minimalist_clean' 
    | 'studio_product';

export type ProductPriority = 'low' | 'medium' | 'high' | 'primary_subject';

export type ContextMode = 
    | 'auto' 
    | 'product_focused' 
    | 'lifestyle' 
    | 'instructional' 
    | 'storage' 
    | 'comparison'
    | 'product_hero';

export type SceneType = 
    | 'product_hero' 
    | 'product_editorial' 
    | 'comparison_layout' 
    | 'selection_guide' 
    | 'hygiene_cleaning' 
    | 'storage_drawer' 
    | 'lifestyle_ambient' 
    | 'unboxing_packaging';

export interface ProductReference {
    name?: string;
    category?: string;
    imageDataUrl?: string; // base64 / data URL
    mimeType?: string;
    description?: string;
    originalFileName?: string;
}

export interface ImageGenerationSettings {
    visualPurpose: VisualPurpose;
    imageStyle: ImageStyle;
    productPriority: ProductPriority;
    contextMode: ContextMode;
    referenceImage?: ProductReference;
}

export interface SceneBrief {
    mainTopic: string;
    sectionTitle?: string;
    paragraphContext?: string;
    productCategory: string;
    productName?: string;
    productAttributes?: string[];
    visualSubject: string;
    visualPurpose: VisualPurpose;
    sceneType: SceneType;
    composition: string;
    lighting: string;
    style: string;
    audience: string;
    productPriority: ProductPriority;
    safetyGuidance: string;
    avoid: string[];
    altTextSuggestion: string;
    captionSuggestion?: string;
    seoFilenameSlug: string;
}

export interface RelevanceEvaluation {
    relevanceScore: number; // 0-100
    productMatchScore: number; // 0-100
    contextMatchScore: number; // 0-100
    safetyScore: number; // 0-100
    isApproved: boolean;
    reason: string;
    refinedPrompt?: string;
}

export interface ImageGenerationOptions {
    prompt: string;
    sceneBrief: SceneBrief;
    style?: ImageStyle;
    aspectRatio?: '1:1' | '16:9' | '4:3' | '3:4';
    reference?: ProductReference;
}

export interface ImageGenerationResult {
    imageUrl: string;
    altText: string;
    caption: string;
    seoFilename: string;
    provider: string;
    modelUsed: string;
    relevance?: RelevanceEvaluation;
    sceneBrief?: SceneBrief;
    isFallback?: boolean;
}

export interface ImageProvider {
    id: string;
    name: string;
    isAvailable(): boolean;
    generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
    generateFromReference?(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}

export interface SeedanceConfig {
    apiKey?: string;
    apiEndpoint?: string;
    model?: string;
}

export interface SeedanceProviderInterface extends ImageProvider {
    textToVideo?(prompt: string, options?: Record<string, any>): Promise<{ videoUrl: string }>;
    imageToVideo?(imageUrl: string, prompt?: string): Promise<{ videoUrl: string }>;
    referenceToVideo?(referenceUrl: string, prompt: string): Promise<{ videoUrl: string }>;
    getGenerationStatus?(jobId: string): Promise<{ status: 'pending' | 'completed' | 'failed'; progress?: number }>;
}
