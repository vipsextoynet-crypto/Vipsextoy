// Vercel khong cho ghi file vinh vien (filesystem chi ton tai trong 1 lan
// goi ham, mat het sau khi deploy/khoi dong lai). Vi products.ts la nguon
// du lieu chinh cua site (dung luc build de tao trang tinh), cach de commit
// truc tiep len GitHub: sua file qua GitHub Contents API -> GitHub bao cho
// Vercel -> Vercel tu build lai va len bang du lieu moi (khoang 1-2 phut).
//
// Can 3 bien moi truong (dat trong Vercel -> Settings -> Environment Variables):
//   GITHUB_TOKEN   = Personal Access Token co quyen "repo" (Settings > Developer
//                    settings > Fine-grained tokens, chon dung repo, quyen
//                    "Contents: Read and write")
//   GITHUB_REPO    = "ten-tai-khoan/ten-repo", vi du "vipextoy/vipextoy"
//   GITHUB_BRANCH  = "main" (hoac nhanh dang deploy len Vercel)

const API_BASE = "https://api.github.com";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name}`);
  return v;
}

export async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const repo = envOrThrow("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = envOrThrow("GITHUB_TOKEN");

  const res = await fetch(
    `${API_BASE}/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Không đọc được file từ GitHub (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

export async function commitFile(
  path: string,
  newContent: string,
  sha: string,
  message: string
): Promise<void> {
  const repo = envOrThrow("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = envOrThrow("GITHUB_TOKEN");

  const res = await fetch(`${API_BASE}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha,
      branch,
    }),
  });

  if (!res.ok) {
    throw new Error(`Không commit được lên GitHub (${res.status}): ${await res.text()}`);
  }
}
