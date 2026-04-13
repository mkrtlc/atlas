import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/modal';
import { Kbd } from '../../../components/ui/kbd';

interface DrawHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutRow {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  heading: string;
  rows: ShortcutRow[];
}

export function DrawHelpModal({ open, onOpenChange }: DrawHelpModalProps) {
  const { t } = useTranslation();

  const sections: ShortcutSection[] = [
    {
      heading: t('draw.help.selection'),
      rows: [
        { keys: ['V'], description: 'Selection tool' },
        { keys: ['Space', 'drag'], description: 'Pan canvas' },
        { keys: ['ArrowUp'], description: 'Nudge selected elements' },
      ],
    },
    {
      heading: t('draw.help.drawing'),
      rows: [
        { keys: ['R'], description: 'Rectangle' },
        { keys: ['O'], description: 'Ellipse / circle' },
        { keys: ['A'], description: 'Arrow' },
        { keys: ['L'], description: 'Line' },
        { keys: ['P'], description: 'Pencil (freedraw)' },
        { keys: ['T'], description: 'Text' },
        { keys: ['D'], description: 'Diamond' },
      ],
    },
    {
      heading: t('draw.help.edit'),
      rows: [
        { keys: ['mod+Z'], description: 'Undo' },
        { keys: ['mod+shift+Z'], description: 'Redo' },
        { keys: ['mod+D'], description: 'Duplicate' },
        { keys: ['Delete'], description: 'Remove' },
        { keys: ['mod+A'], description: 'Select all' },
        { keys: ['mod+C'], description: 'Copy' },
        { keys: ['mod+V'], description: 'Paste' },
      ],
    },
    {
      heading: t('draw.help.view'),
      rows: [
        { keys: ['mod++'], description: 'Zoom in' },
        { keys: ['mod+-'], description: 'Zoom out' },
        { keys: ['mod+0'], description: 'Reset zoom' },
        { keys: ['mod+1'], description: 'Fit to selection' },
      ],
    },
    {
      heading: t('draw.help.group'),
      rows: [
        { keys: ['mod+G'], description: 'Group' },
        { keys: ['mod+shift+G'], description: 'Ungroup' },
        { keys: ['mod+shift+H'], description: 'Flip horizontal' },
      ],
    },
    {
      heading: t('draw.help.style'),
      rows: [
        { keys: ['mod+shift+F'], description: 'Find' },
        { keys: ['['], description: 'Decrease stroke width' },
        { keys: [']'], description: 'Increase stroke width' },
      ],
    },
  ];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={640}
      title={t('draw.help.title')}
    >
      <Modal.Header title={t('draw.help.title')} />
      <Modal.Body>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--spacing-2xl)',
          }}
        >
          {sections.map((section) => (
            <div key={section.heading}>
              <h3
                style={{
                  margin: '0 0 var(--spacing-sm) 0',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {section.heading}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {section.rows.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--spacing-md)',
                      padding: '4px 0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      {row.description}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {row.keys.map((k, ki) => (
                        <Kbd key={ki} shortcut={k} variant="inline" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
}
