import { Outlet } from 'react-router-dom';
import { Shell } from '../../components/layout/Shell';
import { STUDIO_NAV } from '../../modules/registry';

export default function StudioLayout() {
  return <Shell nav={STUDIO_NAV} sidebarEyebrow="Produção criativa"><Outlet /></Shell>;
}
