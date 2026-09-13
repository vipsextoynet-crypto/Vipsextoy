import { 
    SeedanceProviderInterface, 
    ImageGenerationOptions, 
    ImageGenerationResult, 
    SeedanceConfig 
} from './types';

/**
 * SeedanceProvider Adapter
 * 
 * Chuẩn bị kiến trúc adapter mở rộng để tích hợp các tính năng Video/Image Generation 
 * từ dịch vụ Seedance trong tương lai khi có API endpoint và API key chính thức.
 * 
 * Lưu ý:
 * - Không hard-code API key hoặc endpoint giả định.
 * - Không giả lập phản hồi (no fake responses/endpoints).
 * - Đánh dấu unavailable một cách an toàn khi chưa được cấu hình, không làm crash ứng dụng.
 */
export class SeedanceProvider implements SeedanceProviderInterface {
    public readonly id = 'seedance';
    public readonly name = 'Seedance Provider (AI Video & Visual Suite)';

    private config: SeedanceConfig;

    constructor(config?: SeedanceConfig) {
        this.config = config || {
            apiKey: typeof process !== 'undefined' ? process.env.SEEDANCE_API_KEY : undefined,
            apiEndpoint: typeof process !== 'undefined' ? process.env.SEEDANCE_API_ENDPOINT : undefined,
            model: typeof process !== 'undefined' ? process.env.SEEDANCE_MODEL : undefined,
        };
    }

    /**
     * Kiểm tra tính khả dụng của provider
     */
    public isAvailable(): boolean {
        return Boolean(this.config.apiKey && this.config.apiEndpoint);
    }

    /**
     * Sinh ảnh từ Scene Brief / Prompt khi Seedance API được cấu hình
     */
    public async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
        if (!this.isAvailable()) {
            throw new Error(
                'SeedanceProvider hiện chưa được cấu hình (thiếu SEEDANCE_API_KEY hoặc SEEDANCE_API_ENDPOINT). Ứng dụng sẽ tự động sử dụng GeminiImageProvider.'
            );
        }

        // Khi có endpoint chính thức: Gọi API thực tế
        throw new Error('Seedance API endpoint chưa được kích hoạt cho workspace này.');
    }

    /**
     * Text to Video adapter method
     */
    public async textToVideo(prompt: string, options?: Record<string, any>): Promise<{ videoUrl: string }> {
        if (!this.isAvailable()) {
            throw new Error('Seedance Video API chưa được cấu hình.');
        }
        throw new Error('Seedance Video API chưa được kích hoạt cho workspace này.');
    }

    /**
     * Image to Video adapter method
     */
    public async imageToVideo(imageUrl: string, prompt?: string): Promise<{ videoUrl: string }> {
        if (!this.isAvailable()) {
            throw new Error('Seedance Video API chưa được cấu hình.');
        }
        throw new Error('Seedance Video API chưa được kích hoạt cho workspace này.');
    }

    /**
     * Reference image to Video adapter method
     */
    public async referenceToVideo(referenceUrl: string, prompt: string): Promise<{ videoUrl: string }> {
        if (!this.isAvailable()) {
            throw new Error('Seedance Video API chưa được cấu hình.');
        }
        throw new Error('Seedance Video API chưa được kích hoạt cho workspace này.');
    }

    /**
     * Job polling status
     */
    public async getGenerationStatus(jobId: string): Promise<{ status: 'pending' | 'completed' | 'failed'; progress?: number }> {
        if (!this.isAvailable()) {
            throw new Error('Seedance Video API chưa được cấu hình.');
        }
        throw new Error('Seedance Video API chưa được kích hoạt cho workspace này.');
    }
}
