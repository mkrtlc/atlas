/**
 * Inline SVG icons for marketplace apps.
 * Keyed by manifest ID so they render without any network requests.
 */

interface IconProps {
  size?: number;
  color?: string;
}

function MattermostIcon({ size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M249.99 16C126.04 16 16 120.32 16 250.01c0 46.43 14.55 91.59 42.19 129.37l-27.86 78.09a15.001 15.001 0 0 0 19.06 19.32l82.49-29.46C172.36 470.91 210.43 484 249.99 484 373.94 484 484 379.68 484 250.01 484 120.32 373.94 16 249.99 16Zm101.52 179.01-65.12 144.02c-4.72 10.45-19.89 10.21-24.27-.37l-25.51-61.6-61.59-25.51c-10.59-4.38-10.83-19.55-.38-24.27l144.02-65.12c9.12-4.13 19.04 5.72 14.98 14.97l-65.12 144.02 82.97-145.14Z"
        fill="#0058CC"
      />
    </svg>
  );
}

/** Map of manifest ID → React icon component */
export const APP_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  'com.atlas.mattermost': MattermostIcon,
};

/**
 * Render an app icon by manifest ID.
 * Returns null if no icon is available for the given ID.
 */
export function AppIcon({ manifestId, size = 24, color = '#fff' }: IconProps & { manifestId: string }) {
  const Icon = APP_ICONS[manifestId];
  if (!Icon) return null;
  return <Icon size={size} color={color} />;
}
