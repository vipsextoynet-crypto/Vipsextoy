import { 
    SceneBrief, 
    VisualPurpose, 
    SceneType, 
    ProductPriority, 
    ImageStyle, 
    ImageGenerationSettings, 
    RelevanceEvaluation,
    ProductReference 
} from './imageProvider/types';

/**
 * Curated Tasteful Adult Wellness Stock Imagery Fallbacks
 * Tuyệt đối KHÔNG chứa hình bác sĩ, spa chăm sóc da mặt, phòng khám hay khiêu dâm.
 * Chỉ gồm ảnh thương mại cao cấp: sản phẩm tối giản, bao bì sang trọng, khay lưu trữ đầu giường, chai lọ tinh tế.
 */
export const TASTEFUL_ADULT_WELLNESS_STOCK: Record<SceneType, string[]> = {
    product_hero: [
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&h=800&q=80", // Minimalist elegant surface with aesthetic wellness bottle
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&h=800&q=80", // High-end cosmetic & intimate care bottles flatlay
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&h=800&q=80", // Glass dropper bottle with minimalist luxury look
    ],
    product_editorial: [
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&h=800&q=80", // Silk sheets on luxury modern bedroom bed
        "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1200&h=800&q=80", // Warm moody low-light intimate private room
        "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&h=800&q=80", // Clean bedside nightstand with subtle warm lamp
    ],
    comparison_layout: [
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&h=800&q=80", // Multiple organized wellness bottles on clean surface
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&h=800&q=80", // Neutral aesthetic product selection
    ],
    selection_guide: [
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&h=800&q=80", // Curated personal care bottles
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&h=800&q=80", // High end modern self-care collection
    ],
    hygiene_cleaning: [
        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&h=800&q=80", // Minimalist marble bathroom vanity with clean bottle & soft towel
        "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1200&h=800&q=80", // Rolled clean towels and warm ambient light
    ],
    storage_drawer: [
        "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&h=800&q=80", // Wooden nightstand with drawer & warm bedside lamp
        "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1200&h=800&q=80", // Private cozy bedroom nightstand corner
    ],
    lifestyle_ambient: [
        "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&h=800&q=80", // Aesthetic silk bed linen with soft morning light
        "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=1200&h=800&q=80", // Intimate bedroom atmosphere
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&h=800&q=80", // Soft tranquil wellness candlelit ambience
    ],
    unboxing_packaging: [
        "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&h=800&q=80", // Sleek product packaging bottles
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&h=800&q=80", // Minimalist designer box on stone
    ]
};

/**
 * Phân tích danh mục sản phẩm từ văn bản
 */
export function detectProductCategory(text: string): { category: string; productName?: string; attributes: string[] } {
    const lower = text.toLowerCase();
    
    // Gel bôi trơn & chất bôi trơn
    if (lower.includes('gel bôi trơn') || lower.includes('lubricant') || lower.includes('gốc nước') || lower.includes('gốc silicon') || lower.includes('bôi trơn') || lower.includes('lube')) {
        return {
            category: 'water-based intimate wellness lubricant bottle',
            productName: 'chai gel bôi trơn cao cấp',
            attributes: ['amber glass bottle with sleek pump dispenser', 'minimalist typography label', 'crystal clear formulation', 'cosmetic grade packaging', '35-60% focal dominance']
        };
    }
    
    // Máy hút / Máy bú liếm / Air-pulse clitoral stimulator
    if (lower.includes('hút') || lower.includes('bú liếm') || lower.includes('air-pulse') || lower.includes('song am') || lower.includes('sóng âm') || lower.includes('womanizer') || lower.includes('satisfyer')) {
        return {
            category: 'luxury air-pulse intimate stimulator device',
            productName: 'thiết bị kích thích sóng âm cao cấp',
            attributes: ['ergonomic teardrop silhouette', 'velvety soft-touch medical grade silicone body', 'rose gold metallic button accents', 'magnetic charging contacts', '35-60% focal dominance']
        };
    }

    // Trứng rung & Bullet vibrators
    if (lower.includes('trứng rung') || lower.includes('trung rung') || lower.includes('bullet vibrator') || lower.includes('trứng rung không dây')) {
        return {
            category: 'egg-shaped wireless intimate massager',
            productName: 'thiết bị rung hình trứng không dây',
            attributes: ['ergonomic smooth matte medical-grade silicone', 'compact wireless remote control', 'sleek pastel/blush finish', 'magnetic charging dock', '35-60% focal dominance']
        };
    }

    // Máy rung / Wand massager / Vibrators
    if (lower.includes('máy rung') || lower.includes('may rung') || lower.includes('vibrator') || lower.includes('wand massager') || lower.includes('máy massage')) {
        return {
            category: 'luxury personal wellness massager device',
            productName: 'thiết bị massage cá nhân cao cấp',
            attributes: ['sleek curvilinear industrial design', 'matte touch waterproof silicone body', 'rose gold metallic accents', 'discrete magnetic charger', '35-60% focal dominance']
        };
    }

    // Dương vật giả / Dildo / Silicone models
    if (lower.includes('dương vật giả') || lower.includes('duong vat gia') || lower.includes('dildo') || lower.includes('silicone model')) {
        return {
            category: 'sculptural intimate silicone wellness model',
            productName: 'mô hình hỗ trợ silicone cao cấp',
            attributes: ['curved architectural silhouette', 'ultra-hygienic platinum medical silicone', 'suction base or smooth handle', 'tasteful artistic curves', '35-60% focal dominance']
        };
    }

    // Âm đạo giả / Cốc thủ dâm / Masturbator sleeve
    if (lower.includes('âm đạo giả') || lower.includes('am dao gia') || lower.includes('cốc thủ dâm') || lower.includes('coc thu dam') || lower.includes('fleshlight') || lower.includes('masturbator') || lower.includes('tenga')) {
        return {
            category: 'modern discrete personal wellness sleeve device',
            productName: 'thiết bị chăm sóc cá nhân kín đáo',
            attributes: ['minimalist matte cylindrical outer shell', 'stealth tech appearance', 'hygienic inner core', 'discreet travel cap', '35-60% focal dominance']
        };
    }

    // Phụ kiện hậu môn / Butt plug / Prostate massager
    if (lower.includes('butt plug') || lower.includes('hậu môn') || lower.includes('tuyến tiền liệt') || lower.includes('prostate')) {
        return {
            category: 'ergonomic body-safe silicone wellness accessory',
            productName: 'phụ kiện chăm sóc sức khỏe cá nhân silicone y tế',
            attributes: ['smooth tapered silhouette with wide safety base', 'hygienic satin-finish platinum silicone', '35-60% focal dominance']
        };
    }

    // Bao cao su / Condoms
    if (lower.includes('bao cao su') || lower.includes('condom') || lower.includes('bcs') || lower.includes('bao cao su siêu mỏng')) {
        return {
            category: 'premium wellness intimate protection pack',
            productName: 'hộp bảo vệ intimate wellness',
            attributes: ['luxurious matte foil pack packaging', 'modern embossed minimalist box', 'clean typography', '35-60% focal dominance']
        };
    }

    // Vệ sinh / Dung dịch rửa chuyên dụng
    if (lower.includes('vệ sinh') || lower.includes('khử trùng') || lower.includes('làm sạch') || lower.includes('dung dịch rửa') || lower.includes('xịt kháng khuẩn')) {
        return {
            category: 'antibacterial intimate device cleansing foam & spray',
            productName: 'dung dịch vệ sinh thiết bị chuyên dụng',
            attributes: ['foam pump bottle', 'gentle spray nozzle', 'microfiber drying cloth', 'clean bathroom vanity context', '35-60% focal dominance']
        };
    }

    // Bảo quản / Hộp đựng / Túi nhung
    if (lower.includes('bảo quản') || lower.includes('hộp đựng') || lower.includes('túi nhung') || lower.includes('cất giữ') || lower.includes('kín đáo')) {
        return {
            category: 'discreet velvet storage pouch & nightstand lockbox',
            productName: 'túi bảo quản nhung và hộp cất giữ đầu giường',
            attributes: ['black/burgundy velvet drawstring bag', 'sleek lockable wooden drawer organizer', 'discreet protective case', '35-60% focal dominance']
        };
    }

    // Default general intimate wellness
    return {
        category: 'luxury intimate wellness consumer product',
        productName: 'sản phẩm chăm sóc sức khỏe tình dục cao cấp',
        attributes: ['minimalist designer aesthetic', 'high quality satin finish', 'tasteful consumer lifestyle packaging', '35-60% focal dominance']
    };
}

/**
 * Mapping Section -> Scene Type (Theo nguyên tắc bám sát Section)
 */
export function mapSectionToSceneType(sectionTitle = '', paragraph = ''): SceneType {
    const text = (sectionTitle + ' ' + paragraph).toLowerCase();

    // 1. "Đây là sản phẩm gì?" / Định nghĩa / Khái niệm / Giới thiệu -> product_hero
    if (text.includes('là gì') || text.includes('khái niệm') || text.includes('tổng quan') || text.includes('gioi thieu') || text.includes('định nghĩa') || text.includes('cau tao') || text.includes('cấu tạo')) {
        return 'product_hero';
    }
    // 2. "Review sản phẩm" / Trải nghiệm / Cảm nhận -> product_editorial
    if (text.includes('review') || text.includes('đánh giá') || text.includes('trải nghiệm') || text.includes('cảm nhận') || text.includes('thực tế')) {
        return 'product_editorial';
    }
    // 3. "So sánh sản phẩm" / Các loại / Top sản phẩm / Danh sách -> comparison_layout
    if (text.includes('so sánh') || text.includes('phân biệt') || text.includes('các loại') || text.includes('top ') || text.includes('danh sách') || text.includes('phan loai') || text.includes('phân loại')) {
        return 'comparison_layout';
    }
    // 4. "Cách chọn sản phẩm" / Tiêu chí / Kinh nghiệm -> selection_guide
    if (text.includes('cách chọn') || text.includes('tiêu chí') || text.includes('kinh nghiệm') || text.includes('lựa chọn') || text.includes('chọn mua') || text.includes('người mới')) {
        return 'selection_guide';
    }
    // 5. "Cách vệ sinh" / Làm sạch / Khử khuẩn / Rửa -> hygiene_cleaning
    if (text.includes('vệ sinh') || text.includes('rửa') || text.includes('làm sạch') || text.includes('khử khuẩn') || text.includes('bảo dưỡng') || text.includes('lau chùi')) {
        return 'hygiene_cleaning';
    }
    // 6. "Cách bảo quản" / Cất giữ / Nơi để / Tủ / Ngăn kéo -> storage_drawer
    if (text.includes('bảo quản') || text.includes('cất giữ') || text.includes('kín đáo') || text.includes('nơi để') || text.includes('tủ') || text.includes('ngăn kéo') || text.includes('túi đựng')) {
        return 'storage_drawer';
    }
    // 7. "Cách sử dụng" / Hướng dẫn dùng / Mở hộp / Các bước -> unboxing_packaging
    if (text.includes('hướng dẫn sử dụng') || text.includes('cách dùng') || text.includes('các bước') || text.includes('mở hộp') || text.includes('khoi dong') || text.includes('khởi động')) {
        return 'unboxing_packaging';
    }
    // 8. "Lợi ích của adult sexual wellness" / Ưu điểm / Cảm xúc -> lifestyle_ambient
    if (text.includes('ưu điểm') || text.includes('lợi ích') || text.includes('tác dụng') || text.includes('cảm xúc') || text.includes('lãng mạn') || text.includes('tinh thần') || text.includes('hạnh phúc')) {
        return 'lifestyle_ambient';
    }

    return 'product_editorial';
}

/**
 * Tạo SEO filename slug chuẩn
 */
export function generateSeoFilename(topic: string, sceneType: SceneType, index = 1): string {
    const cleanTopic = topic
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const sceneSuffix = {
        product_hero: 'chinh-hang',
        product_editorial: 'thiet-ke-cao-cap',
        comparison_layout: 'so-sanh-phan-loai',
        selection_guide: 'kinh-nghiem-lua-chon',
        hygiene_cleaning: 'huong-dan-ve-sinh',
        storage_drawer: 'bao-quan-kin-dao',
        lifestyle_ambient: 'khong-gian-rieng-tu',
        unboxing_packaging: 'hop-dong-goi-tinh-te'
    }[sceneType] || 'minh-hoa';

    return `${cleanTopic || 'adult-wellness'}-${sceneSuffix}-${index}`;
}

/**
 * Tạo Alt Text chuẩn ngữ cảnh tiếng Việt (Không spam từ khóa, miêu tả chân thực)
 */
export function generateVietnameseAltText(productInfo: { category: string; productName?: string }, sceneType: SceneType, sectionTitle?: string): string {
    const prod = productInfo.productName || 'sản phẩm chăm sóc sức khỏe tình dục';
    
    switch (sceneType) {
        case 'product_hero':
            return `Hình ảnh ${prod} với thiết kế cao cấp, hiện đại đặt trên bục trưng bày tối giản`;
        case 'product_editorial':
            return `Không gian phòng ngủ sang trọng trưng bày ${prod} tinh tế và kín đáo`;
        case 'comparison_layout':
            return `Bộ sưu tập các dòng ${prod} được sắp xếp so sánh chi tiết chất liệu và kiểu dáng`;
        case 'selection_guide':
            return `Hướng dẫn lựa chọn ${prod} phù hợp nhu cầu người dùng trưởng thành`;
        case 'hygiene_cleaning':
            return `Quy trình vệ sinh và làm sạch ${prod} bằng dung dịch chuyên dụng trên kệ phòng tắm sạch sẽ`;
        case 'storage_drawer':
            return `${prod} được cất giữ cẩn thận trong ngăn kéo tủ đầu giường và túi nhung bảo quản kín đáo`;
        case 'unboxing_packaging':
            return `Bao bì đóng gói kín đáo, thanh lịch của ${prod} cao cấp`;
        case 'lifestyle_ambient':
            return `Không gian thư giãn riêng tư với ánh sáng dịu nhẹ và ${prod} trên bàn cạnh giường`;
        default:
            return `${prod} chất lượng cao chuẩn quốc tế dành cho người trưởng thành`;
    }
}

/**
 * Xây dựng Scene Brief hoàn chỉnh từ Article & Section context
 */
export function buildSceneBrief(
    articleTitle: string,
    sectionTitle = '',
    paragraph = '',
    settings?: Partial<ImageGenerationSettings>
): SceneBrief {
    const combinedContext = `${articleTitle} ${sectionTitle} ${paragraph}`;
    const productInfo = detectProductCategory(combinedContext);
    const sceneType = settings?.contextMode && settings.contextMode !== 'auto'
        ? (settings.contextMode === 'storage' ? 'storage_drawer' : settings.contextMode === 'comparison' ? 'comparison_layout' : settings.contextMode === 'instructional' ? 'hygiene_cleaning' : 'product_editorial')
        : mapSectionToSceneType(sectionTitle, paragraph);

    const visualPurpose: VisualPurpose = settings?.visualPurpose || (sceneType === 'product_hero' ? 'article_hero' : 'section_illustration');
    const productPriority: ProductPriority = settings?.productPriority || 'high';

    const avoidList = [
        'doctor',
        'hospital',
        'medical clinic',
        'stethoscope',
        'medical examination',
        'spa facial treatment',
        'skincare facial mask',
        'body massage therapist',
        'explicit sexual intercourse',
        'explicit sexual activity',
        'full frontal nudity',
        'explicit genitals',
        'vulgar pornographic pose',
        'dirty messy surroundings'
    ];

    const altText = generateVietnameseAltText(productInfo, sceneType, sectionTitle);
    const filename = generateSeoFilename(articleTitle, sceneType);

    let composition = 'Centered product presentation with balanced negative space';
    let lighting = 'Soft warm diffused ambient light with subtle cinematic rim lighting';
    let environment = 'Private minimalist modern bedroom bedside table';

    if (sceneType === 'hygiene_cleaning') {
        composition = 'Product placed neatly next to gentle foaming cleanser bottle and fresh rolled microfiber towel';
        environment = 'Clean minimalist marble bathroom vanity with soft natural window illumination';
        lighting = 'Bright, clean natural morning light with crisp hygienic atmosphere';
    } else if (sceneType === 'storage_drawer') {
        composition = 'High-angle view into an open organized wooden nightstand drawer lined with dark velvet fabric';
        environment = 'Discreet luxury bedside drawer organizer';
        lighting = 'Warm bedside lamp illumination';
    } else if (sceneType === 'comparison_layout') {
        composition = 'Flatlay arrangement of 2-3 sleek wellness items arranged neatly in a row for comparison';
        environment = 'Neutral matte stone slab table top';
        lighting = 'Even overhead studio softbox light';
    } else if (sceneType === 'product_hero') {
        composition = 'Hero close-up product portrait on a geometric stone pedestal';
        environment = 'Minimalist editorial studio pedestal';
        lighting = 'Dramatic subtle edge lighting emphasizing smooth curves and matte textures';
    }

    return {
        mainTopic: 'adult sexual-wellness consumer product',
        sectionTitle,
        paragraphContext: paragraph.slice(0, 200),
        productCategory: productInfo.category,
        productName: productInfo.productName,
        productAttributes: productInfo.attributes,
        visualSubject: `${productInfo.category} (${productInfo.attributes.join(', ')})`,
        visualPurpose,
        sceneType,
        composition,
        lighting,
        style: settings?.imageStyle ? settings.imageStyle.replace('_', ' ') : 'commercial product photography editorial',
        audience: 'mature adults 18+',
        productPriority,
        safetyGuidance: 'Tasteful non-explicit consumer product lifestyle photography. Strictly product-focused or peaceful ambient lifestyle. No medical, no clinic, no facial spa, no sexual acts, no nudity.',
        avoid: avoidList,
        altTextSuggestion: altText,
        captionSuggestion: altText,
        seoFilenameSlug: filename,
    };
}

/**
 * Xây dựng Dynamic Image Prompt phong phú từ Scene Brief
 * Tuân thủ quy tắc: Sản phẩm chiếm 35-60% bố cục, Photorealistic Commercial Product Photography,
 * đúng section, đúng chủ đề adult sexual-wellness, tasteful, non-explicit, triệt tiêu medical/spa drift.
 */
export function buildDynamicImagePrompt(sceneBrief: SceneBrief, customStyle?: ImageStyle): string {
    const styleDescription = customStyle === 'minimalist_clean'
        ? 'Minimalist architectural commercial still life, clean lines, pristine balanced composition'
        : customStyle === 'editorial_luxury'
        ? 'High-end luxury commercial editorial photography, cinematic 35mm lens, warm intimate tones'
        : customStyle === 'studio_product'
        ? 'Professional e-commerce catalog packshot, crisp clean background, ultra-sharp detail, natural shadows'
        : 'Photorealistic premium commercial product photography, modern premium editorial aesthetic';

    const productFocus = `PRIMARY SUBJECT (takes 35-60% visual focus): An authentic, modern ${sceneBrief.productCategory} featuring ${sceneBrief.productAttributes?.join(', ') || 'curvilinear ergonomic silhouette and matte body-safe silicone texture'}. The product is the clear central hero element.`;

    const environmentPrompt = `SCENE & CONTEXT: ${sceneBrief.composition}. Environment: ${sceneBrief.sceneType === 'hygiene_cleaning' ? 'clean modern stone vanity with gentle antibacterial device cleansing foam and soft microfiber cloth' : sceneBrief.sceneType === 'storage_drawer' ? 'discreet wooden nightstand drawer with soft velvet protective pouch' : sceneBrief.sceneType === 'comparison_layout' ? 'clean flatlay surface comparing different sizes and ergonomic contours' : sceneBrief.sceneType === 'unboxing_packaging' ? 'premium elegant unboxing presentation on modern bedside table' : 'luxurious peaceful private master bedroom nightstand with warm ambient light'}.`;

    const aestheticPrompt = `AESTHETICS & QUALITY: ${styleDescription}. ${sceneBrief.lighting}. Soft natural lighting, realistic materials and reflections, clean composition, natural soft shadows, 8k resolution high detail.`;

    const safetyPrompt = `RESTRICTIONS & ANTI-DRIFT: Adult sexual-wellness consumer product photography only. Tasteful and non-explicit. STRICTLY NO doctors, NO hospital or medical clinic, NO stethoscopes, NO facial spa skincare treatments, NO therapist in scrubs, NO nudity, NO explicit anatomy, NO sexual acts or intercourse. If adult model is present, only tasteful ambient lifestyle background without sexual activity.`;

    return `${productFocus} ${environmentPrompt} ${aestheticPrompt} ${safetyPrompt}`.trim();
}

/**
 * Relevance Evaluation Layer
 * Kiểm tra chất lượng và độ bám sát chủ đề của prompt/kết quả ảnh
 */
export function evaluateRelevance(
    prompt: string,
    sceneBrief: SceneBrief,
    context = ''
): RelevanceEvaluation {
    const lowerPrompt = prompt.toLowerCase();
    const lowerContext = context.toLowerCase();

    let relevanceScore = 95;
    let productMatchScore = 90;
    let contextMatchScore = 90;
    let safetyScore = 100;
    const reasons: string[] = [];

    // Kiểm tra các từ cấm (medical / facial spa drift)
    const forbiddenDrifts = ['doctor', 'hospital', 'clinic', 'stethoscope', 'facial mask', 'skincare treatment', 'spa facial'];
    for (const drift of forbiddenDrifts) {
        if (lowerPrompt.includes(drift)) {
            relevanceScore -= 40;
            productMatchScore -= 40;
            reasons.push(`Prompt chứa yếu tố lệch chủ đề: "${drift}".`);
        }
    }

    // Kiểm tra sự hiện diện của sản phẩm
    if (sceneBrief.productCategory && !lowerPrompt.includes(sceneBrief.productCategory.toLowerCase().split(' ')[0])) {
        productMatchScore -= 15;
        reasons.push('Chưa làm nổi bật từ khóa danh mục sản phẩm cốt lõi.');
    }

    const isApproved = relevanceScore >= 80 && productMatchScore >= 75 && safetyScore >= 90;

    let refinedPrompt = prompt;
    if (!isApproved) {
        // Tự động tinh chỉnh về Product-Only Hero shot để loại bỏ hoàn toàn các yếu tố lệch
        refinedPrompt = `High-end commercial product photograph of a modern luxury ${sceneBrief.productCategory}. Centered on a sleek minimalist surface, warm soft ambient lighting, clean aesthetic composition, tasteful non-explicit presentation. No doctors, no hospital, no spa, no skincare treatment, no nudity, no sexual activity.`;
    }

    return {
        relevanceScore,
        productMatchScore,
        contextMatchScore,
        safetyScore,
        isApproved,
        reason: reasons.length > 0 ? reasons.join(' ') : 'Prompt đạt chuẩn chất lượng và bám sát nội dung sản phẩm.',
        refinedPrompt: isApproved ? undefined : refinedPrompt,
    };
}
