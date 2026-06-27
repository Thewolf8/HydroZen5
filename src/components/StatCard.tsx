import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  bgColor?: string;
  borderColor?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function StatCard({
  icon: Icon, label, value, sub, color = 'text-sky-500',
  bgColor = 'bg-sky-500/10', borderColor = 'border-sky-500/20',
  onClick, active,
}: StatCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
        active ? `${bgColor} ${borderColor} shadow-md` : 'bg-card border-border hover:border-sky-500/30'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center mb-3`}>
        <Icon size={18} className={color} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </motion.div>
  );
}
