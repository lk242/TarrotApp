import {
  signInWithPopup,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions, googleProvider } from './config';

interface LineSignInRequest {
  idToken?: string;
  accessToken?: string;
}

const signInWithLineCallable = httpsCallable<LineSignInRequest, { customToken: string }>(
  functions,
  'signInWithLine',
);

/**
 * Firebase Auth service。
 *
 * Controller/useAuth 會呼叫這些函式；View 不直接碰 Firebase SDK。
 * Google 登入目前採 popup，若未來遇到瀏覽器阻擋，可在這裡改成 redirect。
 */

/** Google 登入 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** LINE 登入 — 支援 ID token 或 access token */
export async function signInWithLine(tokenInfo: { type: 'id_token' | 'access_token'; token: string }): Promise<User> {
  const payload: LineSignInRequest =
    tokenInfo.type === 'id_token'
      ? { idToken: tokenInfo.token }
      : { accessToken: tokenInfo.token };
  const result = await signInWithLineCallable(payload);
  const credential = await signInWithCustomToken(auth, result.data.customToken);
  return credential.user;
}

/** Email 註冊 */
export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/** Email 登入 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/** 登出 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** 監聽登入狀態 */
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
