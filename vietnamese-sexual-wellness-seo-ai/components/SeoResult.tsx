
import React, { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { SeoArticle } from '../types';
import CopyToClipboardButton from './CopyToClipboardButton';

interface SeoResultProps {
    article: SeoArticle;
}

const FeedbackSection: React.FC = () => {
    const [rating, setRating] = useState<'up' | 'down' | null>(null);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = () => {
        // In a real app, this would be an API call to log the feedback
        console.log('Feedback submitted:', { rating, comment, timestamp: new Date().toISOString() });
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center backdrop-blur-sm animate-in fade-in zoom-in duration-500">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Cảm ơn bạn đã phản hồi!</h3>
                <p className="text-slate-400">Ý kiến của bạn giúp chúng tôi cải thiện chất lượng nội dung tốt hơn.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                Đánh giá chất lượng bài viết
            </h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setRating('up')}
                        className={`p-4 rounded-xl border transition-all ${rating === 'up' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                        title="Hài lòng"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 010-7.764c.26-.85 1.083-1.368 1.972-1.368h.908c.445 0 .72.498.523.898a8.963 8.963 0 00-.27.602" />
                        </svg>
                    </button>
                    <button 
                        onClick={() => setRating('down')}
                        className={`p-4 rounded-xl border transition-all ${rating === 'down' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                        title="Không hài lòng"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368a12 12 0 010 7.764c-.26.85-1.083 1.368-1.972 1.368h-.908c-.445 0-.72-.498-.523-.898a8.963 8.963 0 00.27-.602m-.023-4.125c-.067-.386-.115-.774-.144-1.164A11.954 11.954 0 0013.48 3.75h-3.126c-1.026 0-1.945.694-2.054 1.715-.045.422-.068.85-.068 1.285a11.95 11.95 0 002.649 7.521c.388.482.987.729 1.605.729H13.48c.483 0 .964.078 1.423.23l3.114 1.04a4.501 4.501 0 001.423.23H18.096c.618 0 1.217-.247 1.605-.729a11.95 11.95 0 002.649-7.521c0-.435-.023-.863-.068-1.285a2.25 2.25 0 00-2.054-1.715h-3.126c-.618 0-.991-.724-.725-1.282.463-.975.723-2.066.723-3.218A2.25 2.25 0 0014.25 2.25a.75.75 0 00-.75.75v.033c0 .584-.11 1.148-.322 1.672-.303.759-.93 1.331-1.653 1.715a9.04 9.04 0 00-2.861 2.4c-.498.634-1.225 1.08-2.031 1.08h-1.13" />
                        </svg>
                    </button>
                </div>
                
                <div className="flex-1 w-full space-y-4">
                    <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Góp ý thêm để chúng tôi cải thiện..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px] resize-none"
                    />
                    <button 
                        onClick={handleSubmit}
                        disabled={!rating && !comment.trim()}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Gửi phản hồi
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResultCard: React.FC<{ title: string; children: React.ReactNode; textToCopy: string; preformatted?: boolean }> = ({ title, children, textToCopy, preformatted = false }) => (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">{title}</h3>
                <CopyToClipboardButton textToCopy={textToCopy} />
            </div>
            {preformatted ? (
                <pre className="whitespace-pre-wrap bg-slate-900/80 p-4 rounded-xl text-slate-300 font-mono text-xs overflow-x-auto border border-slate-700">
                    <code>{children}</code>
                </pre>
            ) : (
                <div className="text-slate-300 leading-relaxed">{children}</div>
            )}
        </div>
    </div>
);

const ArticleContentRenderer: React.FC<{ content: string }> = ({ content }) => {
    const processedHtml = useMemo(() => {
        if (!content) return '';
        // If content contains standard HTML tags, return it directly.
        const containsHtml = /<[a-z][\s\S]*>/i.test(content);
        if (containsHtml) {
            return content;
        }
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(block => {
                if (block.startsWith('<div') || block.startsWith('<img')) return block;
                
                if (block.startsWith('**') && block.endsWith('**')) {
                    const headingText = block.slice(2, -2);
                    return `<h2 class="text-3xl font-extrabold text-white mt-12 mb-6 border-l-4 border-purple-500 pl-4 shadow-sm">${headingText}</h2>`;
                }
                
                if (block.startsWith('- ') || block.startsWith('* ')) {
                    return `<li class="ml-6 mb-2 text-slate-300 list-disc">${block.substring(2)}</li>`;
                }

                const paragraphWithBold = block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300 font-semibold">$1</strong>');
                return `<p class="mb-6 text-slate-300 text-lg leading-relaxed antialiased">${paragraphWithBold}</p>`;
            })
            .join('');
    }, [content]);

    return (
        <div
            className="article-body prose prose-invert max-w-none text-slate-300 leading-relaxed antialiased"
            dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
    );
};

const SeoResult: React.FC<SeoResultProps> = ({ article }) => {
    const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);

    const allImages = useMemo(() => {
        if (article.imagesList && article.imagesList.length > 0) {
            return article.imagesList;
        }

        const list: { src: string; alt: string; caption: string; name: string; type: string }[] = [];
        
        if (article.imageUrl) {
            list.push({ 
                src: article.imageUrl, 
                alt: article.title || 'Ảnh bìa đại diện sản phẩm',
                caption: article.title || 'Ảnh bìa đại diện sản phẩm',
                name: `${article.urlSlug || 'anh-dai-dien'}-cover`, 
                type: 'Ảnh bìa đại diện' 
            });
        }
        
        // Extract dynamically from content
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi;
        let match;
        let index = 1;
        while ((match = imgRegex.exec(article.content)) !== null) {
            const src = match[1];
            const alt = match[2] || `Ảnh minh họa ${index}`;
            if (src && src !== article.imageUrl) {
                list.push({ 
                    src: src, 
                    alt: alt,
                    caption: alt,
                    name: `${article.urlSlug || 'anh-minh-hoa'}-body-${index}`, 
                    type: `Ảnh minh họa ${index}` 
                });
                index++;
            }
        }
        return list;
    }, [article.imagesList, article.imageUrl, article.content, article.urlSlug, article.title]);

    const handleDownloadZip = async () => {
        if (allImages.length === 0) return;
        setIsDownloadingZip(true);
        try {
            const zip = new JSZip();
            
            for (let i = 0; i < allImages.length; i++) {
                const img = allImages[i];
                const base64Data = img.src;
                
                if (base64Data.startsWith('data:')) {
                    const parts = base64Data.split(',');
                    const dataPart = parts[1];
                    const mimeMatch = parts[0].match(/data:([^;]+)/);
                    let extension = 'png';
                    if (mimeMatch) {
                        const mime = mimeMatch[1];
                        extension = mime.split('/')[1] || 'png';
                        if (extension === 'jpeg') extension = 'jpg';
                    }
                    zip.file(`${img.name}.${extension}`, dataPart, { base64: true });
                } else {
                    try {
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        let ext = 'png';
                        if (img.src.includes('.jpg') || img.src.includes('.jpeg')) ext = 'jpg';
                        else if (img.src.includes('.webp')) ext = 'webp';
                        else if (img.src.includes('.gif')) ext = 'gif';
                        zip.file(`${img.name}.${ext}`, blob);
                    } catch (err) {
                        console.warn(`Fetch image failed: ${img.src}`, err);
                    }
                }
            }
            
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${article.urlSlug || 'thu-muc-anh'}-hinh-anh.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Lỗi khi nén ảnh:", error);
        } finally {
            setIsDownloadingZip(false);
        }
    };

    const downloadSingleImage = async (src: string, defaultName: string) => {
        try {
            if (src.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = src;
                let ext = 'png';
                const mimeMatch = src.match(/data:image\/([^;]+)/);
                if (mimeMatch) {
                    ext = mimeMatch[1];
                    if (ext === 'jpeg') ext = 'jpg';
                }
                link.download = `${defaultName}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                // Fetch external URLs as a Blob to force download and bypass browser open in new tab
                const response = await fetch(src);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = blobUrl;
                let ext = 'jpg';
                if (src.includes('.png')) ext = 'png';
                else if (src.includes('.webp')) ext = 'webp';
                else if (src.includes('.gif')) ext = 'gif';
                
                link.download = defaultName.includes('.') ? defaultName : `${defaultName}.${ext}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            }
        } catch (error) {
            console.error("Lỗi khi tải ảnh đơn lẻ:", error);
            // Fallback: Open in new tab
            const link = document.createElement('a');
            link.href = src;
            link.target = '_blank';
            link.download = defaultName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-slate-700 pb-6">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Bản thảo nội dung chuẩn SEO</h2>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
                                <button
                                    onClick={() => setViewMode('preview')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === 'preview'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Xem trước
                                </button>
                                <button
                                    onClick={() => setViewMode('html')}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        viewMode === 'html'
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Mã HTML
                                </button>
                            </div>
                            <CopyToClipboardButton textToCopy={article.content} />
                        </div>
                    </div>
                    
                    <div className="max-w-4xl mx-auto">
                        {viewMode === 'preview' ? (
                            <>
                                <header className="mb-12">
                                    <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-8">
                                        {article.title}
                                    </h1>
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {(article.tags || []).map((tag, i) => (
                                            <span key={i} className="text-xs font-bold px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 uppercase">#{tag}</span>
                                        ))}
                                    </div>
                                    <img src={article.imageUrl} alt={article.title} className="w-full h-[500px] rounded-3xl object-cover shadow-2xl border border-slate-700" />
                                </header>

                                <ArticleContentRenderer content={article.content} />
                            </>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400">
                                    Dưới đây là mã nguồn HTML đầy đủ của bài viết chuẩn SEO. Bạn có thể dễ dàng sao chép toàn bộ mã này để dán trực tiếp vào mục chỉnh sửa HTML/Classic Editor của các nền tảng CMS phổ biến như WordPress, Haravan, Sapo, Blogger,...
                                </p>
                                <div className="relative">
                                    <pre className="whitespace-pre-wrap bg-slate-900/90 p-6 rounded-2xl text-emerald-400 font-mono text-sm overflow-x-auto border border-slate-700 max-h-[800px] overflow-y-auto leading-relaxed select-all">
                                        <code>{article.content}</code>
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <ResultCard title="SEO Meta Description" textToCopy={article.metaDescription}>
                    <p className="text-lg italic text-slate-400 leading-relaxed">"{article.metaDescription}"</p>
                </ResultCard>
                <ResultCard title="SEO Friendly URL" textToCopy={article.urlSlug}>
                     <p className="font-mono text-xl text-emerald-400 font-bold">/{article.urlSlug}</p>
                </ResultCard>
            </div>
            
            <div className="grid lg:grid-cols-3 gap-6">
                 <ResultCard title="Focus Keywords" textToCopy={article.metaKeywords}>
                    <p className="text-sm font-medium">{article.metaKeywords}</p>
                </ResultCard>
                 <ResultCard title="Related Semantic Keywords" textToCopy={(article.relatedKeywords || []).join(', ')}>
                    <div className="flex flex-wrap gap-1.5">
                        {(article.relatedKeywords || []).map((k, i) => (
                            <span key={i} className="text-xs bg-slate-900/50 px-2 py-1 rounded border border-slate-700">{k}</span>
                        ))}
                    </div>
                </ResultCard>
                 <ResultCard title="Image AI Prompt" textToCopy={article.imagePrompt}>
                    <p className="text-xs italic font-mono">{article.imagePrompt}</p>
                </ResultCard>
            </div>
            
             <ResultCard title="JSON-LD Structured Data" textToCopy={article.htmlHeader} preformatted>
                {article.htmlHeader}
            </ResultCard>

            {article.usedInternalLinks && article.usedInternalLinks.length > 0 && (
                <ResultCard title="Danh sách Internal Link đã sử dụng" textToCopy={article.usedInternalLinks.join('\n')}>
                    <ul className="space-y-2 text-slate-300 font-mono text-xs">
                        {article.usedInternalLinks.map((link, idx) => (
                            <li key={idx} className="truncate flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full flex-shrink-0"></span>
                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline hover:text-indigo-300 truncate">{link}</a>
                            </li>
                        ))}
                    </ul>
                </ResultCard>
            )}

            {/* Thư mục hình ảnh */}
            {allImages.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 backdrop-blur-md">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-700 pb-5">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                Thư mục hình ảnh ({allImages.length})
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Các hình ảnh chất lượng cao đi kèm bài viết được thiết kế hoặc tạo bởi AI</p>
                        </div>
                        <button
                            onClick={handleDownloadZip}
                            disabled={isDownloadingZip}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-sm whitespace-nowrap active:scale-95"
                        >
                            {isDownloadingZip ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Đang nén thư mục ({allImages.length} ảnh)...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    <span>Tải toàn bộ thư mục (.ZIP)</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allImages.map((img: any, i: number) => (
                            <div key={i} className="group relative bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden shadow-md flex flex-col transition-all duration-300 hover:border-slate-600 hover:shadow-xl">
                                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden border-b border-slate-700/50">
                                    <img 
                                        src={img.src} 
                                        alt={img.alt || img.type} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute top-2 left-2 bg-slate-900/90 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 text-slate-300 rounded-full border border-slate-700/50">
                                        {i === 0 ? "Bìa chính (Hero)" : `Minh họa #${i}`}
                                    </div>
                                    {img.sceneType && (
                                        <div className="absolute bottom-2 right-2 bg-indigo-950/90 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 text-indigo-300 rounded-md border border-indigo-700/50">
                                            {img.sceneType.replace('_', ' ')}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                                    <div className="space-y-1.5">
                                        <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider line-clamp-1">{img.type}</h4>
                                        <p className="text-[11px] text-slate-400 italic line-clamp-2 leading-relaxed" title={img.alt}>
                                            <strong className="text-indigo-400 not-italic font-semibold">Alt:</strong> {img.alt || 'Ảnh minh họa chuẩn SEO'}
                                        </p>
                                        <p className="text-[10px] font-mono text-emerald-400/80 truncate" title={img.name}>
                                            📁 {img.name}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(img.alt || img.type);
                                            }}
                                            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-[11px] transition-colors border border-slate-700"
                                            title="Sao chép thuộc tính Alt"
                                        >
                                            Copy Alt
                                        </button>
                                        <button
                                            onClick={() => downloadSingleImage(img.src, img.name)}
                                            className="inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold rounded-xl text-[11px] transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.0} stroke="currentColor" className="w-3 h-3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                            </svg>
                                            Tải ảnh
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <FeedbackSection />
        </div>
    );
};

export default SeoResult;
