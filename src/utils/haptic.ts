/** 震動回饋工具（僅在支援 vibration API 的手機上啟用） */

const canVibrate = () =>
  typeof window !== 'undefined' && 'vibrate' in navigator;

/** 輕觸 — 選牌、點擊按鈕 */
export function hapticLight() {
  if (canVibrate()) navigator.vibrate(30);
}

/** 中震 — 確認選牌、翻牌揭示 */
export function hapticMedium() {
  if (canVibrate()) navigator.vibrate(60);
}

/** 重震 — 完成抽牌、解讀完成 */
export function hapticHeavy() {
  if (canVibrate()) navigator.vibrate([60, 30, 80]);
}
