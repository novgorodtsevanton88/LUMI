import { motion, type HTMLMotionProps } from 'framer-motion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const styles: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'glass text-text-primary',
  ghost: 'text-accent',
  danger: 'bg-danger text-white',
};

export function Button({ variant = 'primary', className = '', ...rest }: HTMLMotionProps<'button'> & { variant?: Variant }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-headline outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    />
  );
}
