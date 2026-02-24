import { useEffect, useState, useCallback, useRef } from 'react';
import { useSettingsStore } from '../../stores/settings-store';

/**
 * Paper-plane fly-out animation triggered via `atlasmail:email_sent` custom event.
 * Launches from the center of the screen with a shake on takeoff, sparkle
 * particles, and a motion trail, arcing upward and off the top-right corner.
 *
 * Can be disabled via Settings > Appearance > Animations.
 */

export function SendAnimation() {
  const enabled = useSettingsStore((s) => s.sendAnimation);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trigger = useCallback(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    requestAnimationFrame(() => {
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 2200);
    });
  }, [enabled]);

  useEffect(() => {
    const handler = () => trigger();
    document.addEventListener('atlasmail:email_sent', handler);
    return () => {
      document.removeEventListener('atlasmail:email_sent', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger]);

  if (!visible) return null;

  // Generate sparkle positions along the curved flight path
  const sparkles = Array.from({ length: 20 }, (_, i) => {
    const t = i / 19; // 0 to 1 along path
    // Curve from center (50%, 50%) to top-right
    const x = 50 + t * 35 + (Math.random() - 0.5) * 8;
    const y = 50 - t * 50 + (Math.random() - 0.5) * 6;
    const delay = 0.15 + t * 0.8;
    const size = 2 + Math.random() * 4;
    return { x, y, delay, size, key: i };
  });

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Sparkle particles */}
      {sparkles.map((s) => (
        <div
          key={s.key}
          className="send-sparkle"
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: 'var(--color-accent-primary)',
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* Paper plane container — starts at center */}
      <div className="send-plane-wrapper">
        <div className="send-plane-shake">
          <svg
            className="send-plane-svg"
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
              fill="var(--color-accent-primary)"
            />
            <path
              d="M2 10l15 2L2.01 3z"
              fill="white"
              opacity="0.3"
            />
          </svg>
        </div>

        {/* Motion trails */}
        <div className="send-trail" />
        <div className="send-trail-thin" />
      </div>

      <style>{`
        .send-plane-wrapper {
          position: absolute;
          left: 50%;
          top: 50%;
          margin-left: -17px;
          margin-top: -17px;
          animation: sendPlaneArc 1.8s cubic-bezier(0.15, 0.65, 0.3, 1) forwards;
        }

        .send-plane-shake {
          animation: sendPlaneShake 0.4s ease-in-out;
        }

        .send-plane-svg {
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
          animation: sendPlaneTilt 1.8s ease-out forwards;
        }

        .send-trail {
          position: absolute;
          top: 50%;
          right: 85%;
          height: 3px;
          margin-top: -1.5px;
          border-radius: 2px;
          background: linear-gradient(to left, var(--color-accent-primary), transparent);
          animation: sendTrailGrow 1.8s ease-out forwards;
        }

        .send-trail-thin {
          position: absolute;
          top: 50%;
          right: 85%;
          height: 1px;
          margin-top: 4px;
          border-radius: 1px;
          background: linear-gradient(to left, var(--color-accent-primary), transparent);
          opacity: 0.25;
          animation: sendTrailGrow 1.8s 0.06s ease-out forwards;
        }

        .send-sparkle {
          opacity: 0;
          animation: sendSparkle 0.7s ease-out forwards;
        }

        @keyframes sendPlaneShake {
          0%   { transform: translate(0, 0); }
          10%  { transform: translate(-3px, 2px); }
          20%  { transform: translate(4px, -1px); }
          30%  { transform: translate(-2px, -3px); }
          40%  { transform: translate(3px, 1px); }
          50%  { transform: translate(-1px, 2px); }
          60%  { transform: translate(2px, -2px); }
          70%  { transform: translate(-2px, 1px); }
          80%  { transform: translate(1px, -1px); }
          100% { transform: translate(0, 0); }
        }

        @keyframes sendPlaneArc {
          0% {
            transform: translate(0, 0) scale(0.6);
            opacity: 0;
          }
          5% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          22% {
            opacity: 1;
            transform: translate(0, 0) scale(1.08);
          }
          30% {
            opacity: 1;
            transform: translate(30px, -20px) scale(1.05);
          }
          60% {
            opacity: 1;
            transform: translate(180px, -160px) scale(0.8);
          }
          100% {
            transform: translate(420px, -380px) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes sendPlaneTilt {
          0%  { transform: rotate(0deg); }
          22% { transform: rotate(-3deg); }
          35% { transform: rotate(-20deg); }
          60% { transform: rotate(-32deg); }
          100% { transform: rotate(-42deg); }
        }

        @keyframes sendTrailGrow {
          0% {
            width: 0;
            opacity: 0;
          }
          22% {
            width: 0;
            opacity: 0;
          }
          35% {
            width: 50px;
            opacity: 0.6;
          }
          55% {
            width: 100px;
            opacity: 0.4;
          }
          100% {
            width: 180px;
            opacity: 0;
          }
        }

        @keyframes sendSparkle {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          35% {
            transform: scale(1.6);
            opacity: 0.7;
          }
          70% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
