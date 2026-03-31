import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Pet sprites config
// ---------------------------------------------------------------------------

type PetType = 'cat' | 'fox';

interface PetAnimConfig {
  walkFrames: number;
  sitFrames: number;
  lickFrames: number;
  hasLick: boolean;
  hasSit: boolean;
}

const PET_CONFIG: Record<PetType, PetAnimConfig> = {
  cat: { walkFrames: 6, sitFrames: 10, lickFrames: 12, hasLick: true, hasSit: true },
  fox: { walkFrames: 8, sitFrames: 0, lickFrames: 0, hasLick: false, hasSit: false },
};

function framePath(pet: PetType, action: string, frame: number): string {
  return `/pets/${pet}/${action}/frame_${String(frame).padStart(3, '0')}.png`;
}

// ---------------------------------------------------------------------------
// DockPet — pixel pet that wanders near the dock
// ---------------------------------------------------------------------------

interface DockPetProps {
  pet?: PetType;
  bottomOffset?: number;
}

type PetState = 'walk-east' | 'walk-west' | 'idle' | 'sit' | 'lick';

export function DockPet({ pet = 'cat', bottomOffset = 82 }: DockPetProps) {
  const config = PET_CONFIG[pet];
  const [state, setState] = useState<PetState>('idle');
  const [frame, setFrame] = useState(0);
  const [x, setX] = useState(() => Math.random() * (window.innerWidth - 200) + 100);
  const moveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const xRef = useRef(x);
  xRef.current = x;

  // Frame animation
  useEffect(() => {
    if (state === 'idle') {
      setFrame(0);
      return;
    }

    let maxFrames: number;
    let rate: number;

    if (state === 'walk-east' || state === 'walk-west') {
      maxFrames = config.walkFrames;
      rate = 180; // slower walk
    } else if (state === 'sit') {
      maxFrames = config.sitFrames;
      rate = 200;
    } else if (state === 'lick') {
      maxFrames = config.lickFrames;
      rate = 160;
    } else {
      return;
    }

    setFrame(0);
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % maxFrames);
    }, rate);
    return () => clearInterval(interval);
  }, [state, config]);

  // Movement (only when walking)
  useEffect(() => {
    if (state !== 'walk-east' && state !== 'walk-west') return;
    const speed = 0.5; // slow stroll
    const interval = setInterval(() => {
      setX((prev) => {
        const next = state === 'walk-east' ? prev + speed : prev - speed;
        if (next > window.innerWidth - 60) { setState('walk-west'); return prev; }
        if (next < 20) { setState('walk-east'); return prev; }
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [state]);

  // Behavior loop
  const pickNextAction = useCallback(() => {
    const rand = Math.random();
    const hasCatAnims = config.hasLick || config.hasSit;

    if (rand < 0.2 && config.hasSit) {
      // Sit for 4-8s
      setState('sit');
      moveTimerRef.current = setTimeout(pickNextAction, 4000 + Math.random() * 4000);
    } else if (rand < 0.35 && config.hasLick) {
      // Lick for 3-5s
      setState('lick');
      moveTimerRef.current = setTimeout(pickNextAction, 3000 + Math.random() * 2000);
    } else if (rand < 0.55) {
      // Idle (just standing still) for 3-6s
      setState('idle');
      moveTimerRef.current = setTimeout(pickNextAction, 3000 + Math.random() * 3000);
    } else {
      // Walk for 5-12s
      const preferDir = xRef.current > window.innerWidth / 2 ? 'walk-west' : 'walk-east';
      setState(Math.random() > 0.4 ? preferDir : (preferDir === 'walk-east' ? 'walk-west' : 'walk-east'));
      moveTimerRef.current = setTimeout(pickNextAction, 5000 + Math.random() * 7000);
    }
  }, [config]);

  useEffect(() => {
    moveTimerRef.current = setTimeout(pickNextAction, 2000 + Math.random() * 2000);
    return () => clearTimeout(moveTimerRef.current);
  }, [pickNextAction]);

  // Resolve sprite path
  let src: string;
  if (state === 'idle') {
    src = `/pets/${pet}/idle/frame_000.png`;
  } else if (state === 'sit') {
    src = framePath(pet, 'sit', frame);
  } else if (state === 'lick') {
    src = framePath(pet, 'lick', frame);
  } else {
    src = framePath(pet, state, frame);
  }

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: x,
        width: 40,
        height: 40,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        zIndex: 45,
      }}
    />
  );
}
