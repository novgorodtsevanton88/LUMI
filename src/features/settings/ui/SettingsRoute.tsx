import { useChildren } from '@/features/children/hooks';
import { Settings } from './Settings';

export function SettingsRoute() {
  const list = useChildren();
  return <Settings children={Array.isArray(list) ? list : []} />;
}
