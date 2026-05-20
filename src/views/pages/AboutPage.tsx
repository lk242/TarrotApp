import { motion } from 'framer-motion';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay },
});

const FEATURES = [
  {
    sigil: '⚶',
    title: '完整 78 張韋特塔羅',
    desc: '涵蓋 22 張大阿爾克那與 56 張小阿爾克那，每張牌皆為經典萊德偉特手繪圖像。',
  },
  {
    sigil: '⊛',
    title: 'AI 智慧解讀',
    desc: '結合先進語言模型，根據你的問題、牌陣位置和正逆位，提供深度個人化的解讀分析。',
  },
  {
    sigil: '✧',
    title: '沉浸式互動體驗',
    desc: '精心設計的洗牌、切牌、扇形攤牌動畫，配合金色粒子特效，打造如臨現場的占卜儀式感。',
  },
  {
    sigil: '◈',
    title: '追問對話系統',
    desc: '占卜結果不再是一次性的。透過 AI 引導式追問，深入探索每個面向，獲得更完整的指引。',
  },
  {
    sigil: '☽',
    title: '占卜紀錄雲端同步',
    desc: '登入會員後，你的每一次占卜都安全儲存在雲端，隨時回顧過往的智慧指引。',
  },
  {
    sigil: '⚹',
    title: '三種經典牌陣',
    desc: '單牌占卜快速指引、三牌占卜探索過去現在未來、凱爾特十字牌陣進行全面深度解析。',
  },
];

const SPREADS_INFO = [
  {
    name: '單牌占卜',
    cards: '1 張牌',
    time: '約 1 分鐘',
    desc: '適合日常快速指引，用一張牌切入問題的核心。',
    image: '/images/theme/spread-single.webp',
  },
  {
    name: '三牌占卜',
    cards: '3 張牌',
    time: '約 3 分鐘',
    desc: '探索過去、現在、未來的完整脈絡，理解事件的發展軌跡。',
    image: '/images/theme/spread-three.webp',
  },
  {
    name: '凱爾特十字',
    cards: '10 張牌',
    time: '約 8 分鐘',
    desc: '最經典的全面解析牌陣，涵蓋現況、挑戰、潛意識到最終結果。',
    image: '/images/theme/spread-celtic.webp',
  },
];

const TAROT_TIPS = [
  '占卜前先靜心，在心中默念你的問題，讓能量聚焦。',
  '問題越具體，牌面的回應越精準。避免「會不會」類型的問題。',
  '逆位不代表壞事，它代表能量的轉變或需要重新審視的面向。',
  '塔羅是自我探索的工具，最終的選擇權永遠在你手中。',
];

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      {/* ===== Hero ===== */}
      <motion.div {...fadeUp()} className="mb-16 max-w-2xl text-center">
        <img src="/images/theme/logo.webp" alt="" className="mx-auto mb-4 h-14 w-14 animate-candle" />
        <h1 className="mb-4 text-3xl font-bold tracking-[0.15em] text-[var(--color-accent-gold)] md:text-4xl" style={{ fontVariant: 'small-caps' }}>
          關於神秘塔羅
        </h1>
        <img src="/images/theme/divider.webp" alt="" className="mx-auto my-3 h-5 w-auto opacity-60" />
        <p className="mt-6 text-base leading-relaxed text-[var(--color-text-secondary)]">
          神秘塔羅融合了流傳數百年的塔羅牌智慧與尖端 AI 技術，
          為每一位探索者打造專屬的占卜體驗。
          無論你是塔羅新手還是資深愛好者，都能在這裡找到啟發與方向。
        </p>
      </motion.div>

      {/* ===== 特色功能 ===== */}
      <motion.div {...fadeUp(0.15)} className="mb-16 w-full max-w-4xl">
        <h2 className="section-title mb-8 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          核心特色
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp(0.2 + i * 0.08)}
              className="ornate-card rounded-xl p-6 transition-all hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="mb-3 text-2xl text-[var(--color-accent-gold)] opacity-70">{f.sigil}</div>
              <h3 className="mb-2 text-sm font-bold tracking-wider text-[var(--color-accent-gold-light)]">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ===== 牌陣介紹 ===== */}
      <motion.div {...fadeUp(0.3)} className="mb-16 w-full max-w-3xl">
        <h2 className="section-title mb-8 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          牌陣介紹
        </h2>
        <div className="space-y-4">
          {SPREADS_INFO.map((s) => (
            <div
              key={s.name}
              className="ornate-card flex items-start gap-5 rounded-xl p-5 transition-all hover:shadow-[var(--shadow-card-hover)]"
            >
              <div
                className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--color-border-ornate)]"
              >
                <img src={s.image} alt={s.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">{s.name}</h3>
                  <span className="rounded-full border border-[var(--color-accent-purple)]/20 bg-[var(--color-accent-purple)]/10 px-2.5 py-0.5 text-[11px] text-[var(--color-accent-purple-light)]">
                    {s.cards}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">{s.time}</span>
                </div>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== 塔羅小知識 ===== */}
      <motion.div {...fadeUp(0.4)} className="mb-16 w-full max-w-2xl">
        <h2 className="section-title mb-8 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          占卜小提示
        </h2>
        <div className="space-y-3">
          {TAROT_TIPS.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4"
            >
              <span className="mt-0.5 text-sm text-[var(--color-accent-gold)] opacity-50">◆</span>
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{tip}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== 關於韋特塔羅 ===== */}
      <motion.div {...fadeUp(0.5)} className="mb-16 w-full max-w-2xl">
        <h2 className="section-title mb-6 text-center text-xl font-bold tracking-wider text-[var(--color-accent-gold)]">
          韋特塔羅的歷史
        </h2>
        <div className="ornate-card rounded-xl p-6 md:p-8">
          <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            萊德偉特（Rider-Waite）塔羅牌誕生於 1909 年，由神秘學者亞瑟·愛德華·韋特（Arthur Edward Waite）
            設計，帕梅拉·科爾曼·史密斯（Pamela Colman Smith）繪製。這副牌最大的革新在於為所有 78 張牌
            都加入了豐富的圖像場景，讓每張牌都成為一個可以直覺解讀的故事。
          </p>
          <p className="mb-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            大阿爾克那的 22 張牌代表人生重大的靈性課題與轉折點——從愚者（The Fool）踏上未知旅程，
            到世界（The World）達成圓滿，構成完整的「愚者之旅」。
          </p>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            小阿爾克那的 56 張牌分為權杖（火元素）、聖杯（水元素）、寶劍（風元素）、
            錢幣（土元素）四組花色，反映日常生活中的行動、情感、思維與物質面向。
          </p>
        </div>
      </motion.div>

      {/* ===== 免責聲明 ===== */}
      <motion.div {...fadeUp(0.6)} className="w-full max-w-xl text-center">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6">
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            ⚠ 免責聲明：塔羅牌是一種自我探索與反思的工具，並非科學預測方法。
            本站提供的 AI 解讀僅供參考，不應作為醫療、法律、財務等專業決策的依據。
            面對重要人生決定，請諮詢相關專業人士。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
