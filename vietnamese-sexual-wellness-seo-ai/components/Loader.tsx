
import React from 'react';

const Loader: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center py-20 animate-in fade-in duration-500">
            <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-4 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-4 border-4 border-b-indigo-500 rounded-full animate-spin-slow"></div>
            </div>
            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">AI Đang Sáng Tạo Nội Dung Chuyên Sâu</h2>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                Chúng tôi đang nghiên cứu từ khóa, xây dựng cấu trúc bài viết và lồng ghép sản phẩm tinh tế nhất cho bạn. Quá trình này có thể mất 30-60 giây vì bài viết rất dài.
            </p>
            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Loader;
