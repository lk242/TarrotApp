/**
 * 問卜者上下文 — 透過裝置與行為信號推測使用者當下狀態。
 *
 * 所有資料皆來自瀏覽器原生 API 或 app 內行為追蹤，
 * 不需額外權限，不碰相機、定位等敏感資料。
 */

/** 時段分類 */
export type TimeOfDay = 'late-night' | 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night';

/** 裝置類型 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** 行為信號原始資料（前端收集） */
export interface QuerentSignals {
  /** 占卜開始時的時間戳 */
  timestamp: number;
  /** 時段分類 */
  timeOfDay: TimeOfDay;
  /** 小時（0-23） */
  hour: number;
  /** 星期幾（0=日, 6=六） */
  dayOfWeek: number;
  /** 裝置類型 */
  deviceType: DeviceType;
  /** 使用者選擇的主題標籤 */
  topic: string;
  /** 是否使用自由提問（手動輸入而非預設 prompt） */
  isCustomQuestion: boolean;
  /** 問題文字長度 */
  questionLength: number;
  /** 輸入問題花費的秒數（從第一個字到按下開始） */
  typingDurationSec: number;
  /** 主題切換次數（猶豫指標） */
  topicSwitchCount: number;
  /** 電池電量（0-1, null 表示 API 不可用） */
  batteryLevel: number | null;
  /** 是否正在充電 */
  batteryCharging: boolean | null;
  /** 歷史占卜次數（0 = 全新用戶） */
  totalReadings: number;
  /** 最近一次占卜距今天數（null = 無紀錄） */
  daysSinceLastReading: number | null;
  /** 近 7 天占卜次數 */
  readingsInPast7Days: number;
  /** 近期是否重複占卜同主題 */
  repeatedTopic: boolean;
}

/** 推測出的狀態標籤（傳給 AI 的摘要） */
export interface QuerentContext {
  /** 原始信號（Cloud Function 可用來做進一步分析） */
  signals: QuerentSignals;
  /** 人類可讀的狀態描述，直接注入 AI prompt */
  summary: string;
}

// ─── 工具函式 ─────────────────────────────────────

export function classifyTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 0 && hour < 5) return 'late-night';
  if (hour >= 5 && hour < 7) return 'early-morning';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function classifyDevice(): DeviceType {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

const TIME_LABELS: Record<TimeOfDay, string> = {
  'late-night': '深夜（凌晨）',
  'early-morning': '清晨',
  'morning': '上午',
  'afternoon': '下午',
  'evening': '傍晚',
  'night': '夜晚',
};

const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

/**
 * 將原始信號轉換為人類可讀的問卜者狀態摘要。
 * 這段文字會直接注入 AI 的 system/user prompt。
 */
export function buildQuerentSummary(s: QuerentSignals): string {
  const lines: string[] = [];

  // 時段與環境
  const timeDesc = `${TIME_LABELS[s.timeOfDay]}${s.hour}:00`;
  const deviceDesc = s.deviceType === 'mobile' ? '手機' : s.deviceType === 'tablet' ? '平板' : '電腦';
  lines.push(`- 占卜時間：${DAY_LABELS[s.dayOfWeek]} ${timeDesc}，使用${deviceDesc}`);

  // 深夜特殊標記
  if (s.timeOfDay === 'late-night') {
    lines.push('- 深夜占卜，問卜者可能處於焦慮、失眠或情緒波動的狀態');
  }

  // 主題與提問方式
  if (s.topic) {
    lines.push(`- 選擇的占卜主題：${s.topic}`);
  }
  if (s.topicSwitchCount > 1) {
    lines.push(`- 選擇主題時猶豫切換了 ${s.topicSwitchCount} 次，可能對真正的困擾感到矛盾`);
  }
  if (s.isCustomQuestion) {
    lines.push('- 自行輸入問題（非預設主題），對困擾有明確想法');
  }

  // 提問節奏
  if (s.questionLength > 0 && s.typingDurationSec > 0) {
    const charsPerSec = s.questionLength / s.typingDurationSec;
    if (s.typingDurationSec > 30 && charsPerSec < 1) {
      lines.push('- 花了較長時間斟酌問題，可能難以表達內心真正的困擾');
    } else if (s.typingDurationSec < 5 && s.questionLength > 10) {
      lines.push('- 快速輸入問題，心中的困擾可能已醞釀許久');
    }
  }
  if (s.questionLength < 10 && s.questionLength > 0) {
    lines.push('- 問題非常簡短，可能不確定如何表達，或情緒過於強烈難以細述');
  } else if (s.questionLength > 50) {
    lines.push('- 問題描述詳細，已深入思考過這個困擾');
  }

  // 使用頻率
  if (s.totalReadings === 0) {
    lines.push('- 全新使用者，第一次占卜（可能出於好奇，或遇到需要指引的重要時刻）');
  } else {
    if (s.readingsInPast7Days >= 3) {
      lines.push(`- 近 7 天已占卜 ${s.readingsInPast7Days} 次，頻繁使用，可能正經歷持續困擾`);
    }
    if (s.repeatedTopic) {
      lines.push('- 近期重複占卜相同主題，對此事的焦慮程度較高');
    }
    if (s.daysSinceLastReading !== null && s.daysSinceLastReading > 30) {
      lines.push('- 上次占卜超過一個月前，這次回來可能遇到新的重要問題');
    }
  }

  // 電量
  if (s.batteryLevel !== null && s.batteryLevel < 0.15 && !s.batteryCharging) {
    lines.push('- 裝置電量極低仍在占卜，顯示問卜者非常在意這個問題');
  }

  return lines.join('\n');
}
