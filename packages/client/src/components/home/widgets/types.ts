import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface WidgetProps {
  width: number;
  height: number;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultEnabled: boolean;
  component: FC<WidgetProps>;
}
