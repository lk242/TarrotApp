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
