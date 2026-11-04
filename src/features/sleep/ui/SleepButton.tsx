import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';

export function SleepButton({ asleep, onPress, size = 96 }: { asleep: boolean; onPress: () => void; size?: number }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onPress}
      aria-label={asleep ? 'Завершити сон' : 'Почати сон'}
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-card outline-none focus-visible:ring-4 focus-visible:ring-sleep/50"
    >
      {asleep ? <Sun size={size * 0.38} aria-hidden /> : <Moon size={size * 0.38} aria-hidden />}
    </motion.button>
  );
}
