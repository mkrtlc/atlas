import { useEffect, useRef } from 'react';
import '../../styles/shared-pickers.css';

// ─── Emoji categories (shared across Docs, Tasks, etc.) ─────────────

export const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😬'],
  },
  {
    label: 'Objects',
    emojis: ['📄','📝','📖','📚','📁','📂','📌','📎','📐','📏','✂️','🗂️','🗃️','🗄️','📮','📯','📰','🗞️','📜','🏷️','💼','🎒','👜','📦','🔑','🗝️','🔒','🔓','🛠️','⚙️','🔧','🔨','⚡','💡','🔬','🔭','📡'],
  },
  {
    label: 'Symbols',
    emojis: ['🚀','⭐','🌟','💫','✨','🔥','💎','🎯','🏆','🎨','🎭','🎪','🎬','🎮','🎲','🧩','🔮','🧪','🧬','💻','🖥️','📱','⌨️','🖱️','💾','💿','📀','🎵','🎶','🔔','📣','💬','💭','🗯️','❤️','💙','💚','💛','🧡','💜'],
  },
  {
    label: 'Nature',
    emojis: ['🌸','🌺','🌻','🌹','🌷','🌱','🌲','🌳','🌴','🍀','🍁','🍂','🍃','🌿','☘️','🌾','🌵','🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','🌊','🏔️','⛰️','🗻','🌋'],
  },
  {
    label: 'Food',
    emojis: ['🍎','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥬','🌽','🥕','🧄','🧅','🥔','🍠','🥯','🍞','🥖','🥐','🧇','🥞','🧀','🍳','🥚','🥓','🥩'],
  },
];

// ─── EmojiPicker component ──────────────────────────────────────────

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onRemove, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="emoji-picker-popover" style={{ top: '100%', left: 0, marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          Pick an icon
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap',
            }}
          >
            Remove
          </button>
        )}
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <div className="emoji-picker-category">{cat.label}</div>
            <div className="emoji-picker-grid">
              {cat.emojis.map((emoji, i) => (
                <button key={`${emoji}-${i}`} className="emoji-picker-btn" onClick={() => onSelect(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
