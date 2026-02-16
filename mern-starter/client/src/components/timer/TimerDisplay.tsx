import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface TimerDisplayProps {
  startTime?: string;
  isRunning: boolean;
  initialDuration?: number;
}

export function TimerDisplay({
  startTime,
  isRunning,
  initialDuration = 0,
}: TimerDisplayProps) {
  const [seconds, setSeconds] = useState(initialDuration);

  useEffect(() => {
    if (!isRunning || !startTime) {
      setSeconds(initialDuration);
      return;
    }

    const start = new Date(startTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - start) / 1000);
      setSeconds(initialDuration + elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime, initialDuration]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 py-8">
      <Clock
        className={`w-10 h-10 ${
          isRunning ? 'text-green-500 animate-pulse' : 'text-gray-400'
        }`}
      />
      <div
        className={`font-mono text-5xl md:text-6xl font-bold ${
          isRunning ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {formatTime(seconds)}
      </div>
    </div>
  );
}
