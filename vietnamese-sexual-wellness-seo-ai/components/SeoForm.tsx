import React, { useState, useRef } from 'react';
import { ImageGenerationSettings, ImageStyle, ContextMode, ProductReference } from '../types';

interface SeoFormProps {
    topic: string;
    setTopic: (topic: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
    imageSettings: ImageGenerationSettings;
    setImageSettings: React.Dispatch<React.SetStateAction<ImageGenerationSettings>>;
}

const SeoForm: React.FC<SeoFormProps> = ({
    topic,
    setTopic,
    onSubmit,
    isLoading,
    imageSettings,
    setImageSettings,
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const ref: ProductReference = {
                imageDataUrl: dataUrl,
                originalFileName: file.name,
            };
            setImageSettings((prev) => ({
                ...prev,
                referenceImage: ref,
            }));
        };
        reader.readAsDataURL(file);
    };

    const removeReferenceImage = () => {
        setImageSettings((prev) => ({
            ...prev,
            referenceImage: undefined,
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <input
                    id="topic-input"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Nhập tiêu đề bài viết hoặc chọn gợi ý bên dưới..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 placeholder-slate-600"
                    disabled={isLoading}
                />
            </div>

            {/* AI Image Generation Control Panel */}
            <div className="bg-slate-900/60 border border-slate-700/70 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                            AI
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-200">Cấu hình Pipeline tạo ảnh AI</h3>
                            <p className="text-xs text-slate-400">
                                {imageSettings.referenceImage ? 'Đã ghim ảnh sản phẩm mẫu • ' : ''}
                                {imageSettings.contextMode === 'auto' ? 'Tự động nhận diện bối cảnh theo từng Section' : `Bối cảnh: ${imageSettings.contextMode}`}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="text-xs text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
                    >
                        {showAdvanced ? 'Thu gọn ▲' : 'Tùy chỉnh chi tiết ▼'}
                    </button>
                </div>

                {showAdvanced && (
                    <div className="mt-5 pt-5 border-t border-slate-800 space-y-5 animate-in fade-in duration-300">
                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* Image Style Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                                    Phong cách hình ảnh
                                </label>
                                <select
                                    value={imageSettings.imageStyle}
                                    onChange={(e) => setImageSettings(prev => ({ ...prev, imageStyle: e.target.value as ImageStyle }))}
                                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="commercial_product">Thương mại điện tử cao cấp (Commercial Product)</option>
                                    <option value="editorial_luxury">Phong cách sống sang trọng (Editorial Luxury)</option>
                                    <option value="minimalist_clean">Tối giản tinh tế (Minimalist Clean)</option>
                                    <option value="studio_product">Studio sắc nét tiêu chuẩn (Studio Packshot)</option>
                                </select>
                            </div>

                            {/* Context Mode Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                                    Cơ chế bám sát ngữ cảnh (Context Mode)
                                </label>
                                <select
                                    value={imageSettings.contextMode}
                                    onChange={(e) => setImageSettings(prev => ({ ...prev, contextMode: e.target.value as ContextMode }))}
                                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="auto">Tự động (Mapping từng H2: Giới thiệu/Review/Vệ sinh/Bảo quản)</option>
                                    <option value="product_hero">Chỉ tập trung ảnh cận cảnh sản phẩm (Product Hero)</option>
                                    <option value="storage">Góc bảo quản ngăn kéo/túi nhung đầu giường</option>
                                    <option value="instructional">Góc vệ sinh/làm sạch bằng dung dịch chuyên dụng</option>
                                    <option value="comparison">Bộ sưu tập so sánh các loại sản phẩm</option>
                                </select>
                            </div>
                        </div>

                        {/* Product Reference Image Upload */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                                Ảnh sản phẩm thực tế của Shop (Tùy chọn - Giúp AI giữ đúng mẫu mã/màu sắc)
                            </label>
                            
                            {!imageSettings.referenceImage ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-950/40 rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                    <div className="flex flex-col items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 transition-colors">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                        </svg>
                                        <p className="text-xs font-semibold text-slate-300">Nhấn để tải lên ảnh sản phẩm thực tế (JPG, PNG, WebP)</p>
                                        <p className="text-[11px] text-slate-500">AI sẽ trích xuất màu sắc, thiết kế vỏ hộp và đường nét vật lý của sản phẩm</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={imageSettings.referenceImage.imageDataUrl}
                                            alt="Product reference"
                                            className="w-12 h-12 rounded-lg object-cover border border-slate-600"
                                            referrerPolicy="no-referrer"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-sm">
                                                {imageSettings.referenceImage.originalFileName || 'Ảnh tham chiếu sản phẩm'}
                                            </p>
                                            <span className="text-[10px] text-emerald-400 font-medium">✓ Đã gắn làm visual reference</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeReferenceImage}
                                        className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                                    >
                                        Xóa ảnh
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Visual Provider Notice */}
                        <div className="text-[11px] text-slate-400 flex items-center justify-between bg-slate-950/30 p-2.5 rounded-lg border border-slate-800">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Engine: <strong>Gemini Multimodal Visual Suite</strong>
                            </span>
                            <span className="text-slate-500">
                                Adapter Seedance: <span className="text-slate-400 font-mono">Ready (Adapter Mode)</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <button
                id="generate-article-btn"
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-lg font-bold rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang tạo nội dung & phân tích Scene Brief...
                    </>
                ) : (
                    'Tạo bài viết & Bộ ảnh chuẩn SEO'
                )}
            </button>
        </form>
    );
};

export default SeoForm;
