export type AppRole =
  | "super_admin"
  | "admin"
  | "comercial"
  | "colaborador"
  | "cliente";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole extends Profile {
  role: AppRole | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  comercial: "Comercial",
  colaborador: "Colaborador",
  cliente: "Cliente",
};

export const ROLE_PRECEDENCE: AppRole[] = [
  "super_admin",
  "admin",
  "comercial",
  "colaborador",
  "cliente",
];
