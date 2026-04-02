import { useFreeBusy } from '../../hooks/use-calendar';

interface SchedulingAssistantProps {
  attendees: Array<{ email: string; name?: string }>;
  startTime: string;
  endTime: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_WIDTH = 40;
const ROW_HEIGHT = 28;
const LABEL_WIDTH = 150;
const totalWidth = 24 * HOUR_WIDTH;

function hourLabel(h: number): string {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function timeToX(iso: string): number {
  const d = new Date(iso);
  const hours = d.getHours() + d.getMinutes() / 60;
  return hours * HOUR_WIDTH;
}

export function SchedulingAssistant({ attendees, startTime, endTime }: SchedulingAssistantProps) {
  const dayStart = new Date(startTime);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const emails = attendees.map((a) => a.email);
  const { data: freeBusy, isLoading } = useFreeBusy(
    emails,
    dayStart.toISOString(),
    dayEnd.toISOString(),
  );

  const proposedLeft = timeToX(startTime);
  const proposedWidth = Math.max(timeToX(endTime) - proposedLeft, 2);

  if (isLoading) {
    return (
      <div
        style={{
          padding: 12,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Loading availability...
      </div>
    );
  }

  if (!freeBusy || emails.length === 0) {
    return (
      <div
        style={{
          padding: 12,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        Add attendees to see availability
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border-primary)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* Header row with hour labels */}
      <div style={{ display: 'flex' }}>
        <div
          style={{
            width: LABEL_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid var(--color-border-primary)',
            padding: '4px 8px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
          }}
        >
          Attendee
        </div>
        <div style={{ overflowX: 'hidden', width: totalWidth, flexShrink: 0 }}>
          <div style={{ display: 'flex', width: totalWidth }}>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{
                  width: HOUR_WIDTH,
                  flexShrink: 0,
                  fontSize: 9,
                  color: 'var(--color-text-tertiary)',
                  textAlign: 'center',
                  borderLeft: '1px solid var(--color-border-secondary)',
                  padding: '4px 0',
                }}
              >
                {hourLabel(h)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attendee rows */}
      <div style={{ overflowX: 'auto' }}>
        {attendees.map((att) => {
          const busyBlocks = freeBusy[att.email] || [];
          return (
            <div
              key={att.email}
              style={{
                display: 'flex',
                borderTop: '1px solid var(--color-border-primary)',
              }}
            >
              {/* Attendee label */}
              <div
                style={{
                  width: LABEL_WIDTH,
                  flexShrink: 0,
                  borderRight: '1px solid var(--color-border-primary)',
                  padding: '4px 8px',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: `${ROW_HEIGHT}px`,
                }}
              >
                {att.name || att.email}
              </div>

              {/* Timeline track */}
              <div
                style={{
                  position: 'relative',
                  width: totalWidth,
                  height: ROW_HEIGHT,
                  flexShrink: 0,
                  background: 'var(--color-bg-primary)',
                }}
              >
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: 'absolute',
                      left: h * HOUR_WIDTH,
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: 'var(--color-border-secondary)',
                      opacity: 0.5,
                    }}
                  />
                ))}

                {/* Busy blocks */}
                {busyBlocks.map((block, i) => {
                  const left = timeToX(block.start);
                  const width = Math.max(timeToX(block.end) - left, 2);
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left,
                        top: 2,
                        width,
                        height: ROW_HEIGHT - 4,
                        background: '#e67c73',
                        borderRadius: 2,
                        opacity: 0.7,
                      }}
                    />
                  );
                })}

                {/* Proposed meeting time overlay */}
                <div
                  style={{
                    position: 'absolute',
                    left: proposedLeft,
                    top: 0,
                    width: proposedWidth,
                    height: ROW_HEIGHT,
                    background: 'color-mix(in srgb, var(--color-accent-primary) 15%, transparent)',
                    borderLeft: '2px solid var(--color-accent-primary)',
                    borderRight: '2px solid var(--color-accent-primary)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
