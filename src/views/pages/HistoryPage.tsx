import { motion } from 'framer-motion';

export default function HistoryPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-20">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 text-2xl font-bold text-[var(--color-accent-gold)]"
      >
        占卜紀錄
      </motion.h1>
      <p className="text-[var(--color-text-secondary)]">
        尚無占卜紀錄。去進行一次占卜吧！
      </p>
    </div>
  );
}
