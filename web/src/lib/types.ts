export interface Sector {
  id: string;
  name: string;
  key?: string;
  is_lead?: boolean;
}

export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  status: string;
  roles: string[];
  level: number;
  sectors: Sector[];
  created_at: string;
  last_login_at: string | null;
}

export interface ModuleRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  route: string;
  sort_order: number;
  settings: Record<string, unknown>;
}

export interface Bootstrap {
  user: User;
  modules: ModuleRecord[];
  permissions: string[];
  actionLevels: Record<string, number>;
  notifications: { unread: number };
}
