import type { TarotCard } from '../models/tarot-card';

const major = (
  number: number,
  id: string,
  name: string,
  nameEn: string,
  keywords: string[],
  reversedKeywords: string[],
): TarotCard => ({
  id: `major-${String(number).padStart(2, '0')}`,
  name,
  nameEn,
  arcana: 'major',
  number,
  imageUrl: `/cards/major/${id}.webp`,
  keywords,
  reversedKeywords,
});

const minor = (
  suit: TarotCard['suit'],
  number: number,
  name: string,
  nameEn: string,
  keywords: string[],
  reversedKeywords: string[],
): TarotCard => ({
  id: `${suit}-${String(number).padStart(2, '0')}`,
  name,
  nameEn,
  arcana: 'minor',
  suit: suit!,
  number,
  imageUrl: `/cards/minor/${suit}-${String(number).padStart(2, '0')}.webp`,
  keywords,
  reversedKeywords,
});

export const MAJOR_ARCANA: TarotCard[] = [
  major(0, 'the-fool', '愚者', 'The Fool', ['新開始', '冒險', '天真'], ['魯莽', '猶豫', '冒失']),
  major(1, 'the-magician', '魔術師', 'The Magician', ['創造力', '意志力', '技能'], ['欺騙', '操控', '才能浪費']),
  major(2, 'the-high-priestess', '女祭司', 'The High Priestess', ['直覺', '潛意識', '神秘'], ['封閉', '壓抑直覺', '表面化']),
  major(3, 'the-empress', '皇后', 'The Empress', ['豐饒', '母性', '自然'], ['依賴', '空虛', '創造力匱乏']),
  major(4, 'the-emperor', '皇帝', 'The Emperor', ['權威', '穩定', '領導'], ['專制', '僵化', '控制慾']),
  major(5, 'the-hierophant', '教皇', 'The Hierophant', ['傳統', '指導', '信仰'], ['教條', '叛逆', '非傳統']),
  major(6, 'the-lovers', '戀人', 'The Lovers', ['愛情', '選擇', '和諧'], ['失衡', '價值觀衝突', '猶豫不決']),
  major(7, 'the-chariot', '戰車', 'The Chariot', ['決心', '勝利', '前進'], ['失控', '挫敗', '方向迷失']),
  major(8, 'strength', '力量', 'Strength', ['勇氣', '耐心', '內在力量'], ['軟弱', '自我懷疑', '缺乏自信']),
  major(9, 'the-hermit', '隱者', 'The Hermit', ['內省', '智慧', '獨處'], ['孤立', '退縮', '過度封閉']),
  major(10, 'wheel-of-fortune', '命運之輪', 'Wheel of Fortune', ['轉變', '機遇', '命運'], ['逆境', '抗拒改變', '厄運']),
  major(11, 'justice', '正義', 'Justice', ['公正', '真相', '因果'], ['不公', '逃避責任', '偏見']),
  major(12, 'the-hanged-man', '倒吊人', 'The Hanged Man', ['放下', '新視角', '等待'], ['拖延', '無謂犧牲', '固執']),
  major(13, 'death', '死神', 'Death', ['結束', '轉化', '重生'], ['抗拒改變', '停滯', '恐懼']),
  major(14, 'temperance', '節制', 'Temperance', ['平衡', '調和', '耐心'], ['過度', '失衡', '缺乏遠見']),
  major(15, 'the-devil', '惡魔', 'The Devil', ['束縛', '慾望', '物質'], ['解放', '打破枷鎖', '覺醒']),
  major(16, 'the-tower', '高塔', 'The Tower', ['劇變', '破壞', '啟示'], ['恐懼改變', '苟延殘喘', '逃避']),
  major(17, 'the-star', '星星', 'The Star', ['希望', '靈感', '平靜'], ['失望', '缺乏信心', '斷開連結']),
  major(18, 'the-moon', '月亮', 'The Moon', ['幻象', '潛意識', '不安'], ['釋放恐懼', '真相大白', '克服困惑']),
  major(19, 'the-sun', '太陽', 'The Sun', ['喜悅', '成功', '活力'], ['暫時挫折', '過度樂觀', '延遲']),
  major(20, 'judgement', '審判', 'Judgement', ['覺醒', '重生', '召喚'], ['自我懷疑', '逃避審視', '拒絕成長']),
  major(21, 'the-world', '世界', 'The World', ['完成', '成就', '圓滿'], ['未竟之業', '停滯', '缺乏結束']),
];

const wandsNames: [string, string, string[], string[]][] = [
  ['權杖王牌', 'Ace of Wands', ['靈感', '新機會', '潛力'], ['延遲', '缺乏方向', '錯過機會']],
  ['權杖二', 'Two of Wands', ['規劃', '決定', '探索'], ['恐懼改變', '缺乏規劃', '猶豫']],
  ['權杖三', 'Three of Wands', ['遠見', '擴展', '機會'], ['受阻', '短視', '延遲']],
  ['權杖四', 'Four of Wands', ['慶祝', '穩定', '歸屬'], ['不安定', '缺乏支持', '過渡期']],
  ['權杖五', 'Five of Wands', ['競爭', '衝突', '挑戰'], ['妥協', '迴避衝突', '內在衝突']],
  ['權杖六', 'Six of Wands', ['勝利', '認可', '自信'], ['挫敗', '缺乏認可', '驕傲']],
  ['權杖七', 'Seven of Wands', ['堅守', '防衛', '毅力'], ['退縮', '被壓倒', '放棄']],
  ['權杖八', 'Eight of Wands', ['迅速', '行動', '進展'], ['延遲', '受阻', '混亂']],
  ['權杖九', 'Nine of Wands', ['堅韌', '警覺', '最後考驗'], ['疲憊', '多疑', '放棄邊緣']],
  ['權杖十', 'Ten of Wands', ['重擔', '責任', '壓力'], ['放下', '委派', '過度承擔']],
  ['權杖侍者', 'Page of Wands', ['熱情', '探索', '好奇'], ['缺乏方向', '衝動', '膚淺']],
  ['權杖騎士', 'Knight of Wands', ['冒險', '精力充沛', '大膽'], ['魯莽', '散漫', '急躁']],
  ['權杖皇后', 'Queen of Wands', ['自信', '獨立', '溫暖'], ['嫉妒', '自私', '控制']],
  ['權杖國王', 'King of Wands', ['領袖', '遠見', '果斷'], ['專橫', '衝動', '高期望']],
];

const cupsNames: [string, string, string[], string[]][] = [
  ['聖杯王牌', 'Ace of Cups', ['新感情', '直覺', '喜悅'], ['情感封閉', '空虛', '壓抑']],
  ['聖杯二', 'Two of Cups', ['結合', '伴侶', '和諧'], ['分離', '失衡', '誤解']],
  ['聖杯三', 'Three of Cups', ['慶祝', '友誼', '社交'], ['過度放縱', '孤立', '八卦']],
  ['聖杯四', 'Four of Cups', ['沉思', '倦怠', '不滿'], ['覺醒', '接受', '新觀點']],
  ['聖杯五', 'Five of Cups', ['失落', '悲傷', '遺憾'], ['接受', '放下', '前進']],
  ['聖杯六', 'Six of Cups', ['懷舊', '童真', '回憶'], ['活在過去', '不切實際', '依戀']],
  ['聖杯七', 'Seven of Cups', ['幻想', '選擇', '白日夢'], ['迷失', '誘惑', '分散注意']],
  ['聖杯八', 'Eight of Cups', ['離開', '放棄', '尋找'], ['恐懼改變', '停滯', '逃避']],
  ['聖杯九', 'Nine of Cups', ['滿足', '願望成真', '感恩'], ['貪婪', '不知足', '物質主義']],
  ['聖杯十', 'Ten of Cups', ['幸福', '家庭', '圓滿'], ['破碎', '不和諧', '價值觀衝突']],
  ['聖杯侍者', 'Page of Cups', ['創意', '好奇', '直覺'], ['情感不成熟', '逃避現實', '敏感']],
  ['聖杯騎士', 'Knight of Cups', ['浪漫', '魅力', '想像'], ['不切實際', '情緒化', '善變']],
  ['聖杯皇后', 'Queen of Cups', ['慈悲', '直覺', '情感智慧'], ['情感依賴', '殉道', '不安']],
  ['聖杯國王', 'King of Cups', ['情感成熟', '平靜', '外交'], ['情感操控', '壓抑', '冷漠']],
];

const swordsNames: [string, string, string[], string[]][] = [
  ['寶劍王牌', 'Ace of Swords', ['清晰', '突破', '真理'], ['混亂', '誤解', '暴力']],
  ['寶劍二', 'Two of Swords', ['僵局', '抉擇', '平衡'], ['資訊過載', '逃避決定', '焦慮']],
  ['寶劍三', 'Three of Swords', ['心碎', '悲痛', '分離'], ['療癒', '寬恕', '釋放']],
  ['寶劍四', 'Four of Swords', ['休息', '恢復', '沉思'], ['不安', '倦怠', '過度休息']],
  ['寶劍五', 'Five of Swords', ['衝突', '失敗', '代價'], ['和解', '放下', '學習教訓']],
  ['寶劍六', 'Six of Swords', ['過渡', '療癒', '前行'], ['停滯', '無法放手', '抗拒']],
  ['寶劍七', 'Seven of Swords', ['策略', '欺騙', '計謀'], ['坦誠', '被揭穿', '良心發現']],
  ['寶劍八', 'Eight of Swords', ['束縛', '無力', '受限'], ['解放', '新觀點', '力量']],
  ['寶劍九', 'Nine of Swords', ['焦慮', '噩夢', '恐懼'], ['釋放', '面對恐懼', '療癒']],
  ['寶劍十', 'Ten of Swords', ['終結', '背叛', '崩潰'], ['重生', '觸底反彈', '新開始']],
  ['寶劍侍者', 'Page of Swords', ['好奇', '機警', '求知'], ['八卦', '草率', '冷酷']],
  ['寶劍騎士', 'Knight of Swords', ['果斷', '敏捷', '直接'], ['衝動', '無禮', '草率']],
  ['寶劍皇后', 'Queen of Swords', ['獨立', '理性', '直率'], ['冷酷', '苛刻', '孤立']],
  ['寶劍國王', 'King of Swords', ['權威', '理智', '正直'], ['獨裁', '無情', '操控']],
];

const pentaclesNames: [string, string, string[], string[]][] = [
  ['錢幣王牌', 'Ace of Pentacles', ['新機會', '財富', '穩定'], ['錯失機會', '缺乏規劃', '貪婪']],
  ['錢幣二', 'Two of Pentacles', ['平衡', '適應', '彈性'], ['失衡', '過度承擔', '混亂']],
  ['錢幣三', 'Three of Pentacles', ['合作', '技藝', '團隊'], ['缺乏合作', '品質低落', '孤軍奮戰']],
  ['錢幣四', 'Four of Pentacles', ['安全', '保守', '控制'], ['貪婪', '吝嗇', '過度執著']],
  ['錢幣五', 'Five of Pentacles', ['困難', '貧困', '孤立'], ['恢復', '找到支持', '改善']],
  ['錢幣六', 'Six of Pentacles', ['慷慨', '施與受', '公平'], ['債務', '不平等', '附帶條件']],
  ['錢幣七', 'Seven of Pentacles', ['耐心', '投資', '評估'], ['焦躁', '缺乏遠見', '回報不足']],
  ['錢幣八', 'Eight of Pentacles', ['勤奮', '專注', '精進'], ['完美主義', '缺乏熱情', '枯燥']],
  ['錢幣九', 'Nine of Pentacles', ['獨立', '富足', '自給自足'], ['過度工作', '表面富裕', '孤獨']],
  ['錢幣十', 'Ten of Pentacles', ['傳承', '家族', '長期成功'], ['家庭糾紛', '財務損失', '短視']],
  ['錢幣侍者', 'Page of Pentacles', ['學習', '機會', '務實'], ['缺乏進展', '懶散', '錯失機會']],
  ['錢幣騎士', 'Knight of Pentacles', ['可靠', '堅持', '務實'], ['固執', '無聊', '過度謹慎']],
  ['錢幣皇后', 'Queen of Pentacles', ['nurturing', '務實', '安全'], ['過度保護', '忽略自我', '物質主義']],
  ['錢幣國王', 'King of Pentacles', ['成功', '穩定', '領導'], ['貪婪', '頑固', '物質至上']],
];

function buildMinorSuit(
  suit: TarotCard['suit'],
  data: [string, string, string[], string[]][],
): TarotCard[] {
  return data.map(([name, nameEn, kw, rkw], i) =>
    minor(suit, i + 1, name, nameEn, kw, rkw),
  );
}

export const MINOR_ARCANA: TarotCard[] = [
  ...buildMinorSuit('wands', wandsNames),
  ...buildMinorSuit('cups', cupsNames),
  ...buildMinorSuit('swords', swordsNames),
  ...buildMinorSuit('pentacles', pentaclesNames),
];

export const ALL_CARDS: TarotCard[] = [...MAJOR_ARCANA, ...MINOR_ARCANA];
