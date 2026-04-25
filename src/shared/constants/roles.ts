export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERATOR: 'OPERATOR',
  CASHIER: 'CASHIER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  SUPERVISOR: 'Superviseur',
  OPERATOR: 'Opérateur',
  CASHIER: 'Caissier',
};

export const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  SUPERVISOR: 3,
  OPERATOR: 2,
  CASHIER: 1,
};
