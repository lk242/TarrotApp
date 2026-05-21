const zhTW = {
  // 通用
  appName: '神秘塔羅',
  loading: '載入中...',
  retry: '重新嘗試',
  cancel: '取消',
  confirm: '確認',
  back: '返回',

  // 導覽
  nav: {
    home: '首頁',
    history: '紀錄',
    billing: '點數',
    about: '關於',
    admin: '管理',
    login: '登入',
    logout: '登出',
  },

  // 首頁
  home: {
    title: '選擇你的牌陣',
    subtitle: '讓古老的塔羅智慧，為你揭示命運的指引',
    beginner: '新手推薦',
    deepAnalysis: '深度解析',
  },

  // 占卜頁
  reading: {
    topicPrompt: '選擇一個占卜主題，或自行輸入問題',
    inputPlaceholder: '或在此輸入你想問的問題...',
    startButton: '消耗 {cost} 點開始洗牌',
    interpreting: '正在產生塔羅解讀',
    interpretingFollowUp: '正在解析追問',
    waitHint: '請稍候，結果完成後會自動顯示。',
    oracleReading: '神諭解讀',
    oracleInterpreting: '神諭正在解讀牌義...',
    followUpSection: '追問延伸',
    followUpGuideCard: '追問指引牌',
    suggestedHint: '想更深入了解嗎？試試這些方向',
    followUpPlaceholder: '針對這次占卜結果追問...',
    followUpButton: '追問',
    followUpLoading: '占卜師正在深入解讀...',
    readAgain: '再占一次',
    share: '分享結果',
    screenshotShare: '截圖分享',
    capturing: '截圖中...',
    viewHistory: '查看占卜紀錄 →',
    yourQuestion: '你的問題',
    upright: '正位',
    reversed: '逆位',
    // 洗牌動畫
    shuffleEntering: '牌陣正在聚集能量...',
    shuffleSplitting: '將牌分為陰陽兩半...',
    shuffleRiffling: '命運的絲線交織重組...',
    shuffleGathering: '命運之序已重新編排',
    shuffleWithdrawing: '牌充滿了你的能量',
    // 切牌動畫
    cutInProgress: '切牌中，分割命運的交叉點...',
    cutComplete: '切牌完成，命運已定...',
    // 抽牌動畫
    drawDesktopHint: '用直覺從牌陣中選取 {count} 張牌',
    drawDesktopProgress: '已選 {current} / {total}',
    drawMobileHint: '向上滑動抽取 {count} 張牌',
    drawMobileProgress: '已抽 {current} / {total}',
    revealingCards: '揭示命運之牌...',
    revealComplete: '✦ 所有牌已翻開，靜候神諭...',
    // 追問指引
    followUpGuidePosition: '追問指引',
  },

  // 登入
  auth: {
    loginTitle: '歡迎回來',
    registerTitle: '加入神秘塔羅',
    loginSubtitle: '登入以同步你的占卜紀錄',
    registerSubtitle: '創建帳號開始你的占卜之旅',
    lineQuickLogin: '使用 LINE 快速登入',
    lineLogin: '使用 LINE 登入',
    googleLogin: '使用 Google 登入',
    separator: '或',
    emailPlaceholder: '電子信箱',
    passwordPlaceholder: '密碼（至少 6 碼）',
    submitting: '處理中...',
    loginButton: '登入',
    registerButton: '註冊',
    noAccount: '還沒有帳號？',
    hasAccount: '已經有帳號？',
    registerNow: '立即註冊',
    backToLogin: '返回登入',
    lineNotConfigured: 'LINE 登入尚未設定，請先填入 LIFF ID。',
    googleBlocked: 'LINE 內建瀏覽器無法使用 Google 登入。請用右上角選單選擇「以瀏覽器開啟」，或先複製網址到 Chrome / Safari。',
    copyUrl: '複製目前網址',
    urlCopied: '網址已複製，請貼到 Chrome 或 Safari 後再使用 Google 登入。',
  },

  // 推播提醒
  notification: {
    title: '開啟占卜提醒',
    description: '接收每日占卜提醒和專屬運勢通知，不錯過命運的訊息。',
    requesting: '請求中...',
    enable: '開啟通知',
    later: '稍後再說',
  },

  // 頁尾
  footer: {
    tagline: '以古老智慧照亮前方道路',
  },

  // 主題
  topics: {
    love: '愛情',
    career: '事業',
    wealth: '財運',
    fortune: '整體運勢',
    spirit: '身心靈',
    social: '人際關係',
    study: '學業',
    free: '自由提問',
  },

  // 主題預設問題（顯示在 textarea，也作為 AI prompt）
  topicPrompts: {
    love: '我想了解我的愛情運勢，目前的感情狀況會如何發展？',
    career: '我想了解我的事業發展，目前的工作方向是否正確？',
    wealth: '我想了解近期的財務運勢，理財上需要注意什麼？',
    fortune: '請給我一個整體的生活指引，近期需要注意什麼？',
    spirit: '我想了解自己內在的狀態，身心靈方面有什麼需要調整的？',
    social: '我想了解人際關係方面的運勢，如何改善與他人的互動？',
    study: '我想了解學業方面的運勢，目前的學習方向是否正確？',
    free: '',
  },

  // 點數
  credits: {
    currentPoints: '目前 {points} 點',
    loadingPoints: '讀取點數中...',
    costPerReading: '每次占卜或追問消耗 {cost} 點',
    loginHint: '登入後可取得 100 點',
    notEnough: '點數不足，請先購買點數或訂閱方案。',
    loginRequired: '請先登入，註冊或 Google 登入會贈送 100 點。',
    viewPlans: '查看點數方案',
  },

  // 分享
  share: {
    copied: '已複製分享連結',
    sharedToLine: '已分享到 LINE',
    screenshotSaved: '截圖已儲存',
    screenshotFailed: '截圖失敗，請重試',
    generating: '正在產生截圖...',
  },

  // 歷史
  history: {
    title: '占卜紀錄',
    empty: '尚無占卜紀錄，去進行一次占卜吧！',
    emptyAction: '開始占卜',
    loadingReadings: '正在讀取占卜紀錄',
    followUpCount: '+{count} 追問',
    followUpRecord: '追問紀錄',
    followUpGuideCard: '追問指引牌',
    followUpCost: '針對這輪占卜繼續追問，每次消耗 {cost} 點',
    followUpLoading: '正在解析這輪追問',
    followUpPlaceholder: '針對這次紀錄追問...',
    followUpButton: '追問',
    deleteRecord: '刪除紀錄',
    trendTitle: '占卜趨勢',
    totalReadings: '累計占卜',
    last7Days: '近 7 天',
    topTopic: '最常問的主題',
    topCard: '最常出現的牌',
  },

  // 點數購買頁
  billing: {
    title: '點數與訂閱',
    subtitle: '註冊或 Google 登入會自動贈送 100 點；每次全新占卜或追問都消耗 {cost} 點。',
    welcome: '{name}，歡迎回來',
    welcomeHint: '願星辰指引你的每一次占卜',
    availablePoints: '目前可用點數',
    canAsk: '約可再提問 {count} 次',
    loginPrompt: '請先登入，系統會建立你的點數帳戶並發放新會員 100 點。',
    goLogin: '前往占卜頁登入',
    buyCredits: '購買點數',
    subscribe: '訂閱帳戶',
    buy: '購買',
    subscribing: '訂閱',
    creating: '建立中...',
    perMonth: '/ 月',
    pointsCount: '{credits} 點，約 {count} 次提問',
    monthlyCount: '每月 {credits} 點，約 {count} 次提問',
    packages: {
      starter: { name: '入門補充包', description: '約 100 次提問，適合偶爾使用。' },
      standard: { name: '標準靈感包', description: '約 240 次提問，單次成本更低。' },
      deep: { name: '深度探索包', description: '約 600 次提問，適合大量追問。' },
    },
    subscriptions: {
      monthly_light: { name: '月光方案', description: '每月約 200 次提問，輕鬆維持占卜習慣。' },
      monthly_plus: { name: '星辰方案', description: '每月約 500 次提問，最受歡迎的超值選擇。' },
      monthly_pro: { name: '神諭方案', description: '每月約 1200 次提問，深度探索不設限。' },
    },
  },

  // 關於頁
  about: {
    title: '關於神秘塔羅',
    intro: '神秘塔羅融合了流傳數百年的塔羅牌智慧與尖端 AI 技術，為每一位探索者打造專屬的占卜體驗。無論你是塔羅新手還是資深愛好者，都能在這裡找到啟發與方向。',
    coreFeatures: '核心特色',
    spreadIntro: '牌陣介紹',
    tips: '占卜小提示',
    historyTitle: '韋特塔羅的歷史',
    disclaimer: '⚠ 免責聲明：塔羅牌是一種自我探索與反思的工具，並非科學預測方法。本站提供的 AI 解讀僅供參考，不應作為醫療、法律、財務等專業決策的依據。面對重要人生決定，請諮詢相關專業人士。',
    historyContent: [
      '萊德偉特（Rider-Waite）塔羅牌誕生於 1909 年，由神秘學者亞瑟·愛德華·韋特（Arthur Edward Waite）設計，帕梅拉·科爾曼·史密斯（Pamela Colman Smith）繪製。這副牌最大的革新在於為所有 78 張牌都加入了豐富的圖像場景，讓每張牌都成為一個可以直覺解讀的故事。',
      '大阿爾克那的 22 張牌代表人生重大的靈性課題與轉折點——從愚者（The Fool）踏上未知旅程，到世界（The World）達成圓滿，構成完整的「愚者之旅」。',
      '小阿爾克那的 56 張牌分為權杖（火元素）、聖杯（水元素）、寶劍（風元素）、錢幣（土元素）四組花色，反映日常生活中的行動、情感、思維與物質面向。',
    ],
    features: [
      { sigil: '⚶', title: '完整 78 張韋特塔羅', desc: '涵蓋 22 張大阿爾克那與 56 張小阿爾克那，每張牌皆為經典萊德偉特手繪圖像。' },
      { sigil: '⊛', title: 'AI 智慧解讀', desc: '結合先進語言模型，根據你的問題、牌陣位置和正逆位，提供深度個人化的解讀分析。' },
      { sigil: '✧', title: '沉浸式互動體驗', desc: '精心設計的洗牌、切牌、扇形攤牌動畫，配合金色粒子特效，打造如臨現場的占卜儀式感。' },
      { sigil: '◈', title: '追問對話系統', desc: '占卜結果不再是一次性的。透過 AI 引導式追問，深入探索每個面向，獲得更完整的指引。' },
      { sigil: '☽', title: '占卜紀錄雲端同步', desc: '登入會員後，你的每一次占卜都安全儲存在雲端，隨時回顧過往的智慧指引。' },
      { sigil: '⚹', title: '三種經典牌陣', desc: '單牌占卜快速指引、三牌占卜探索過去現在未來、凱爾特十字牌陣進行全面深度解析。' },
    ],
    spreadDetails: [
      { name: '單牌占卜', cards: '1 張牌', time: '約 1 分鐘', desc: '適合日常快速指引，用一張牌切入問題的核心。' },
      { name: '三牌占卜', cards: '3 張牌', time: '約 3 分鐘', desc: '探索過去、現在、未來的完整脈絡，理解事件的發展軌跡。' },
      { name: '凱爾特十字', cards: '10 張牌', time: '約 8 分鐘', desc: '最經典的全面解析牌陣，涵蓋現況、挑戰、潛意識到最終結果。' },
    ],
    tarotTips: [
      '占卜前先靜心，在心中默念你的問題，讓能量聚焦。',
      '問題越具體，牌面的回應越精準。避免「會不會」類型的問題。',
      '逆位不代表壞事，它代表能量的轉變或需要重新審視的面向。',
      '塔羅是自我探索的工具，最終的選擇權永遠在你手中。',
    ],
  },

  // 牌陣
  spreads: {
    single: { name: '單牌占卜', description: '快速獲得指引，適合新手' },
    threeCard: { name: '三牌占卜', description: '過去、現在、未來的全面解讀' },
    celticCross: { name: '凱爾特十字', description: '十張牌深度解析，全方位洞察' },
  },

  // 牌陣位置名稱
  positions: {
    single: ['指引'],
    threeCard: ['過去', '現在', '未來'],
    celticCross: ['現況', '挑戰', '潛意識', '過去', '可能性', '近未來', '自我', '環境', '希望與恐懼', '最終結果'],
  },
} as const;

export default zhTW;

/** 遞迴把 readonly 字面量寬化為 mutable string/number */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends readonly (infer U)[]
      ? Array<Widen<U>>
      : T extends Record<string, unknown>
        ? { -readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type Locale = Widen<typeof zhTW>;
