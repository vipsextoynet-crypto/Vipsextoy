import React, { useState } from 'react';
import { HotTopicItem } from '../types';

interface HotContent30DaysProps {
    topics: HotTopicItem[];
    onSelectTopic: (topicTitle: string) => void;
    onRefresh: () => void;
    isLoading: boolean;
    activeKeyword?: string;
    onClearKeyword?: () => void;
}

const CATEGORY_TABS: { key: HotTopicItem['category'] | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: 'Tất cả Hot Content', icon: '🔥' },
    { key: 'trending', label: 'Trending 30 ngày', icon: '⚡' },
    { key: 'buying', label: 'Mua hàng & Chuyển đổi', icon: '🛍️' },
    { key: 'review', label: 'Review & So sánh', icon: '⭐' },
    { key: 'lifestyle', label: 'Nghệ thuật & Phòng the', icon: '💡' },
    { key: 'guide', label: 'Vệ sinh & Bảo quản', icon: '🛡️' },
];

export const HotContent30Days: React.FC<HotContent30DaysProps> = ({
    topics,
    onSelectTopic,
    onRefresh,
    isLoading,
    activeKeyword,
    onClearKeyword,
}) => {
    const [activeTab, setActiveTab] = useState<HotTopicItem['category'] | 'all'>('all');
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [showSuccessBadge, setShowSuccessBadge] = useState<boolean>(false);

    const filteredTopics = activeTab === 'all' 
        ? topics 
        : topics.filter(t => t.category === activeTab);

    const handleRefreshClick = () => {
        if (isLoading) return;
        onRefresh();
        setShowSuccessBadge(true);
        setTimeout(() => setShowSuccessBadge(false), 4000);
    };

    const handlePickTopic = (topic: HotTopicItem) => {
        setSelectedTopicId(topic.id);
        onSelectTopic(topic.title);

        // Smooth scroll up to Step 2 input
        const step2Element = document.getElementById('topic-input');
        if (step2Element) {
            step2Element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            step2Element.focus();
        }
    };

    return (
        <section id="hot-content-30-days" className="w-full">
            {/* Header section with live stats badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-full text-pink-300 text-xs font-bold tracking-wide uppercase">
                            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
                            Top Trend 30 Ngày Gần Nhất
                        </div>
                        {showSuccessBadge && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs font-bold animate-in fade-in zoom-in-95 duration-200">
                                <span>✓</span>
                                Đã cập nhật chủ đề mới!
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight flex-wrap">
                        Chủ đề Hot Content trong 30 Ngày
                        {activeKeyword && (
                            <span className="inline-flex items-center gap-2 text-sm font-normal text-purple-300 bg-purple-950/60 px-3 py-1 rounded-lg border border-purple-800">
                                <span>Lọc theo: "{activeKeyword}"</span>
                                {onClearKeyword && (
                                    <button
                                        onClick={onClearKeyword}
                                        className="text-slate-400 hover:text-white font-bold ml-1 text-xs bg-slate-800 px-1.5 py-0.5 rounded"
                                        title="Xóa bộ lọc từ khóa"
                                    >
                                        ✕
                                    </button>
                                )}
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Tổng hợp các chủ đề có lượng tìm kiếm cao, độ thảo luận lớn và tỷ lệ chuyển đổi đơn hàng tốt nhất 30 ngày qua. Nhấn để chọn và tạo bài ngay.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <button
                        id="refresh-hot-topics-btn"
                        onClick={handleRefreshClick}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-700/80 to-indigo-700/80 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-bold rounded-xl border border-purple-500/40 hover:border-purple-400 transition-all duration-200 shadow-md shadow-purple-950/40 disabled:opacity-50 active:scale-95 cursor-pointer"
                        title="Quét lại xu hướng 30 ngày bằng AI"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            strokeWidth={2} 
                            stroke="currentColor" 
                            className={`w-4 h-4 text-purple-200 ${isLoading ? 'animate-spin' : ''}`}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        <span>{isLoading ? 'Đang phân tích AI...' : 'Làm mới Xu hướng 30 ngày'}</span>
                    </button>
                </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                {CATEGORY_TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const count = tab.key === 'all' 
                        ? topics.length 
                        : topics.filter(t => t.category === tab.key).length;

                    return (
                        <button
                            key={tab.key}
                            id={`tab-category-${tab.key}`}
                            onClick={() => setActiveTab(tab.key)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                                isActive
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30 ring-2 ring-purple-400/40'
                                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                            <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Topics Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-44 bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 animate-pulse flex flex-col justify-between">
                            <div className="space-y-2.5">
                                <div className="h-4 bg-slate-700/60 rounded w-1/3"></div>
                                <div className="h-5 bg-slate-700/80 rounded w-full"></div>
                                <div className="h-5 bg-slate-700/80 rounded w-4/5"></div>
                            </div>
                            <div className="h-8 bg-slate-700/50 rounded-xl w-full"></div>
                        </div>
                    ))}
                </div>
            ) : filteredTopics.length === 0 ? (
                <div className="text-center py-12 bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl">
                    <p className="text-slate-400 text-sm">Không tìm thấy chủ đề nào trong danh mục này.</p>
                    <button 
                        onClick={() => setActiveTab('all')} 
                        className="mt-3 text-xs text-purple-400 hover:underline font-semibold"
                    >
                        Quay lại tất cả chủ đề
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                    {filteredTopics.map((item) => {
                        const isSelected = selectedTopicId === item.id;
                        return (
                            <div
                                key={item.id}
                                id={`hot-topic-card-${item.id}`}
                                className={`relative group flex flex-col justify-between p-5 rounded-2xl transition-all duration-300 bg-slate-800/40 backdrop-blur-sm border ${
                                    isSelected
                                        ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/30 shadow-xl shadow-purple-950/50'
                                        : 'border-slate-700/60 hover:border-purple-500/50 hover:bg-slate-800/70 hover:shadow-xl hover:shadow-purple-900/10'
                                }`}
                            >
                                <div>
                                    {/* Top meta tags */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-pink-500/15 text-pink-300 border border-pink-500/30">
                                            {item.badge}
                                        </span>
                                        {item.trendScore && (
                                            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                                                📈 {item.trendScore}% Hot
                                            </span>
                                        )}
                                    </div>

                                    {/* Topic Title */}
                                    <h3 
                                        onClick={() => handlePickTopic(item)}
                                        className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition-colors leading-snug cursor-pointer mb-2.5"
                                    >
                                        {item.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                                        {item.description}
                                    </p>
                                </div>

                                {/* Bottom Metadata & Action Button */}
                                <div className="pt-3 border-t border-slate-700/50 space-y-3">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                        <span className="truncate max-w-[150px]">🎯 {item.targetKeyword}</span>
                                        <span className="text-slate-400">{item.searchIntent}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handlePickTopic(item)}
                                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 ${
                                            isSelected
                                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                                                : 'bg-purple-600/20 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/30 hover:border-purple-500'
                                        }`}
                                    >
                                        {isSelected ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                                </svg>
                                                <span>Đã chọn chủ đề này</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Viết bài theo chủ đề này</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default HotContent30Days;
