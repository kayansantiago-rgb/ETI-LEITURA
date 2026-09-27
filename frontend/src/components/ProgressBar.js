import { motion } from 'framer-motion';

const ProgressBar = ({ percentage, className = '' }) => {
  const getColor = () => {
    if (percentage === 0) return 'bg-stone-200';
    if (percentage < 30) return 'bg-yellow-500';
    if (percentage < 70) return 'bg-blue-500';
    if (percentage < 100) return 'bg-green-500';
    return 'bg-primary';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          {percentage === 0 ? 'Não iniciado' : percentage === 100 ? 'Concluído' : 'Lendo'}
        </span>
        <span className="text-xs font-medium text-foreground">{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${getColor()} rounded-full`}
        />
      </div>
    </div>
  );
};

export default ProgressBar;