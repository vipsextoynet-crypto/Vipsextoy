import fs from 'fs';
import path from 'path';

// ==================== CẤU HÌNH HỆ THỐNG ====================
const OLLAMA_HOST = 'http://localhost:11434';
const MODEL_NAME = 'qwen2.5:1.5b';
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

// Danh sách các trang Next.js cần tự động tối ưu SEO
const PAGES_TO_OPTIMIZE = [
  { 
    name: 'Shop Page', 
    path: 'src/app/shop/page.tsx', 
    context: 'Trang cửa hàng bán sản phẩm trực tuyến, hiển thị danh mục và sản phẩm nổi bật' 
  },
];

// Hàm kiểm tra xem model đã sẵn sàng trên Ollama chưa
async function checkOllamaReady() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    return (data.models || []).some(m => m.name.includes(MODEL_NAME));
  } catch (e) {
    return false;
  }
}

// Hàm gọi Ollama qua endpoint /api/generate chuẩn xác
async function generateWithOllama(prompt, retries = MAX_RETRIES, delay = INITIAL_RETRY_DELAY) {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.warn(`[Cảnh báo] Kết nối Ollama thất bại: ${error.message}`);
    if (retries > 0) {
      console.log(`Đang thử lại sau ${delay / 1000} giây... (Còn ${retries} lần thử)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return generateWithOllama(prompt, retries - 1, delay * 2);
    } else {
      throw error;
    }
  }
}

// Hàm tự động cập nhật thẻ meta description vào file page.tsx
function updatePageFileMetadata(filePath, newDescription) {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[Lỗi] Không tìm thấy file tại đường dẫn: ${resolvedPath}`);
    return false;
  }

  let content = fs.readFileSync(resolvedPath, 'utf8');
  const cleanDesc = newDescription.trim().replace(/^["']|["']$/g, '').replace(/\n/g, ' ');

  const metadataRegex = /(export\s+const\s+metadata\s*[:=][^}]*description\s*:\s*)(['"`])(.*?)\2/s;

  if (metadataRegex.test(content)) {
    content = content.replace(metadataRegex, (match, prefix, quote, oldDesc) => {
      return `${prefix}${quote}${cleanDesc}${quote}`;
    });
    console.log(`-> [Thành công] Đã cập nhật thẻ description trong ${filePath}`);
  } else {
    const metaSnippet = `\n\nexport const metadata = {\n  description: "${cleanDesc}",\n};\n`;
    content += metaSnippet;
    console.log(`-> [Thành công] Đã tự động bổ sung khối export metadata vào ${filePath}`);
  }

  fs.writeFileSync(resolvedPath, content, 'utf8');
  return true;
}

// Tiến trình thực thi chính
async function runSeoAutomation() {
  console.log('==================================================');
  console.log(`BẮT ĐẦU QUÁ TRÌNH TỰ ĐỘNG TỐI ƯU SEO QUA OLLAMA`);
  console.log(`Đích kết nối: ${OLLAMA_HOST} | Model: ${MODEL_NAME}`);
  console.log('==================================================\n');

  const isReady = await checkOllamaReady();
  if (!isReady) {
    console.log(`[Lưu ý] Model "${MODEL_NAME}" chưa được tải trên Ollama server. Hãy đảm bảo bạn đã chạy lệnh: ollama pull ${MODEL_NAME}`);
  }

  for (const page of PAGES_TO_OPTIMIZE) {
    console.log(`--------------------------------------------------`);
    console.log(`Đang xử lý trang: ${page.name} (${page.path})`);

    const prompt = `Viết một đoạn meta description chuẩn SEO bằng tiếng Việt cho trang web với ngữ cảnh: "${page.context}". Yêu cầu bắt buộc: Dưới 155 ký tự, hấp dẫn người dùng, CHỈ TRẢ VỀ ĐÚNG MỘT CÂU MÔ TẢ DUY NHẤT, không giải thích, không bọc dấu ngoặc kép.`;

    try {
      console.log('Đang gửi yêu cầu sinh nội dung tới Ollama...');
      const seoDescription = await generateWithOllama(prompt);
      
      console.log(`Mô tả SEO nhận được từ AI: "${seoDescription.trim()}"`);
      updatePageFileMetadata(page.path, seoDescription);
    } catch (error) {
      console.error(`-> [Thất bại] Không thể hoàn tất tối ưu cho ${page.name}.`);
    }
  }

  console.log('\n==================================================');
  console.log('HOÀN TẤT TIẾN TRÌNH TỐI ƯU SEO!');
  console.log('==================================================');
}

runSeoAutomation();