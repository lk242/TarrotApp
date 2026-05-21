const liffId = import.meta.env.VITE_LINE_LIFF_ID as string | undefined;
type LiffClient = typeof import('@line/liff').default;
let liffClient: LiffClient | null = null;
let initPromise: Promise<void> | null = null;

export function isLineLoginConfigured(): boolean {
  return Boolean(liffId);
}

async function initializeLiff(): Promise<LiffClient> {
  if (!liffId) {
    throw new Error('尚未設定 VITE_LINE_LIFF_ID');
  }

  if (!liffClient) {
    liffClient = (await import('@line/liff')).default;
  }

  if (!initPromise) {
    initPromise = liffClient.init({ liffId }).catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  return liffClient;
}

/**
 * 解碼 JWT payload（不驗簽），純粹用來檢查 exp 是否過期。
 */
function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // 預留 60 秒緩衝，避免網路延遲造成後端驗證時剛好過期
    return typeof payload.exp === 'number' && payload.exp < Date.now() / 1000 + 60;
  } catch {
    return true;
  }
}

function forceReLogin(client: LiffClient): null {
  client.logout();
  client.login({ redirectUri: window.location.href });
  return null;
}

/**
 * 取得 LINE 登入憑證。
 * 優先使用 ID token；若已過期則改用 access token（有效期較長）。
 * 回傳格式為 { type, token }，後端據此選擇驗證方式。
 */
export async function getLineToken(): Promise<{ type: 'id_token' | 'access_token'; token: string } | null> {
  const client = await initializeLiff();

  if (!client.isLoggedIn()) {
    client.login({ redirectUri: window.location.href });
    return null;
  }

  // 優先用 ID token
  const idToken = client.getIDToken();
  if (idToken && !isJwtExpired(idToken)) {
    return { type: 'id_token', token: idToken };
  }

  // ID token 過期時改用 access token（LIFF access token 有效期較長）
  const accessToken = client.getAccessToken();
  if (accessToken) {
    return { type: 'access_token', token: accessToken };
  }

  // 都沒有，強制重新登入
  return forceReLogin(client);
}

/**
 * 透過 LIFF shareTargetPicker 分享 Flex Message 到 LINE 聊天。
 * 僅在 LINE 內建瀏覽器或已登入 LIFF 時可用。
 * 回傳 true 表示成功開啟分享介面，false 表示不可用。
 */
export async function shareToLine(params: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}): Promise<boolean> {
  if (!liffId) return false;

  try {
    const client = await initializeLiff();

    if (!client.isApiAvailable('shareTargetPicker')) {
      return false;
    }

    await client.shareTargetPicker([
      {
        type: 'flex',
        altText: `${params.title} — 神秘塔羅`,
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: '✦ 神秘塔羅 ✦',
                color: '#C9A84C',
                size: 'sm',
                align: 'center',
                weight: 'bold',
              },
            ],
            backgroundColor: '#0A0A14',
            paddingAll: '12px',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: params.title,
                weight: 'bold',
                size: 'lg',
                color: '#E8D48B',
                wrap: true,
              },
              {
                type: 'text',
                text: params.description,
                size: 'sm',
                color: '#B0A8C0',
                wrap: true,
                margin: 'md',
              },
            ],
            backgroundColor: '#12121E',
            paddingAll: '16px',
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '來占卜看看',
                  uri: params.url,
                },
                style: 'primary',
                color: '#7B5EA7',
              },
            ],
            backgroundColor: '#12121E',
            paddingAll: '12px',
          },
        },
      } as never, // LIFF SDK 型別不完整，用 never 繞過
    ]);

    return true;
  } catch {
    return false;
  }
}

export async function tryAutoLineLogin(): Promise<{ type: 'id_token' | 'access_token'; token: string } | null> {
  if (!liffId) return null;

  try {
    const client = await initializeLiff();
    if (!client.isLoggedIn()) return null;

    const idToken = client.getIDToken();
    if (idToken && !isJwtExpired(idToken)) {
      return { type: 'id_token', token: idToken };
    }

    const accessToken = client.getAccessToken();
    if (accessToken) {
      return { type: 'access_token', token: accessToken };
    }

    return null;
  } catch {
    return null;
  }
}
