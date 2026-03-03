/**
 * Inline SVG icons for marketplace apps.
 * Keyed by manifest ID so they render without any network requests.
 */

interface IconProps {
  size?: number;
  color?: string;
}

/** Map of manifest ID → React icon component */
export const APP_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {};

/**
 * Render an app icon by manifest ID.
 * Returns null if no icon is available for the given ID.
 */
export function AppIcon({ manifestId, size = 24, color = '#fff' }: IconProps & { manifestId: string }) {
  const Icon = APP_ICONS[manifestId];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}
