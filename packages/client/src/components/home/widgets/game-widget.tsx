import { useState, useRef, useCallback } from 'react';
import { Gamepad2 } from 'lucide-react';
import type { WidgetDefinition, WidgetProps } from './types';

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'too-early';

function GameWidgetComponent({ width, height }: WidgetProps) {
  const [state, setState] = useState<GameState>('idle');
  const [reactionTime, setReactionTime] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const readyAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const start = useCallback(() => {
    setState('waiting');
    const delay = 1500 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      readyAtRef.current = Date.now();
      setState('ready');
    }, delay);
  }, []);

  const handleClick = useCallback(() => {
    if (state === 'idle' || state === 'result' || state === 'too-early') {
      start();
    } else if (state === 'waiting') {
      clearTimeout(timerRef.current);
      setState('too-early');
    } else if (state === 'ready') {
      const ms = Date.now() - readyAtRef.current;
      setReactionTime(ms);
      if (bestTime === null || ms < bestTime) {
        setBestTime(ms);
      }
      setState('result');
    }
  }, [state, bestTime, start]);

  const bgColor =
    state === 'ready'
      ? 'rgba(34,197,94,0.25)'
      : state === 'too-early'
        ? 'rgba(239,68,68,0.2)'
        : 'transparent';

  return (
    <div
      onClick={handleClick}
      style={{
        width, height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '6px 8px',
        background: bgColor,
        borderRadius: 12,
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
    >
      {state === 'idle' && (
        <>
          <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>Reaction test</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Click to start</span>
        </>
      )}
      {state === 'waiting' && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          Wait for green...
        </span>
      )}
      {state === 'ready' && (
        <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
          CLICK NOW!
        </span>
      )}
      {state === 'too-early' && (
        <>
          <span style={{ fontSize: 10, color: 'rgba(239,68,68,0.9)', fontWeight: 600 }}>Too early!</span>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Click to retry</span>
        </>
      )}
      {state === 'result' && (
        <>
          <span style={{ fontSize: 16, color: '#fff', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {reactionTime}ms
          </span>
          {bestTime !== null && (
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
              Best: {bestTime}ms
            </span>
          )}
          <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Click to retry</span>
        </>
      )}
    </div>
  );
}

export const gameWidget: WidgetDefinition = {
  id: 'game',
  name: 'Reaction game',
  description: 'Quick reaction time test to take a break',
  icon: Gamepad2,
  defaultEnabled: false,
  component: GameWidgetComponent,
};
