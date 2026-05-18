import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { marked } from 'marked';
import type { SpreadType } from '../../models/spread';
import { SPREADS } from '../../models/spread';
import { useTarotSession } from '../../controllers/useTarotSession';
import CardFace from '../components/tarot/CardFace';
import ShuffleAnimation from '../animations/ShuffleAnimation';
import CutAnimation from '../animations/CutAnimation';
import DrawAnimation from '../animations/DrawAnimation';

export default function ReadingPage() {
  const [searchParams] = useSearchParams();
  const spreadType = (searchParams.get('spread') || 'single') as SpreadType;
  const spread = SPREADS[spreadType] || SPREADS.single;

  const {
    phase, question, setQuestion,
    startReading, onShuffleComplete, onCutComplete, onDrawComplete,
    reset, drawnCards, interpretation,
  } = useTarotSession(spreadType);

  const interpretationHtml = useMemo(
    () => (interpretation ? (marked.parse(interpretation, { async: false }) as string) : ''),
    [interpretation],
  );

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <h1 className="mb-2 text-2xl font-bold text-[var(--color-accent-gold)] animate-fade-in">
        {spread.name}
      </h1>
      <p className="mb-10 text-sm text-[var(--color-text-muted)]">{spread.description}</p>

      {/* === idle：輸入問題 === */}
      {phase === 'idle' && (
        <div key="idle" className="w-full max-w-md animate-fade-in-up">
          <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
            在心中想著你的問題...
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="輸入你想問的問題（選填）"
            className="mb-6 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent-gold)]"
            rows={3}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={startReading}
            className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[var(--color-accent-purple)] to-[var(--color-accent-mystic)] px-6 py-3 text-lg font-bold text-white shadow-[var(--shadow-glow)] transition-shadow hover:shadow-[var(--shadow-card-hover)]"
          >
            ✦ 開始洗牌
          </motion.button>
        </div>
      )}

      {/* === shuffling：洗牌動畫 === */}
      {phase === 'shuffling' && (
        <div key="shuffling" className="animate-fade-in">
          <ShuffleAnimation onComplete={onShuffleComplete} />
        </div>
      )}

      {/* === cutting：切牌動畫 === */}
      {phase === 'cutting' && (
        <div key="cutting" className="animate-fade-in">
          <CutAnimation onComplete={onCutComplete} />
        </div>
      )}

      {/* === drawing：互動抽牌 === */}
      {phase === 'drawing' && (
        <div key="drawing" className="animate-fade-in">
          <DrawAnimation
            spread={spread}
            drawnCards={drawnCards}
            onComplete={onDrawComplete}
          />
        </div>
      )}

      {/* === interpreting：解讀等待 === */}
      {phase === 'interpreting' && (
        <div key="interpreting" className="flex flex-col items-center gap-8 animate-fade-in">
          <div className="flex flex-wrap justify-center gap-4">
            {drawnCards.map((dc) => (
              <CardFace key={dc.card.id} drawnCard={dc} />
            ))}
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-2 w-2 rounded-full bg-[var(--color-accent-gold)]"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">神諭正在解讀牌義...</p>
          </div>
        </div>
      )}

      {/* === complete：顯示結果 === */}
      {phase === 'complete' && interpretationHtml && (
        <div key="complete" className="w-full max-w-2xl animate-fade-in-up">
          <div className="mb-8 flex flex-wrap justify-center gap-4">
            {drawnCards.map((dc, i) => (
              <div
                key={dc.card.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardFace drawnCard={dc} />
              </div>
            ))}
          </div>

          <div
            className="interpretation-panel rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 shadow-[var(--shadow-card)] animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            <div
              className="max-w-none text-[var(--color-text-primary)]"
              dangerouslySetInnerHTML={{ __html: interpretationHtml }}
            />
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={reset}
              className="cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent px-6 py-2 text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent-gold)] hover:text-[var(--color-accent-gold)]"
            >
              再占一次
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
