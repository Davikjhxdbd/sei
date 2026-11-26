import { Outlet } from 'react-router-dom';
import { Shell } from '../../components/layout/Shell';

export default function StudioLayout() {
  return <Shell sectionLabel="Produção Criativa"><div className="mmv-workspace-content mmv-workspace-content--studio"><Outlet /></div></Shell>;
}
