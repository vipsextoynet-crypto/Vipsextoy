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
export const DRAFT_TAG = "[draft]";

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

  // GitHub Contents API CHI tra ve noi dung file neu file <= 1 MB. File lon
  // hon (products.ts hien ~1.6 MB) se co content rong + encoding "none",
  // luc do phai doc qua Git Blobs API (ho tro toi 100 MB) bang sha cua file.
  let base64: string = data.content ?? "";
  if (!base64 || data.encoding === "none") {
    const blobRes = await fetch(`${API_BASE}/repos/${repo}/git/blobs/${data.sha}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (!blobRes.ok) {
      throw new Error(`Không đọc được file lớn từ GitHub (${blobRes.status}): ${await blobRes.text()}`);
    }

    const blob = await blobRes.json();
    base64 = blob.content ?? "";
  }

  if (!base64) {
    throw new Error(`GitHub trả về nội dung rỗng cho file ${path}.`);
  }

  const content = Buffer.from(base64, "base64").toString("utf-8");
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
      // "[draft]" = ban nhap: Vercel (Ignored Build Step) se KHONG build lai.
      // Khi bam nut "Cap nhat len web" trong admin moi build 1 lan cho tat ca.
      message: message.startsWith(DRAFT_TAG) ? message : `${DRAFT_TAG} ${message}`,
      content: Buffer.from(newContent, "utf-8").toString("base64"),
      sha,
      branch,
    }),
  });

  if (!res.ok) {
    throw new Error(`Không commit được lên GitHub (${res.status}): ${await res.text()}`);
  }
}

// ---------------------------------------------------------------------------
// DANG BAI HANG LOAT: cac lan luu tu trang admin deu la commit "[draft]" (Vercel
// bo qua, khong build). Ham nay tao 1 commit RONG voi noi dung thuong (khong co
// "[draft]") -> Vercel build dung 1 lan va lay tat ca thay doi da luu truoc do.
// ---------------------------------------------------------------------------
function ghHeaders(token: string, json = false): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function publishSite(): Promise<{ sha: string }> {
  const repo = envOrThrow("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = envOrThrow("GITHUB_TOKEN");

  // 1) commit dau nhanh hien tai
  const refRes = await fetch(`${API_BASE}/repos/${repo}/git/ref/heads/${branch}`, {
    headers: ghHeaders(token),
    cache: "no-store",
  });
  if (!refRes.ok) {
    throw new Error(`Không đọc được nhánh ${branch} (${refRes.status}): ${await refRes.text()}`);
  }
  const headSha: string = (await refRes.json()).object.sha;

  // 2) lay tree cua commit do
  const commitRes = await fetch(`${API_BASE}/repos/${repo}/git/commits/${headSha}`, {
    headers: ghHeaders(token),
    cache: "no-store",
  });
  if (!commitRes.ok) {
    throw new Error(`Không đọc được commit (${commitRes.status}): ${await commitRes.text()}`);
  }
  const treeSha: string = (await commitRes.json()).tree.sha;

  // 3) tao commit rong (cung tree, cha = commit dau nhanh)
  const newRes = await fetch(`${API_BASE}/repos/${repo}/git/commits`, {
    method: "POST",
    headers: ghHeaders(token, true),
    body: JSON.stringify({
      message: "publish: cap nhat noi dung len web tu trang admin",
      tree: treeSha,
      parents: [headSha],
    }),
  });
  if (!newRes.ok) {
    throw new Error(`Không tạo được commit (${newRes.status}): ${await newRes.text()}`);
  }
  const newSha: string = (await newRes.json()).sha;

  // 4) dua nhanh len commit moi -> GitHub bao Vercel build
  const moveRes = await fetch(`${API_BASE}/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: ghHeaders(token, true),
    body: JSON.stringify({ sha: newSha }),
  });
  if (!moveRes.ok) {
    throw new Error(`Không cập nhật được nhánh ${branch} (${moveRes.status}): ${await moveRes.text()}`);
  }

  return { sha: newSha };
}

// So thay doi "[draft]" chua dang (dem cac commit moi nhat cho toi khi gap commit thuong).
export async function countPendingDrafts(): Promise<number> {
  const repo = envOrThrow("GITHUB_REPO");
  const branch = process.env.GITHUB_BRANCH || "main";
  const token = envOrThrow("GITHUB_TOKEN");

  const res = await fetch(
    `${API_BASE}/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100`,
    { headers: ghHeaders(token), cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error(`Không đọc được lịch sử commit (${res.status}): ${await res.text()}`);
  }
  const list: { commit: { message: string } }[] = await res.json();
  let n = 0;
  for (const c of list) {
    if (c.commit.message.startsWith(DRAFT_TAG)) n++;
    else break;
  }
  return n;
}
