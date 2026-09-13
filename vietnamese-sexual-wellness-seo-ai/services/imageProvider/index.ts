import { ImageProvider } from './types';
import { GeminiImageProvider } from './geminiProvider';
import { SeedanceProvider } from './seedanceProvider';

export * from './types';
export * from './geminiProvider';
export * from './seedanceProvider';

const geminiProvider = new GeminiImageProvider();
const seedanceProvider = new SeedanceProvider();

const providers: Record<string, ImageProvider> = {
    gemini: geminiProvider,
    seedance: seedanceProvider,
};

export function getImageProvider(providerId = 'gemini'): ImageProvider {
    const selected = providers[providerId];
    if (selected && selected.isAvailable()) {
        return selected;
    }
    // Default fallback to Gemini
    return geminiProvider;
}

export function getAvailableImageProviders(): { id: string; name: string; isAvailable: boolean }[] {
    return Object.values(providers).map(p => ({
        id: p.id,
        name: p.name,
        isAvailable: p.isAvailable(),
    }));
}
