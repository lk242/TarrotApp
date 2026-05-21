import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';

interface Section {
  icon: string;
  title: string;
  html: string;
}

/** 段落標題對應的裝飾圖示 */
const SECTION_ICONS: Record<string, string> = {
  '牌陣總覽': '🃏',
  '逐牌解析': '🔍',
  '整體綜合解讀': '🔮',
  '具體建議': '💡',
  '需要留意的面向': '⚠️',
  '箴言': '✨',
};

/** 根據標題文字匹配最合適的圖示 */
function matchIcon(title: string): string {
  for (const [keyword, icon] of Object.entries(SECTION_ICONS)) {
    if (title.includes(keyword)) return icon;
  }
  // 逐牌解析內的子牌（### 開頭）
  if (title.includes('【') || title.includes('牌') || title.includes('位')) return '🎴';
  return '✦';
}

/**
 * 將整段 AI 解讀 Markdown 拆分成多個段落。
 * 以 `## ` 為分界點，每個段落獨立渲染。
 */
function splitInterpretation(markdown: string): Section[] {
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join('\n').trim();
    if (content) {
      sections.push({
        icon: matchIcon(currentTitle),
        title: currentTitle,
        html: marked.parse(currentTitle ? `## ${currentTitle}\n${content}` : content, { async: false }) as string,
      });
    }
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      flush();
      // 移除標題中的 emoji
      currentTitle = h2Match[1].replace(/[\u{1F000}-\u{1FFFF}]|[☀-➿]|[\u{FE00}-\u{FEFF}]/gu, '').trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

interface Props {
  markdown: string;
  /** 是否使用逐段展開動畫（首次解讀用），否則全部直接顯示（歷史紀錄用） */
  animated?: boolean;
}

export default function InterpretationSections({ markdown, animated = true }: Props) {
  const sections = useMemo(() => splitInterpretation(markdown), [markdown]);
  const [animatedVisibleCount, setAnimatedVisibleCount] = useState(0);
  const visibleCount = animated ? animatedVisibleCount : sections.length;

  useEffect(() => {
    if (!animated) return;

    // 逐段展開：先重置，再讓後續段落依序顯示。
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setAnimatedVisibleCount(0), 0));
    sections.forEach((_, i) => {
      timers.push(setTimeout(() => setAnimatedVisibleCount(i + 1), i * 600 + 1));
    });
    return () => timers.forEach(clearTimeout);
  }, [sections, animated]);

  if (sections.length === 0) {
    return (
      <div
        className="interpretation-panel rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)]"
      >
        <div
          className="max-w-none text-[var(--color-text-primary)] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: marked.parse(markdown, { async: false }) as string }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {sections.slice(0, visibleCount).map((section, i) => (
          <motion.div
            key={`${section.title}-${i}`}
            initial={animated ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="interpretation-panel rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-8 shadow-[var(--shadow-card)]"
          >
            <div
              className="max-w-none text-[var(--color-text-primary)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: section.html }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 展開中提示 */}
      {animated && visibleCount < sections.length && (
        <motion.div
          className="flex items-center justify-center gap-2 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-gold)]"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.25 }}
            />
          ))}
          <span className="ml-2 text-xs text-[var(--color-text-muted)]">解讀展開中...</span>
        </motion.div>
      )}
    </div>
  );
}
