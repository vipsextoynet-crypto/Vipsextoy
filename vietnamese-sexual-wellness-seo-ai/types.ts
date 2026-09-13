
export * from './services/imageProvider/types';

export interface HotTopicItem {
    id: string;
    title: string;
    category: 'all' | 'trending' | 'buying' | 'review' | 'lifestyle' | 'guide';
    badge: string;
    trendScore?: number;
    description: string;
    targetKeyword: string;
    searchIntent: 'Mua hàng (Transactional)' | 'Đánh giá (Commercial)' | 'Thông tin (Informational)' | 'Hướng dẫn (How-to)';
}

export interface SeoImageItem {
    src: string;
    alt: string;
    caption: string;
    name: string;
    type: string;
    sceneType?: string;
    productName?: string;
}

export interface SeoArticle {
    title: string;
    content: string;
    tags: string[];
    relatedKeywords: string[];
    imagePrompt: string;
    imageUrl: string;
    urlSlug: string;
    metaKeywords: string;
    metaDescription: string;
    htmlHeader: string;
    usedInternalLinks?: string[];
    imagesList?: SeoImageItem[];
}

