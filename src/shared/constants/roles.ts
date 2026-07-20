export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERATOR: 'OPERATOR',
  CASHIER: 'CASHIER',
  // Restaurant staff roles
  SERVEUR: 'SERVEUR',
  BARMAN: 'BARMAN',
  CUISINIER: 'CUISINIER',
  CAISSIER_RESTO: 'CAISSIER_RESTO',
  // RH roles
  RH_MANAGER: 'RH_MANAGER',
  RH_AGENT: 'RH_AGENT',
  // Hotel roles
  HOTEL_MANAGER: 'HOTEL_MANAGER',
  RECEPTIONNISTE: 'RECEPTIONNISTE',
  GOUVERNANTE: 'GOUVERNANTE',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    'Super Admin',
  ADMIN:          'Administrateur',
  SUPERVISOR:     'Superviseur',
  OPERATOR:       'Opérateur',
  CASHIER:        'Caissier',
  SERVEUR:        'Serveur',
  BARMAN:         'Barman',
  CUISINIER:      'Cuisinier',
  CAISSIER_RESTO: 'Caissier Restaurant',
  RH_MANAGER:     'Responsable RH',
  RH_AGENT:       'Agent RH',
  HOTEL_MANAGER:  'Responsable Hôtel',
  RECEPTIONNISTE: 'Réceptionniste',
  GOUVERNANTE:    'Gouvernante',
};

export const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN:    5,
  ADMIN:          4,
  SUPERVISOR:     3,
  OPERATOR:       2,
  CASHIER:        1,
  SERVEUR:        1,
  BARMAN:         1,
  CUISINIER:      1,
  CAISSIER_RESTO: 1,
  RH_MANAGER:     2,
  RH_AGENT:       1,
  HOTEL_MANAGER:  2,
  RECEPTIONNISTE: 1,
  GOUVERNANTE:    1,
};
