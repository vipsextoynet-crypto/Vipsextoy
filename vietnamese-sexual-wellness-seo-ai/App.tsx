
import React, { useState, useCallback, useEffect } from 'react';
import { SeoArticle, ImageGenerationSettings, HotTopicItem } from './types';
import { generateSeoArticle, generateHotTopics30Days, CURATED_HOT_TOPICS_30_DAYS, CURATED_HOT_TOPICS_POOL_2 } from './services/geminiService';
import SeoForm from './components/SeoForm';
import SeoResult from './components/SeoResult';
import HotContent30Days from './components/HotContent30Days';
import Loader from './components/Loader';

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-purple-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

export default function App() {
    const [keyword, setKeyword] = useState<string>('');
    const [topic, setTopic] = useState<string>('');
    const [seoArticle, setSeoArticle] = useState<SeoArticle | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hotTopics, setHotTopics] = useState<HotTopicItem[]>(CURATED_HOT_TOPICS_30_DAYS);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
    
    // Image Generation Pipeline Settings
    const [imageSettings, setImageSettings] = useState<ImageGenerationSettings>({
        imageStyle: 'commercial_product',
        visualPurpose: 'article_hero',
        contextMode: 'auto',
        productPriority: 'primary_subject',
        provider: 'gemini',
    });

    const fetchHotTopics = useCallback(async (searchKeyword?: string, forceRefresh: boolean = false) => {
        setIsLoadingSuggestions(true);
        try {
            const topics = await generateHotTopics30Days(searchKeyword, forceRefresh);
            setHotTopics(topics);
        } catch (err) {
            console.error('Error generating hot topics 30 days:', err);
            const fallback = [...CURATED_HOT_TOPICS_30_DAYS, ...CURATED_HOT_TOPICS_POOL_2];
            const shuffled = [...fallback].sort(() => Math.random() - 0.5);
            setHotTopics(shuffled.slice(0, 16).map((t, idx) => ({ ...t, id: `fallback-${Date.now()}-${idx}` })));
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, []);

    useEffect(() => {
        fetchHotTopics();
    }, [fetchHotTopics]);

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError('Vui lòng nhập hoặc chọn một chủ đề.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSeoArticle(null);
        try {
            const article = await generateSeoArticle(topic, imageSettings);
            setSeoArticle(article);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi không xác định.');
        } finally {
            setIsLoading(false);
        }
    }, [topic, imageSettings]);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-purple-500/30">
            <main className="container mx-auto px-4 py-12">
                <header className="text-center mb-16">
                    <div className="inline-flex items-center gap-4 mb-6">
                        <SparklesIcon />
                        <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400 text-transparent bg-clip-text tracking-tight">
                            Adult Wellness SEO
                        </h1>
                    </div>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                        Hệ thống AI chuyên biệt tạo nội dung <span className="text-purple-400 font-semibold">Sức khỏe Tình dục & E-commerce</span> cao cấp. 
                        Tối ưu hóa doanh thu đồ chơi tình dục thông qua các bài viết giáo dục tinh tế, chuẩn SEO, chuyển đổi cao và bộ ảnh thương mại bám sát từng section.
                    </p>
                </header>

                {/* Form Section */}
                <div className="max-w-4xl mx-auto bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700/50">
                    <div className="mb-10 pb-10 border-b border-slate-700/50">
                        <label htmlFor="keyword" className="block text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                            Bước 1: Lọc Xu hướng theo Từ khóa mục tiêu (Tùy chọn)
                        </label>
                        <div className="flex gap-3">
                            <input
                                id="keyword"
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && keyword.trim()) {
                                        fetchHotTopics(keyword, true);
                                    }
                                }}
                                placeholder="Ví dụ: máy rung, trứng rung, sextoy HCM, gel bôi trơn..."
                                className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-slate-600"
                            />
                            <button
                                onClick={() => fetchHotTopics(keyword, true)}
                                disabled={isLoadingSuggestions || !keyword.trim()}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                            >
                                {isLoadingSuggestions ? 'Đang quét...' : 'Quét Hot 30 ngày'}
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mt-3 italic">
                            Nhập từ khóa để AI lọc các chủ đề hot 30 ngày theo đúng ngách, hoặc chọn nhanh từ danh sách xu hướng phong phú bên dưới.
                        </p>
                    </div>

                    <label className="block text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                        Bước 2: Triển khai nội dung bài viết
                    </label>
                    <SeoForm 
                        topic={topic} 
                        setTopic={setTopic} 
                        onSubmit={handleGenerate} 
                        isLoading={isLoading} 
                        imageSettings={imageSettings}
                        setImageSettings={setImageSettings}
                    />
                </div>
                
                {/* 30-Day Hot Content Trending Section */}
                <div className="max-w-5xl mx-auto mt-16 border-t border-slate-800 pt-12">
                    <HotContent30Days 
                        topics={hotTopics}
                        onSelectTopic={(selectedTitle) => setTopic(selectedTitle)}
                        onRefresh={() => fetchHotTopics(keyword, true)}
                        isLoading={isLoadingSuggestions}
                        activeKeyword={keyword}
                        onClearKeyword={() => {
                            setKeyword('');
                            fetchHotTopics('', true);
                        }}
                    />
                </div>

                {error && (
                    <div className="max-w-4xl mx-auto mt-8 p-6 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl text-center font-medium shadow-xl">
                        <div className="flex items-center justify-center gap-2 mb-2 text-red-400 font-bold text-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Thông báo xử lý nội dung
                        </div>
                        <p className="text-slate-300 mb-4">{error}</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={handleGenerate}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg transition duration-200"
                            >
                                🔄 Thử lại ngay
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="mt-20">
                    {isLoading && <Loader />}
                    {seoArticle && <SeoResult article={seoArticle} />}
                </div>
            </main>
        </div>
    );
}
