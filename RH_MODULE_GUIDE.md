# Guide — Module RH (Ressources Humaines)

Ce guide documente le module RH complet : architecture, fonctionnalités, schéma de base de données,
et le système de pointage par QR Code.

---

## Table des Matières

1. [Architecture d'un module](#1-architecture-dun-module)
2. [Fonctionnalités couvertes par le module RH](#2-fonctionnalités-couvertes-par-le-module-rh)
3. [Schéma de base de données](#3-schéma-de-base-de-données)
4. [Étape 1 — Créer la structure de dossiers](#étape-1--créer-la-structure-de-dossiers)
5. [Étape 2 — manifest.json](#étape-2--manifestjson)
6. [Étape 3 — permissions.js](#étape-3--permissionsjs)
7. [Étape 4 — hooks.js](#étape-4--hooksjs)
8. [Étape 5 — Validators](#étape-5--validators)
9. [Étape 6 — Services](#étape-6--services)
10. [Étape 7 — Controllers](#étape-7--controllers)
11. [Étape 8 — Routes](#étape-8--routes)
12. [Étape 9 — index.js du module](#étape-9--indexjs-du-module)
13. [Étape 10 — Prisma Schema & Index](#étape-10--prisma-schema--index)
14. [Système de pointage QR Code](#14-système-de-pointage-qr-code)
15. [Comment le module se charge automatiquement](#15-comment-le-module-se-charge-automatiquement)
16. [Checklist de validation](#16-checklist-de-validation)

---

## 1. Architecture d'un module

Le `ModuleLoader` parcourt automatiquement le dossier `src/modules/` au démarrage.
Pour chaque sous-dossier trouvé, il cherche dans cet ordre :

```
src/modules/{nom}/
├── index.js          ← Point d'entrée (obligatoire)
├── manifest.json     ← Métadonnées (recommandé)
├── permissions.js    ← Enregistrement des permissions (recommandé)
├── hooks.js          ← Effets de bord / événements (optionnel)
├── controllers/      ← Logique HTTP
├── services/         ← Logique métier
├── validators/       ← Règles express-validator
└── routes/           ← Définition des routes Express
```

**Middleware stack appliqué automatiquement à chaque route du module :**

```
authenticate → companyIsolation → requireModule('rh') → router
```

- `authenticate` : vérifie le JWT et injecte `req.user`
- `companyIsolation` : injecte `req.companyId` (multi-tenant)
- `requireModule('rh')` : vérifie que l'abonnement de l'entreprise inclut le module RH

---

## 2. Fonctionnalités couvertes par le module RH

| Sous-domaine | Description |
|---|---|
| **Employés** | Fiche employé, contrat, poste, département |
| **Présences** | Pointage entrée/sortie, calcul d'heures |
| **Pointage QR Code** | Badge QR par employé, borne de pointage web, scan caméra ou saisie manuelle |
| **Congés** | Demande, validation, solde de congés |
| **Paie** | Génération des bulletins, primes, retenues |
| **Départements** | Organisation hiérarchique, manager assigné |
| **Dashboard** | KPIs RH : effectif, absences, coût salarial, congés en attente |
| **Exports** | CSV/JSON pour employés, présences, bulletins de paie |

---

## 3. Schéma de base de données

Ajouter ces modèles dans `prisma/schema.prisma` :

```prisma
// ─── RH : Départements ────────────────────────────────────────────────────────
model RhDepartment {
  id          String        @id @default(uuid())
  companyId   String
  name        String
  description String?
  managerId   String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  company     Company       @relation(fields: [companyId], references: [id])
  employees   RhEmployee[]

  @@index([companyId])
  @@index([companyId, isActive])
}

// ─── RH : Employés ────────────────────────────────────────────────────────────
model RhEmployee {
  id               String           @id @default(uuid())
  companyId        String
  employeeNumber   String
  firstName        String
  lastName         String
  email            String?
  phone            String?
  address          String?
  dateOfBirth      DateTime?
  hireDate         DateTime
  endDate          DateTime?
  position         String
  departmentId     String?
  contractType     String           @default("CDI")   // CDI, CDD, STAGE, FREELANCE
  baseSalary       Decimal          @default(0)
  status           String           @default("ACTIF")  // ACTIF, SUSPENDU, INACTIF
  userId           String?          // lien vers User si compte système
  qrToken          String?          @unique             // token unique pour le pointage QR Code
  createdBy        String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  company          Company          @relation(fields: [companyId], references: [id])
  department       RhDepartment?    @relation(fields: [departmentId], references: [id])
  attendances      RhAttendance[]
  leaveRequests    RhLeaveRequest[]
  payslips         RhPayslip[]

  @@unique([companyId, employeeNumber])
  @@index([companyId])
  @@index([companyId, status])
  @@index([companyId, departmentId])
  @@index([companyId, lastName, firstName])
}

// ─── RH : Présences ───────────────────────────────────────────────────────────
model RhAttendance {
  id           String      @id @default(uuid())
  companyId    String
  employeeId   String
  date         DateTime
  checkIn      DateTime?
  checkOut     DateTime?
  hoursWorked  Decimal?
  status       String      @default("PRESENT")   // PRESENT, ABSENT, RETARD, CONGE
  notes        String?
  recordedBy   String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  company      Company     @relation(fields: [companyId], references: [id])
  employee     RhEmployee  @relation(fields: [employeeId], references: [id])

  @@unique([companyId, employeeId, date])
  @@index([companyId, date])
  @@index([companyId, employeeId])
  @@index([companyId, employeeId, date])
  @@index([companyId, status, date])
}

// ─── RH : Congés ──────────────────────────────────────────────────────────────
model RhLeaveRequest {
  id            String      @id @default(uuid())
  companyId     String
  employeeId    String
  type          String                               // ANNUEL, MALADIE, MATERNITE, SANS_SOLDE
  startDate     DateTime
  endDate       DateTime
  days          Int
  reason        String?
  status        String      @default("EN_ATTENTE")  // EN_ATTENTE, APPROUVE, REFUSE
  approvedBy    String?
  approvedAt    DateTime?
  refusedBy     String?
  refusedAt     DateTime?
  refusalReason String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  company       Company     @relation(fields: [companyId], references: [id])
  employee      RhEmployee  @relation(fields: [employeeId], references: [id])

  @@index([companyId])
  @@index([companyId, status])
  @@index([companyId, employeeId])
  @@index([companyId, startDate, endDate])
}

// ─── RH : Bulletins de paie ───────────────────────────────────────────────────
model RhPayslip {
  id              String           @id @default(uuid())
  companyId       String
  employeeId      String
  payslipNumber   String
  period          String                               // "2026-07" (YYYY-MM)
  baseSalary      Decimal
  grossSalary     Decimal
  netSalary       Decimal
  totalDeductions Decimal          @default(0)
  totalBonuses    Decimal          @default(0)
  status          String           @default("BROUILLON") // BROUILLON, VALIDE, PAYE
  paidAt          DateTime?
  paidBy          String?
  generatedBy     String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  company         Company          @relation(fields: [companyId], references: [id])
  employee        RhEmployee       @relation(fields: [employeeId], references: [id])
  items           RhPayslipItem[]

  @@unique([companyId, employeeId, period])
  @@index([companyId])
  @@index([companyId, period])
  @@index([companyId, status])
  @@index([companyId, employeeId])
}

// ─── RH : Lignes de bulletin ──────────────────────────────────────────────────
model RhPayslipItem {
  id          String     @id @default(uuid())
  payslipId   String
  type        String                    // SALAIRE_BASE, PRIME, HEURE_SUP, COTISATION, IMPOT, ABSENCE
  label       String
  amount      Decimal
  isDeduction Boolean    @default(false)
  sequence    Int        @default(0)
  payslip     RhPayslip  @relation(fields: [payslipId], references: [id])

  @@index([payslipId])
}
```

### Pourquoi ces index ?

| Index | Justification |
|---|---|
| `[companyId]` | Toutes les requêtes filtrent sur companyId (multi-tenant) |
| `[companyId, status]` | Listes filtrées par statut (employés actifs, congés en attente, bulletins validés) |
| `[companyId, employeeId, date]` unique sur Attendance | Empêche le double pointage le même jour |
| `[companyId, employeeId, period]` unique sur Payslip | Empêche la génération en doublon d'un bulletin |
| `[companyId, lastName, firstName]` | Recherche textuelle sur les noms |
| `[companyId, startDate, endDate]` sur Leave | Détection de chevauchements de congés |
| `[companyId, period]` sur Payslip | Extraction de la masse salariale par période |

> Après avoir ajouté ces modèles, exécuter : `npx prisma migrate dev --name add_rh_module`

---

## Étape 1 — Créer la structure de dossiers

```
src/modules/rh/
├── index.js
├── manifest.json
├── permissions.js
├── hooks.js
├── controllers/
│   ├── employee.controller.js
│   ├── attendance.controller.js
│   ├── leave.controller.js
│   ├── payslip.controller.js
│   ├── department.controller.js
│   ├── export.controller.js
│   └── dashboard.controller.js
├── services/
│   ├── employee.service.js
│   ├── attendance.service.js
│   ├── leave.service.js
│   ├── payslip.service.js
│   ├── department.service.js
│   ├── export.service.js
│   └── dashboard.service.js
├── validators/
│   ├── employee.validator.js
│   ├── attendance.validator.js
│   ├── leave.validator.js
│   ├── department.validator.js
│   └── payslip.validator.js
└── routes/
    ├── index.js
    ├── employee.routes.js
    ├── attendance.routes.js
    ├── leave.routes.js
    ├── payslip.routes.js
    ├── department.routes.js
    ├── export.routes.js
    └── dashboard.routes.js
```

---

## Étape 2 — manifest.json

```json
{
  "name": "rh",
  "version": "1.0.0",
  "displayName": "Module Ressources Humaines",
  "description": "Gestion complète des employés, présences, congés et paie",
  "author": "Mukapps Team",
  "dependencies": [],
  "requiredSubscription": "rh",
  "routes": {
    "prefix": "/api/rh",
    "public": []
  }
}
```

---

## Étape 3 — permissions.js

```js
// src/modules/rh/permissions.js
const { registerPermissions } = require('../../core/permissions/registry');

const RH_PERMISSIONS = [
  // Employés
  'view_employees',
  'create_employee',
  'update_employee',
  'delete_employee',
  // Présences
  'view_attendance',
  'record_attendance',
  'edit_attendance',
  // Congés
  'view_leaves',
  'request_leave',
  'approve_leave',
  'refuse_leave',
  // Paie
  'view_payslips',
  'generate_payslip',
  'validate_payslip',
  'mark_paid',
  // Départements
  'view_departments',
  'manage_departments',
  // Exports
  'export_data',
  // Rapports / Dashboard
  'view_dashboard',
  'view_reports',
];

registerPermissions('rh', RH_PERMISSIONS);

module.exports = { RH_PERMISSIONS };
```

---

## Étape 4 — hooks.js

Les hooks réagissent aux événements d'autres modules ou publient des événements consommables.

```js
// src/modules/rh/hooks.js
const hookManager = require('../../core/hookManager');
const eventBus = require('../../core/eventBus');
const prisma = require('../../core/prisma');

// Quand un congé est approuvé, créer les absences dans le pointage
hookManager.register('rh:leave:afterApprove', async (context) => {
  const { leave } = context;

  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const records = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Ignorer les week-ends (0 = dimanche, 6 = samedi)
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      records.push({
        companyId: leave.companyId,
        employeeId: leave.employeeId,
        date: new Date(d),
        status: 'CONGE',
        notes: `Congé ${leave.type} approuvé`,
      });
    }
  }

  if (records.length > 0) {
    await prisma.rhAttendance.createMany({ data: records, skipDuplicates: true }).catch(() => {});
  }

  eventBus.publish('rh:leave_approved', { leave });
  return context;
});

// Quand un bulletin est validé, notifier le tableau de bord
hookManager.register('rh:payslip:afterValidate', async (context) => {
  const { payslip } = context;
  eventBus.publish('rh:payslip_validated', {
    payslipId: payslip.id,
    employeeId: payslip.employeeId,
    netSalary: payslip.netSalary,
  });
  return context;
});

module.exports = { initialize: () => {} };
```

---

## Étape 5 — Validators

### employee.validator.js

```js
// src/modules/rh/validators/employee.validator.js
const { body, param, query } = require('express-validator');

const CONTRACT_TYPES = ['CDI', 'CDD', 'STAGE', 'FREELANCE'];
const EMPLOYEE_STATUSES = ['ACTIF', 'SUSPENDU', 'INACTIF'];

const createEmployeeRules = [
  body('firstName').notEmpty().withMessage('firstName est requis').isLength({ max: 100 }),
  body('lastName').notEmpty().withMessage('lastName est requis').isLength({ max: 100 }),
  body('hireDate').notEmpty().withMessage('hireDate est requis').isDate().withMessage('hireDate doit être YYYY-MM-DD'),
  body('position').notEmpty().withMessage('position est requise').isLength({ max: 100 }),
  body('baseSalary').notEmpty().withMessage('baseSalary est requis').isFloat({ min: 0 }),
  body('contractType').optional().isIn(CONTRACT_TYPES).withMessage(`contractType invalide. Valeurs: ${CONTRACT_TYPES.join(', ')}`),
  body('email').optional({ nullable: true }).isEmail().withMessage('email invalide'),
  body('phone').optional({ nullable: true }).isLength({ max: 30 }),
  body('departmentId').optional({ nullable: true }).isUUID().withMessage('departmentId invalide'),
  body('dateOfBirth').optional({ nullable: true }).isDate().withMessage('dateOfBirth doit être YYYY-MM-DD'),
];

const updateEmployeeRules = [
  param('id').isUUID().withMessage('employeeId invalide'),
  body('firstName').optional().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isLength({ min: 1, max: 100 }),
  body('position').optional().isLength({ min: 1, max: 100 }),
  body('baseSalary').optional().isFloat({ min: 0 }),
  body('contractType').optional().isIn(CONTRACT_TYPES),
  body('status').optional().isIn(EMPLOYEE_STATUSES),
  body('departmentId').optional({ nullable: true }).isUUID(),
  body('email').optional({ nullable: true }).isEmail(),
  body('endDate').optional({ nullable: true }).isDate(),
];

module.exports = { createEmployeeRules, updateEmployeeRules, CONTRACT_TYPES, EMPLOYEE_STATUSES };
```

### attendance.validator.js

```js
// src/modules/rh/validators/attendance.validator.js
const { body, param } = require('express-validator');

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'RETARD', 'CONGE'];

const recordAttendanceRules = [
  body('employeeId').notEmpty().withMessage('employeeId est requis').isUUID(),
  body('date').notEmpty().withMessage('date est requise').isDate().withMessage('date doit être YYYY-MM-DD'),
  body('checkIn').optional({ nullable: true }).isISO8601().withMessage('checkIn invalide (ISO 8601)'),
  body('checkOut').optional({ nullable: true }).isISO8601().withMessage('checkOut invalide (ISO 8601)'),
  body('status').optional().isIn(ATTENDANCE_STATUSES).withMessage(`status invalide. Valeurs: ${ATTENDANCE_STATUSES.join(', ')}`),
  body('notes').optional({ nullable: true }).isLength({ max: 500 }),
];

const updateAttendanceRules = [
  param('id').isUUID().withMessage('attendanceId invalide'),
  body('checkIn').optional({ nullable: true }).isISO8601(),
  body('checkOut').optional({ nullable: true }).isISO8601(),
  body('status').optional().isIn(ATTENDANCE_STATUSES),
  body('notes').optional({ nullable: true }).isLength({ max: 500 }),
];

module.exports = { recordAttendanceRules, updateAttendanceRules, ATTENDANCE_STATUSES };
```

### leave.validator.js

```js
// src/modules/rh/validators/leave.validator.js
const { body, param } = require('express-validator');

const LEAVE_TYPES = ['ANNUEL', 'MALADIE', 'MATERNITE', 'SANS_SOLDE', 'AUTRE'];

const createLeaveRules = [
  body('employeeId').notEmpty().withMessage('employeeId est requis').isUUID(),
  body('type').notEmpty().withMessage('type est requis').isIn(LEAVE_TYPES).withMessage(`type invalide. Valeurs: ${LEAVE_TYPES.join(', ')}`),
  body('startDate').notEmpty().withMessage('startDate est requise').isDate(),
  body('endDate').notEmpty().withMessage('endDate est requise').isDate(),
  body('reason').optional({ nullable: true }).isLength({ max: 500 }),
];

const approveLeaveRules = [
  param('id').isUUID().withMessage('leaveId invalide'),
];

const refuseLeaveRules = [
  param('id').isUUID().withMessage('leaveId invalide'),
  body('refusalReason').notEmpty().withMessage('refusalReason est requis').isLength({ max: 500 }),
];

module.exports = { createLeaveRules, approveLeaveRules, refuseLeaveRules, LEAVE_TYPES };
```

### department.validator.js

```js
// src/modules/rh/validators/department.validator.js
const { body, param } = require('express-validator');

const createDepartmentRules = [
  body('name')
    .notEmpty().withMessage('name est requis')
    .isString().isLength({ max: 100 }).withMessage('name trop long (max 100)'),
  body('description')
    .optional({ nullable: true })
    .isString().isLength({ max: 500 }).withMessage('description trop longue (max 500)'),
  body('managerId')
    .optional({ nullable: true })
    .isUUID().withMessage('managerId invalide'),
];

const updateDepartmentRules = [
  param('id').isUUID().withMessage('departmentId invalide'),
  body('name').optional().isString().isLength({ min: 1, max: 100 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 500 }),
  body('managerId').optional({ nullable: true }).isUUID(),
  body('isActive').optional().isBoolean().withMessage('isActive doit être un booléen'),
];

module.exports = { createDepartmentRules, updateDepartmentRules };
```

### payslip.validator.js

```js
// src/modules/rh/validators/payslip.validator.js
const { body, param } = require('express-validator');

const PAYSLIP_ITEM_TYPES = ['SALAIRE_BASE', 'PRIME', 'HEURE_SUP', 'COTISATION', 'IMPOT', 'ABSENCE'];

const generatePayslipRules = [
  body('employeeId').notEmpty().withMessage('employeeId est requis').isUUID(),
  body('period')
    .notEmpty().withMessage('period est requis')
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage('period doit être au format YYYY-MM'),
  body('bonuses').optional().isArray(),
  body('bonuses.*.label').optional().notEmpty().isLength({ max: 100 }),
  body('bonuses.*.amount').optional().isFloat({ min: 0 }),
  body('deductions').optional().isArray(),
  body('deductions.*.label').optional().notEmpty().isLength({ max: 100 }),
  body('deductions.*.amount').optional().isFloat({ min: 0 }),
];

const addPayslipItemRules = [
  param('id').isUUID().withMessage('payslipId invalide'),
  body('type').notEmpty().withMessage('type est requis').isIn(PAYSLIP_ITEM_TYPES),
  body('label').notEmpty().withMessage('label est requis').isLength({ max: 100 }),
  body('amount').notEmpty().withMessage('amount est requis').isFloat({ min: 0 }),
  body('isDeduction').optional().isBoolean(),
];

module.exports = { generatePayslipRules, addPayslipItemRules, PAYSLIP_ITEM_TYPES };
```

---

## Étape 6 — Services

### employee.service.js

```js
// src/modules/rh/services/employee.service.js
const prisma = require('../../../core/prisma');
const { NotFoundError, ConflictError, ValidationError } = require('../../../core/utils/errors');

class EmployeeService {
  async _generateEmployeeNumber(companyId) {
    const count = await prisma.rhEmployee.count({ where: { companyId } });
    return `EMP${String(count + 1).padStart(5, '0')}`;
  }

  async list(companyId, filters = {}) {
    const { status, departmentId, search, page = 1, limit = 50 } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };

    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { employeeNumber: { contains: search } },
        { position: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      prisma.rhEmployee.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { lastName: 'asc' },
        include: { department: { select: { id: true, name: true } } },
      }),
      prisma.rhEmployee.count({ where }),
    ]);

    return {
      employees,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    };
  }

  async getOne(companyId, id) {
    const employee = await prisma.rhEmployee.findFirst({
      where: { id, companyId },
      include: {
        department: true,
        attendances: { orderBy: { date: 'desc' }, take: 10 },
        leaveRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
        payslips: {
          orderBy: { period: 'desc' },
          take: 6,
          select: { id: true, period: true, netSalary: true, status: true },
        },
      },
    });
    if (!employee) throw new NotFoundError('Employé non trouvé');
    return employee;
  }

  async create(companyId, data, userId) {
    const employeeNumber = await this._generateEmployeeNumber(companyId);

    return prisma.rhEmployee.create({
      data: {
        companyId,
        employeeNumber,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        hireDate: new Date(data.hireDate),
        position: data.position.trim(),
        departmentId: data.departmentId || null,
        contractType: data.contractType || 'CDI',
        baseSalary: parseFloat(data.baseSalary),
        createdBy: userId,
      },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  async update(companyId, id, data) {
    await this.getOne(companyId, id);
    const update = {};

    if (data.firstName !== undefined) update.firstName = data.firstName.trim();
    if (data.lastName !== undefined) update.lastName = data.lastName.trim();
    if (data.email !== undefined) update.email = data.email;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.position !== undefined) update.position = data.position.trim();
    if (data.baseSalary !== undefined) update.baseSalary = parseFloat(data.baseSalary);
    if (data.contractType !== undefined) update.contractType = data.contractType;
    if (data.status !== undefined) update.status = data.status;
    if (data.departmentId !== undefined) update.departmentId = data.departmentId;
    if (data.endDate !== undefined) update.endDate = data.endDate ? new Date(data.endDate) : null;

    return prisma.rhEmployee.update({ where: { id }, data: update });
  }
}

module.exports = new EmployeeService();
```

### department.service.js

```js
// src/modules/rh/services/department.service.js
const prisma = require('../../../core/prisma');
const { NotFoundError, ConflictError } = require('../../../core/utils/errors');

class DepartmentService {
  async list(companyId, filters = {}) {
    const { isActive } = filters;
    const where = { companyId };
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

    const departments = await prisma.rhDepartment.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: { where: { status: 'ACTIF' } } } },
      },
    });

    return departments.map(d => ({
      ...d,
      activeEmployeeCount: d._count.employees,
      _count: undefined,
    }));
  }

  async getOne(companyId, id) {
    const dept = await prisma.rhDepartment.findFirst({
      where: { id, companyId },
      include: {
        employees: {
          where: { status: 'ACTIF' },
          select: { id: true, firstName: true, lastName: true, position: true, employeeNumber: true },
          orderBy: { lastName: 'asc' },
        },
      },
    });
    if (!dept) throw new NotFoundError('Département non trouvé');
    return dept;
  }

  async create(companyId, data, userId) {
    const existing = await prisma.rhDepartment.findFirst({
      where: { companyId, name: { equals: data.name.trim() } },
    });
    if (existing) throw new ConflictError(`Un département "${data.name}" existe déjà`);

    if (data.managerId) {
      const manager = await prisma.rhEmployee.findFirst({
        where: { id: data.managerId, companyId },
      });
      if (!manager) throw new NotFoundError('Employé manager non trouvé');
    }

    return prisma.rhDepartment.create({
      data: {
        companyId,
        name: data.name.trim(),
        description: data.description || null,
        managerId: data.managerId || null,
      },
    });
  }

  async update(companyId, id, data) {
    await this.getOne(companyId, id);

    if (data.managerId) {
      const manager = await prisma.rhEmployee.findFirst({
        where: { id: data.managerId, companyId },
      });
      if (!manager) throw new NotFoundError('Employé manager non trouvé');
    }

    const update = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.description !== undefined) update.description = data.description;
    if (data.managerId !== undefined) update.managerId = data.managerId;
    if (data.isActive !== undefined) update.isActive = data.isActive;

    return prisma.rhDepartment.update({ where: { id }, data: update });
  }
}

module.exports = new DepartmentService();
```

### leave.service.js

```js
// src/modules/rh/services/leave.service.js
const prisma = require('../../../core/prisma');
const { NotFoundError, ValidationError } = require('../../../core/utils/errors');
const hookManager = require('../../../core/hookManager');

class LeaveService {
  _calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let days = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) days++;
    }
    return days;
  }

  async list(companyId, filters = {}) {
    const { status, employeeId, type, page = 1, limit = 50 } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { companyId };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (type) where.type = type;

    const [leaves, total] = await Promise.all([
      prisma.rhLeaveRequest.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, position: true } },
        },
      }),
      prisma.rhLeaveRequest.count({ where }),
    ]);

    return { leaves, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) };
  }

  async create(companyId, data, userId) {
    const employee = await prisma.rhEmployee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) throw new NotFoundError('Employé non trouvé');

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) throw new ValidationError('endDate doit être après startDate');

    const days = this._calculateDays(start, end);

    const overlap = await prisma.rhLeaveRequest.findFirst({
      where: {
        companyId,
        employeeId: data.employeeId,
        status: { not: 'REFUSE' },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) throw new ValidationError('Un congé existe déjà sur cette période');

    return prisma.rhLeaveRequest.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        type: data.type,
        startDate: start,
        endDate: end,
        days,
        reason: data.reason || null,
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });
  }

  async approve(companyId, id, userId) {
    const leave = await prisma.rhLeaveRequest.findFirst({ where: { id, companyId } });
    if (!leave) throw new NotFoundError('Demande de congé non trouvée');
    if (leave.status !== 'EN_ATTENTE') throw new ValidationError('Seules les demandes en attente peuvent être approuvées');

    const updated = await prisma.rhLeaveRequest.update({
      where: { id },
      data: { status: 'APPROUVE', approvedBy: userId, approvedAt: new Date() },
    });

    await hookManager.execute('rh:leave:afterApprove', { companyId, leave: updated, userId });
    return updated;
  }

  async refuse(companyId, id, reason, userId) {
    const leave = await prisma.rhLeaveRequest.findFirst({ where: { id, companyId } });
    if (!leave) throw new NotFoundError('Demande de congé non trouvée');
    if (leave.status !== 'EN_ATTENTE') throw new ValidationError('Seules les demandes en attente peuvent être refusées');

    return prisma.rhLeaveRequest.update({
      where: { id },
      data: { status: 'REFUSE', refusedBy: userId, refusedAt: new Date(), refusalReason: reason },
    });
  }
}

module.exports = new LeaveService();
```

### payslip.service.js

```js
// src/modules/rh/services/payslip.service.js
const prisma = require('../../../core/prisma');
const { NotFoundError, ConflictError, ValidationError } = require('../../../core/utils/errors');
const hookManager = require('../../../core/hookManager');

class PayslipService {
  async _generatePayslipNumber(companyId) {
    const count = await prisma.rhPayslip.count({ where: { companyId } });
    const date = new Date();
    const yymm = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `BS${yymm}${String(count + 1).padStart(4, '0')}`;
  }

  async generate(companyId, data, userId) {
    const employee = await prisma.rhEmployee.findFirst({ where: { id: data.employeeId, companyId } });
    if (!employee) throw new NotFoundError('Employé non trouvé');

    const existing = await prisma.rhPayslip.findFirst({
      where: { companyId, employeeId: data.employeeId, period: data.period },
    });
    if (existing) throw new ConflictError(`Un bulletin existe déjà pour ${data.period}`);

    const bonuses = data.bonuses || [];
    const deductions = data.deductions || [];
    const baseSalary = parseFloat(employee.baseSalary);
    const totalBonuses = bonuses.reduce((s, b) => s + parseFloat(b.amount), 0);
    const totalDeductions = deductions.reduce((s, d) => s + parseFloat(d.amount), 0);
    const grossSalary = baseSalary + totalBonuses;
    const netSalary = grossSalary - totalDeductions;
    const payslipNumber = await this._generatePayslipNumber(companyId);

    const items = [
      { type: 'SALAIRE_BASE', label: 'Salaire de base', amount: baseSalary, isDeduction: false, sequence: 0 },
      ...bonuses.map((b, i) => ({ type: 'PRIME', label: b.label, amount: parseFloat(b.amount), isDeduction: false, sequence: i + 1 })),
      ...deductions.map((d, i) => ({ type: 'COTISATION', label: d.label, amount: parseFloat(d.amount), isDeduction: true, sequence: bonuses.length + i + 1 })),
    ];

    return prisma.rhPayslip.create({
      data: {
        companyId,
        employeeId: data.employeeId,
        payslipNumber,
        period: data.period,
        baseSalary,
        grossSalary,
        netSalary,
        totalBonuses,
        totalDeductions,
        generatedBy: userId,
        items: { create: items },
      },
      include: {
        items: { orderBy: { sequence: 'asc' } },
        employee: { select: { firstName: true, lastName: true, position: true } },
      },
    });
  }

  async validate(companyId, id, userId) {
    const payslip = await prisma.rhPayslip.findFirst({ where: { id, companyId } });
    if (!payslip) throw new NotFoundError('Bulletin non trouvé');
    if (payslip.status !== 'BROUILLON') throw new ValidationError('Seuls les bulletins en brouillon peuvent être validés');

    const updated = await prisma.rhPayslip.update({ where: { id }, data: { status: 'VALIDE' } });
    await hookManager.execute('rh:payslip:afterValidate', { companyId, payslip: updated, userId });
    return updated;
  }

  async markPaid(companyId, id, userId) {
    const payslip = await prisma.rhPayslip.findFirst({ where: { id, companyId } });
    if (!payslip) throw new NotFoundError('Bulletin non trouvé');
    if (payslip.status !== 'VALIDE') throw new ValidationError('Le bulletin doit être validé avant d\'être marqué payé');

    return prisma.rhPayslip.update({
      where: { id },
      data: { status: 'PAYE', paidAt: new Date(), paidBy: userId },
    });
  }
}

module.exports = new PayslipService();
```

### dashboard.service.js

```js
// src/modules/rh/services/dashboard.service.js
const prisma = require('../../../core/prisma');

class DashboardService {
  async getSummary(companyId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      leavesToday,
      absentToday,
      payslipsPeriod,
      masseSalariale,
      byDepartment,
      byContract,
    ] = await Promise.all([
      // Effectif total
      prisma.rhEmployee.count({ where: { companyId } }),

      // Effectif actif
      prisma.rhEmployee.count({ where: { companyId, status: 'ACTIF' } }),

      // Congés en attente d'approbation
      prisma.rhLeaveRequest.count({ where: { companyId, status: 'EN_ATTENTE' } }),

      // Employés en congé aujourd'hui
      prisma.rhLeaveRequest.count({
        where: {
          companyId,
          status: 'APPROUVE',
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),

      // Absents aujourd'hui (pointage)
      prisma.rhAttendance.count({
        where: {
          companyId,
          date: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
          status: 'ABSENT',
        },
      }),

      // Bulletins du mois courant
      prisma.rhPayslip.count({ where: { companyId, period: currentPeriod } }),

      // Masse salariale du mois courant (bulletins validés ou payés)
      prisma.rhPayslip.aggregate({
        where: { companyId, period: currentPeriod, status: { in: ['VALIDE', 'PAYE'] } },
        _sum: { netSalary: true, grossSalary: true },
      }),

      // Effectif par département
      prisma.rhDepartment.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          _count: { select: { employees: { where: { status: 'ACTIF' } } } },
        },
        orderBy: { name: 'asc' },
      }),

      // Répartition par type de contrat
      prisma.rhEmployee.groupBy({
        by: ['contractType'],
        where: { companyId, status: 'ACTIF' },
        _count: { id: true },
      }),
    ]);

    return {
      effectif: {
        total: totalEmployees,
        actif: activeEmployees,
        enCongeAujourdhui: leavesToday,
        absentsAujourdhui: absentToday,
      },
      conges: {
        enAttente: pendingLeaves,
      },
      paie: {
        periode: currentPeriod,
        bulletinsGeneres: payslipsPeriod,
        masseNetSalariale: parseFloat(masseSalariale._sum.netSalary || 0),
        masseGrossSalariale: parseFloat(masseSalariale._sum.grossSalary || 0),
      },
      parDepartement: byDepartment.map(d => ({
        id: d.id,
        name: d.name,
        effectif: d._count.employees,
      })),
      parTypeContrat: byContract.map(c => ({
        contractType: c.contractType,
        count: c._count.id,
      })),
    };
  }

  async getAttendanceStats(companyId, filters = {}) {
    const { month, year } = filters;
    const y = parseInt(year || new Date().getFullYear());
    const m = parseInt(month || new Date().getMonth() + 1);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const stats = await prisma.rhAttendance.groupBy({
      by: ['status'],
      where: { companyId, date: { gte: startDate, lte: endDate } },
      _count: { id: true },
    });

    const total = stats.reduce((s, r) => s + r._count.id, 0);
    return {
      period: `${y}-${String(m).padStart(2, '0')}`,
      total,
      byStatus: stats.map(s => ({ status: s.status, count: s._count.id })),
    };
  }

  async getPayrollEvolution(companyId, months = 6) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const agg = await prisma.rhPayslip.aggregate({
        where: { companyId, period, status: { in: ['VALIDE', 'PAYE'] } },
        _sum: { netSalary: true },
        _count: { id: true },
      });

      results.push({
        period,
        masseNette: parseFloat(agg._sum.netSalary || 0),
        bulletins: agg._count.id,
      });
    }

    return results;
  }
}

module.exports = new DashboardService();
```

### export.service.js

```js
// src/modules/rh/services/export.service.js
const prisma = require('../../../core/prisma');
const { ValidationError } = require('../../../core/utils/errors');

class ExportService {
  _toCSV(rows, columns) {
    const header = columns.map(c => c.label).join(',');
    const lines = rows.map(row =>
      columns.map(c => {
        const val = row[c.key] ?? '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      }).join(',')
    );
    return [header, ...lines].join('\n');
  }

  async exportEmployees(companyId, filters = {}) {
    const { status, departmentId } = filters;
    const where = { companyId };
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const employees = await prisma.rhEmployee.findMany({
      where,
      orderBy: { lastName: 'asc' },
      include: { department: { select: { name: true } } },
    });

    const columns = [
      { key: 'employeeNumber', label: 'Matricule' },
      { key: 'lastName',       label: 'Nom' },
      { key: 'firstName',      label: 'Prénom' },
      { key: 'position',       label: 'Poste' },
      { key: 'department',     label: 'Département' },
      { key: 'contractType',   label: 'Contrat' },
      { key: 'baseSalary',     label: 'Salaire de base' },
      { key: 'status',         label: 'Statut' },
      { key: 'hireDate',       label: 'Date embauche' },
      { key: 'email',          label: 'Email' },
      { key: 'phone',          label: 'Téléphone' },
    ];

    const rows = employees.map(e => ({
      ...e,
      department: e.department?.name || '',
      baseSalary: parseFloat(e.baseSalary),
      hireDate: e.hireDate ? e.hireDate.toISOString().split('T')[0] : '',
    }));

    return { csv: this._toCSV(rows, columns), count: rows.length };
  }

  async exportAttendance(companyId, filters = {}) {
    const { month, year, employeeId } = filters;
    if (!month || !year) throw new ValidationError('month et year sont requis pour l\'export présences');

    const y = parseInt(year);
    const m = parseInt(month);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const where = { companyId, date: { gte: startDate, lte: endDate } };
    if (employeeId) where.employeeId = employeeId;

    const records = await prisma.rhAttendance.findMany({
      where,
      orderBy: [{ date: 'asc' }, { employee: { lastName: 'asc' } }],
      include: {
        employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
      },
    });

    const columns = [
      { key: 'date',           label: 'Date' },
      { key: 'matricule',      label: 'Matricule' },
      { key: 'nom',            label: 'Nom' },
      { key: 'prenom',         label: 'Prénom' },
      { key: 'checkIn',        label: 'Entrée' },
      { key: 'checkOut',       label: 'Sortie' },
      { key: 'hoursWorked',    label: 'Heures travaillées' },
      { key: 'status',         label: 'Statut' },
    ];

    const rows = records.map(r => ({
      date:        r.date.toISOString().split('T')[0],
      matricule:   r.employee.employeeNumber,
      nom:         r.employee.lastName,
      prenom:      r.employee.firstName,
      checkIn:     r.checkIn ? r.checkIn.toISOString().replace('T', ' ').substring(0, 16) : '',
      checkOut:    r.checkOut ? r.checkOut.toISOString().replace('T', ' ').substring(0, 16) : '',
      hoursWorked: r.hoursWorked ? parseFloat(r.hoursWorked) : '',
      status:      r.status,
    }));

    return { csv: this._toCSV(rows, columns), count: rows.length };
  }

  async exportPayroll(companyId, filters = {}) {
    const { period } = filters;
    if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      throw new ValidationError('period est requis au format YYYY-MM');
    }

    const payslips = await prisma.rhPayslip.findMany({
      where: { companyId, period },
      orderBy: { employee: { lastName: 'asc' } },
      include: {
        employee: { select: { employeeNumber: true, firstName: true, lastName: true, position: true } },
      },
    });

    const columns = [
      { key: 'payslipNumber',   label: 'N° Bulletin' },
      { key: 'matricule',       label: 'Matricule' },
      { key: 'nom',             label: 'Nom' },
      { key: 'prenom',          label: 'Prénom' },
      { key: 'poste',           label: 'Poste' },
      { key: 'baseSalary',      label: 'Salaire base' },
      { key: 'totalBonuses',    label: 'Primes' },
      { key: 'grossSalary',     label: 'Salaire brut' },
      { key: 'totalDeductions', label: 'Retenues' },
      { key: 'netSalary',       label: 'Salaire net' },
      { key: 'status',          label: 'Statut' },
    ];

    const rows = payslips.map(p => ({
      payslipNumber:   p.payslipNumber,
      matricule:       p.employee.employeeNumber,
      nom:             p.employee.lastName,
      prenom:          p.employee.firstName,
      poste:           p.employee.position,
      baseSalary:      parseFloat(p.baseSalary),
      totalBonuses:    parseFloat(p.totalBonuses),
      grossSalary:     parseFloat(p.grossSalary),
      totalDeductions: parseFloat(p.totalDeductions),
      netSalary:       parseFloat(p.netSalary),
      status:          p.status,
    }));

    const totals = {
      masseBrute: rows.reduce((s, r) => s + r.grossSalary, 0),
      masseNette: rows.reduce((s, r) => s + r.netSalary, 0),
      totalRetenues: rows.reduce((s, r) => s + r.totalDeductions, 0),
    };

    return { csv: this._toCSV(rows, columns), count: rows.length, totals };
  }
}

module.exports = new ExportService();
```

---

## Étape 7 — Controllers

### employee.controller.js

```js
// src/modules/rh/controllers/employee.controller.js
const employeeService = require('../services/employee.service');
const { successResponse } = require('../../../core/utils/response');

const list   = async (req, res) => successResponse(res, await employeeService.list(req.companyId, req.query));
const getOne = async (req, res) => successResponse(res, await employeeService.getOne(req.companyId, req.params.id));
const create = async (req, res) => successResponse(res, await employeeService.create(req.companyId, req.body, req.user.id), 'Employé créé', 201);
const update = async (req, res) => successResponse(res, await employeeService.update(req.companyId, req.params.id, req.body), 'Employé mis à jour');

module.exports = { list, getOne, create, update };
```

### department.controller.js

```js
// src/modules/rh/controllers/department.controller.js
const departmentService = require('../services/department.service');
const { successResponse } = require('../../../core/utils/response');

const list   = async (req, res) => successResponse(res, await departmentService.list(req.companyId, req.query));
const getOne = async (req, res) => successResponse(res, await departmentService.getOne(req.companyId, req.params.id));
const create = async (req, res) => successResponse(res, await departmentService.create(req.companyId, req.body, req.user.id), 'Département créé', 201);
const update = async (req, res) => successResponse(res, await departmentService.update(req.companyId, req.params.id, req.body), 'Département mis à jour');

module.exports = { list, getOne, create, update };
```

### dashboard.controller.js

```js
// src/modules/rh/controllers/dashboard.controller.js
const dashboardService = require('../services/dashboard.service');
const { successResponse } = require('../../../core/utils/response');

const summary          = async (req, res) => successResponse(res, await dashboardService.getSummary(req.companyId));
const attendanceStats  = async (req, res) => successResponse(res, await dashboardService.getAttendanceStats(req.companyId, req.query));
const payrollEvolution = async (req, res) => successResponse(res, await dashboardService.getPayrollEvolution(req.companyId, parseInt(req.query.months) || 6));

module.exports = { summary, attendanceStats, payrollEvolution };
```

### leave.controller.js

```js
// src/modules/rh/controllers/leave.controller.js
const leaveService = require('../services/leave.service');
const { successResponse } = require('../../../core/utils/response');

const list    = async (req, res) => successResponse(res, await leaveService.list(req.companyId, req.query));
const create  = async (req, res) => successResponse(res, await leaveService.create(req.companyId, req.body, req.user.id), 'Demande créée', 201);
const approve = async (req, res) => successResponse(res, await leaveService.approve(req.companyId, req.params.id, req.user.id), 'Congé approuvé');
const refuse  = async (req, res) => successResponse(res, await leaveService.refuse(req.companyId, req.params.id, req.body.refusalReason, req.user.id), 'Congé refusé');

module.exports = { list, create, approve, refuse };
```

### payslip.controller.js

```js
// src/modules/rh/controllers/payslip.controller.js
const payslipService = require('../services/payslip.service');
const { successResponse } = require('../../../core/utils/response');

const generate = async (req, res) => successResponse(res, await payslipService.generate(req.companyId, req.body, req.user.id), 'Bulletin généré', 201);
const validate = async (req, res) => successResponse(res, await payslipService.validate(req.companyId, req.params.id, req.user.id), 'Bulletin validé');
const markPaid = async (req, res) => successResponse(res, await payslipService.markPaid(req.companyId, req.params.id, req.user.id), 'Bulletin marqué payé');

module.exports = { generate, validate, markPaid };
```

### export.controller.js

```js
// src/modules/rh/controllers/export.controller.js
const exportService = require('../services/export.service');

const _sendCSV = (res, filename, { csv, count, totals }) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Export-Count', count);
  if (totals) res.setHeader('X-Export-Totals', JSON.stringify(totals));
  res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
};

const exportEmployees = async (req, res) => {
  const result = await exportService.exportEmployees(req.companyId, req.query);
  _sendCSV(res, `employes_${Date.now()}.csv`, result);
};

const exportAttendance = async (req, res) => {
  const result = await exportService.exportAttendance(req.companyId, req.query);
  _sendCSV(res, `presences_${req.query.year}_${req.query.month}.csv`, result);
};

const exportPayroll = async (req, res) => {
  const result = await exportService.exportPayroll(req.companyId, req.query);
  _sendCSV(res, `paie_${req.query.period}.csv`, result);
};

module.exports = { exportEmployees, exportAttendance, exportPayroll };
```

---

## Étape 8 — Routes

### department.routes.js

```js
// src/modules/rh/routes/department.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/department.controller');
const { requirePermission } = require('../../../core/permissions/guard');
const { validateRequest } = require('../../../core/middlewares/validateRequest.middleware');
const { createDepartmentRules, updateDepartmentRules } = require('../validators/department.validator');
const { param } = require('express-validator');

router.get('/',    requirePermission('rh', 'view_departments'), ctrl.list);
router.get('/:id', requirePermission('rh', 'view_departments'), param('id').isUUID(), validateRequest, ctrl.getOne);
router.post('/',   requirePermission('rh', 'manage_departments'), createDepartmentRules, validateRequest, ctrl.create);
router.put('/:id', requirePermission('rh', 'manage_departments'), updateDepartmentRules, validateRequest, ctrl.update);

module.exports = router;
```

### employee.routes.js

```js
// src/modules/rh/routes/employee.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employee.controller');
const { requirePermission } = require('../../../core/permissions/guard');
const { validateRequest } = require('../../../core/middlewares/validateRequest.middleware');
const { createEmployeeRules, updateEmployeeRules } = require('../validators/employee.validator');
const { param } = require('express-validator');

router.get('/',    requirePermission('rh', 'view_employees'),   ctrl.list);
router.get('/:id', requirePermission('rh', 'view_employees'),   param('id').isUUID(), validateRequest, ctrl.getOne);
router.post('/',   requirePermission('rh', 'create_employee'),  createEmployeeRules, validateRequest, ctrl.create);
router.put('/:id', requirePermission('rh', 'update_employee'),  updateEmployeeRules, validateRequest, ctrl.update);

module.exports = router;
```

### leave.routes.js

```js
// src/modules/rh/routes/leave.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leave.controller');
const { requirePermission } = require('../../../core/permissions/guard');
const { validateRequest } = require('../../../core/middlewares/validateRequest.middleware');
const { createLeaveRules, approveLeaveRules, refuseLeaveRules } = require('../validators/leave.validator');

router.get('/',              requirePermission('rh', 'view_leaves'),   ctrl.list);
router.post('/',             requirePermission('rh', 'request_leave'),  createLeaveRules,  validateRequest, ctrl.create);
router.post('/:id/approve',  requirePermission('rh', 'approve_leave'), approveLeaveRules, validateRequest, ctrl.approve);
router.post('/:id/refuse',   requirePermission('rh', 'refuse_leave'),  refuseLeaveRules,  validateRequest, ctrl.refuse);

module.exports = router;
```

### payslip.routes.js

```js
// src/modules/rh/routes/payslip.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payslip.controller');
const { requirePermission } = require('../../../core/permissions/guard');
const { validateRequest } = require('../../../core/middlewares/validateRequest.middleware');
const { generatePayslipRules } = require('../validators/payslip.validator');
const { param } = require('express-validator');

router.post('/',              requirePermission('rh', 'generate_payslip'), generatePayslipRules, validateRequest, ctrl.generate);
router.post('/:id/validate',  requirePermission('rh', 'validate_payslip'), param('id').isUUID(), validateRequest, ctrl.validate);
router.post('/:id/mark-paid', requirePermission('rh', 'mark_paid'),        param('id').isUUID(), validateRequest, ctrl.markPaid);

module.exports = router;
```

### dashboard.routes.js

```js
// src/modules/rh/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { requirePermission } = require('../../../core/permissions/guard');

router.get('/summary',            requirePermission('rh', 'view_dashboard'), ctrl.summary);
router.get('/attendance-stats',   requirePermission('rh', 'view_dashboard'), ctrl.attendanceStats);
router.get('/payroll-evolution',  requirePermission('rh', 'view_dashboard'), ctrl.payrollEvolution);

module.exports = router;
```

### export.routes.js

```js
// src/modules/rh/routes/export.routes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/export.controller');
const { requirePermission } = require('../../../core/permissions/guard');
const { query } = require('express-validator');
const { validateRequest } = require('../../../core/middlewares/validateRequest.middleware');

// GET /api/rh/exports/employees?status=ACTIF&departmentId=xxx
router.get('/employees',
  requirePermission('rh', 'export_data'),
  ctrl.exportEmployees
);

// GET /api/rh/exports/attendance?year=2026&month=05
router.get('/attendance',
  requirePermission('rh', 'export_data'),
  query('year').notEmpty().withMessage('year est requis').isInt({ min: 2000 }),
  query('month').notEmpty().withMessage('month est requis').isInt({ min: 1, max: 12 }),
  validateRequest,
  ctrl.exportAttendance
);

// GET /api/rh/exports/payroll?period=2026-05
router.get('/payroll',
  requirePermission('rh', 'export_data'),
  query('period').notEmpty().withMessage('period est requis').matches(/^\d{4}-(0[1-9]|1[0-2])$/),
  validateRequest,
  ctrl.exportPayroll
);

module.exports = router;
```

### routes/index.js

```js
// src/modules/rh/routes/index.js
const express = require('express');
const router = express.Router();

router.use('/employees',   require('./employee.routes'));
router.use('/attendance',  require('./attendance.routes'));
router.use('/leaves',      require('./leave.routes'));
router.use('/payslips',    require('./payslip.routes'));
router.use('/departments', require('./department.routes'));
router.use('/dashboard',   require('./dashboard.routes'));
router.use('/exports',     require('./export.routes'));

module.exports = router;
```

---

## Étape 9 — index.js du module

```js
// src/modules/rh/index.js
const router = require('./routes');

module.exports = {
  name: 'rh',
  path: '/api/rh',
  router,
  requiresAuth: true,
  requiresModule: 'rh',
};
```

C'est **tout ce qu'il faut** pour que le `ModuleLoader` détecte et charge le module automatiquement.

---

## Étape 10 — Prisma Schema & Index

### Récapitulatif des index par table

| Table | Index | Raison |
|---|---|---|
| `RhDepartment` | `[companyId]` | Filtre multi-tenant |
| `RhDepartment` | `[companyId, isActive]` | Lister uniquement les actifs |
| `RhEmployee` | `[companyId]` | Filtre multi-tenant |
| `RhEmployee` | `[companyId, status]` | Filtrer par statut (actifs, inactifs) |
| `RhEmployee` | `[companyId, departmentId]` | Employés d'un département |
| `RhEmployee` | `[companyId, lastName, firstName]` | Recherche alphabétique |
| `RhEmployee` | `UNIQUE [companyId, employeeNumber]` | Numéro matricule unique par entreprise |
| `RhAttendance` | `[companyId, date]` | Présences du jour ou d'une plage |
| `RhAttendance` | `[companyId, employeeId]` | Historique d'un employé |
| `RhAttendance` | `[companyId, status, date]` | Stats absences/présences par période |
| `RhAttendance` | `UNIQUE [companyId, employeeId, date]` | Empêche le double pointage |
| `RhLeaveRequest` | `[companyId, status]` | Congés en attente |
| `RhLeaveRequest` | `[companyId, employeeId]` | Congés d'un employé |
| `RhLeaveRequest` | `[companyId, startDate, endDate]` | Détection de chevauchements |
| `RhPayslip` | `[companyId, period]` | Masse salariale par période |
| `RhPayslip` | `[companyId, status]` | Bulletins à valider / à payer |
| `RhPayslip` | `UNIQUE [companyId, employeeId, period]` | Pas de doublon par période |
| `RhPayslipItem` | `[payslipId]` | Lignes d'un bulletin |

### Après modification du schema

```bash
npx prisma migrate dev --name add_rh_module
```

---

## 14. Système de pointage QR Code

Le système permet à chaque employé de pointer son arrivée et son départ en scannant un QR Code
unique depuis une borne (tablette, écran tactile) sans avoir besoin d'un compte utilisateur.

### Architecture du système

```
Employé (badge QR)
        │
        ▼ scan
Borne web  (/kiosk)                    → POST /api/rh/qrcode/scan
        │                                    │
        │          { token, scanType }        │
        │ ─────────────────────────────────► │
        │                                    ▼
        │                             scan.service.js
        │                               ├── Cherche l'employé via qrToken
        │                               ├── Vérifie le statut (ACTIF)
        │                               ├── Crée / met à jour RhAttendance
        │                               └── Retourne nom + heure + message
        │
        ◄── affiche message "Bienvenue / Au revoir"
```

---

### Champ `qrToken` sur `RhEmployee`

Chaque employé possède un `qrToken` — une chaîne aléatoire de 64 caractères hexadécimaux.
Ce token est l'identifiant secret encodé dans le QR Code.

- Généré automatiquement au premier appel `GET /api/rh/qrcode/employees/:id/qrcode`
- Peut être régénéré si perdu ou compromis (l'ancien QR Code devient invalide immédiatement)
- Stocké en `UNIQUE` en base — garanti qu'aucun employé ne peut usurper le QR d'un autre

---

### Nouveaux fichiers créés

```
src/modules/rh/
├── services/
│   ├── qrcode.service.js   ← Génération token + image PNG (lib qrcode)
│   └── scan.service.js     ← Logique arrivée/départ, calcul heures
├── controllers/
│   └── qrcode.controller.js
├── routes/
│   └── qrcode.routes.js    ← Routes protégées (admin) + publiques (borne)
└── kiosk.html              ← Page web de la borne de pointage
```

---

### Endpoints QR Code

#### Endpoints protégés (nécessitent un JWT valide)

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/rh/qrcode/employees/:id/qrcode` | `view_employees` | Télécharger le QR Code PNG |
| POST | `/api/rh/qrcode/employees/:id/qrcode/regenerate` | `edit_employees` | Régénérer le QR Code |

**Exemple — télécharger le QR Code d'un employé :**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/rh/qrcode/employees/<uuid>/qrcode \
  --output qrcode-EMP00001.png
```

La réponse est une image `image/png` prête à imprimer sur un badge ou une carte.

---

#### Endpoints publics (borne de pointage — aucun JWT requis)

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/rh/qrcode/scan` | Enregistrer un pointage (arrivée ou départ) |
| GET | `/api/rh/qrcode/scan/status?token=...` | Consulter le statut du jour |

**Corps de la requête scan :**
```json
{
  "token": "a3f8...64-hex-chars...d9",
  "scanType": "check_in"
}
```

`scanType` accepte : `check_in` (arrivée) ou `check_out` (départ).

**Réponse — arrivée enregistrée :**
```json
{
  "success": true,
  "data": {
    "action": "checked_in",
    "employee": {
      "firstName": "Amara",
      "lastName": "Diallo",
      "employeeNumber": "EMP00012",
      "position": "Caissier"
    },
    "checkIn": "2026-05-31T08:04:22.000Z",
    "message": "Bienvenue Amara Diallo ! Arrivée enregistrée."
  }
}
```

**Réponse — départ enregistré :**
```json
{
  "success": true,
  "data": {
    "action": "checked_out",
    "employee": { "firstName": "Amara", "lastName": "Diallo", "employeeNumber": "EMP00012" },
    "checkIn": "2026-05-31T08:04:22.000Z",
    "checkOut": "2026-05-31T17:01:55.000Z",
    "hoursWorked": 8.96,
    "message": "Au revoir Amara Diallo ! 8.96h travaillées aujourd'hui."
  }
}
```

**Valeurs possibles du champ `action` :**

| Action | Signification |
|---|---|
| `checked_in` | Arrivée enregistrée avec succès |
| `checked_out` | Départ enregistré, heures calculées |
| `already_checked_in` | Employé avait déjà pointé l'arrivée |
| `already_checked_out` | Employé avait déjà pointé le départ |

---

### La borne de pointage (`/kiosk`)

Accessible sur `http://votre-serveur:4000/kiosk` — aucune authentification requise.

**Fonctionnalités de la borne :**
- Horloge en temps réel (heure et date)
- Sélecteur de mode : Arrivée / Départ
- Scan via caméra (utilise la bibliothèque jsQR chargée depuis CDN)
- Saisie manuelle du token si la caméra n'est pas disponible
- Message de bienvenue/au revoir avec heures affichées
- Auto-effacement du résultat après 6 secondes (prête pour le prochain employé)

**Flux d'utilisation :**
1. Placer une tablette à l'entrée du bureau/entrepôt, ouvrir `/kiosk`
2. L'employé sélectionne "Arrivée" le matin ou "Départ" le soir
3. Il scanne son QR Code (badge imprimé, téléphone avec le PNG)
4. La borne affiche "Bienvenue [Nom] !" ou "Au revoir [Nom] ! Xh travaillées"
5. Le pointage est créé automatiquement dans `RhAttendance`

---

### Données encodées dans le QR Code

Le QR Code contient un objet JSON minifié :
```json
{ "t": "<qrToken>", "eid": "<employeeId>" }
```

- `t` — le token secret (clé de vérification côté serveur)
- `eid` — l'UUID de l'employé (informatif, non utilisé pour la vérification)

La vérification côté serveur se fait **uniquement** via `qrToken` — si le token est valide, le pointage est accepté.

---

### Service `qrcode.service.js` — méthodes

| Méthode | Description |
|---|---|
| `generateForEmployee(companyId, employeeId)` | Génère (ou réutilise) le token et retourne un buffer PNG |
| `regenerateToken(companyId, employeeId)` | Force un nouveau token (invalide l'ancien QR Code) |
| `findEmployeeByToken(token)` | Retrouve l'employé par son `qrToken` |

---

### Service `scan.service.js` — logique métier

**Arrivée (`check_in`) :**
1. Cherche l'employé via `qrToken` — erreur si non trouvé ou inactif
2. Cherche un enregistrement `RhAttendance` pour aujourd'hui
3. Si aucun → crée avec `checkIn = now`, `status = PRESENT`
4. Si existe sans `checkIn` → met à jour avec `checkIn = now`
5. Si existe avec `checkIn` → retourne `already_checked_in` (pas d'erreur, juste une info)

**Départ (`check_out`) :**
1. Cherche l'employé et l'enregistrement du jour
2. Si pas d'enregistrement ou pas de `checkIn` → erreur (doit pointer l'arrivée d'abord)
3. Si déjà `checkOut` → retourne `already_checked_out`
4. Sinon → met à jour `checkOut = now` et calcule `hoursWorked = (checkOut - checkIn) / 3600000`

---

### Migration de base de données

Le champ `qrToken` a été ajouté au modèle `RhEmployee`. Après avoir mis à jour `prisma/schema.prisma`,
exécuter :

```bash
npx prisma db push
# ou en développement avec migration nommée :
npx prisma migrate dev --name add_employee_qr_token
```

---

## 15. Comment le module se charge automatiquement

```
Démarrage du serveur
        │
        ▼
ModuleLoader.loadModules(app)
        │
        ├── Lit src/modules/rh/  ──────────────────────────────┐
        │                                                       │
        ├── Charge permissions.js  ← registerPermissions('rh') │
        │                                                       │
        ├── Charge hooks.js  ← hookManager.register(...)        │
        │                                                       │
        └── Monte les routes :                                  │
            app.use('/api/rh',                                  │
              authenticate,        ← vérifie le JWT            │
              companyIsolation,    ← injecte req.companyId      │
              requireModule('rh'), ← vérifie l'abonnement       │
              router               ← les routes du module RH    │
            )                                                   │
                                                               ◄┘
```

Aucune modification de `src/core/app.js`, `src/routes/index.js` ou `modules-registry.js` n'est nécessaire.

**Exception — borne de pointage :** la route `/kiosk` est enregistrée directement dans `src/core/app.js`
car elle sert une page HTML publique hors du middleware d'authentification des modules.

---

## 16. Checklist de validation

**Structure**
- [ ] `src/modules/rh/index.js` exporte `{ name, path, router, requiresAuth, requiresModule }`
- [ ] `src/modules/rh/manifest.json` existe
- [ ] `src/modules/rh/permissions.js` appelle `registerPermissions('rh', [...])`
- [ ] `src/modules/rh/routes/index.js` monte tous les sous-routers (`/departments`, `/exports`, `/dashboard`, `/qrcode`, ...)

**Validators**
- [ ] Chaque champ requis a `.notEmpty().withMessage(...)`
- [ ] Chaque `param('id')` route valide `.isUUID()`
- [ ] Chaque route POST/PUT branche ses règles + `validateRequest`
- [ ] Export routes valident `year`, `month`, `period` en query

**Services**
- [ ] Chaque service filtre par `companyId` (multi-tenant)
- [ ] `NotFoundError` levée si ressource absente
- [ ] `ValidationError` levée pour les transitions d'état invalides
- [ ] `ConflictError` levée pour les doublons (bulletin période, département existant)
- [ ] Les hooks sont déclenchés après les actions importantes

**QR Code & Borne**
- [ ] Champ `qrToken` présent sur `RhEmployee` en base (`npx prisma db push`)
- [ ] `GET /api/rh/qrcode/employees/:id/qrcode` retourne bien une image `image/png`
- [ ] `POST /api/rh/qrcode/scan` fonctionne sans JWT (endpoint public)
- [ ] `POST /api/rh/qrcode/employees/:id/qrcode/regenerate` invalide l'ancien token
- [ ] Page `/kiosk` accessible dans un navigateur sans authentification
- [ ] La caméra fonctionne sur tablette (HTTPS requis en production pour l'API Camera)

**Exports**
- [ ] BOM UTF-8 (`\uFEFF`) présent pour compatibilité Excel
- [ ] Header `Content-Disposition: attachment` correctement défini
- [ ] Validation des paramètres de query avant export
- [ ] Les valeurs numériques sont parsées (`parseFloat`) avant l'écriture CSV

**Dashboard**
- [ ] `getSummary` retourne les 5 KPIs principaux en un seul appel
- [ ] `getPayrollEvolution` prend un paramètre `months` depuis `req.query`
- [ ] `getAttendanceStats` filtre bien par `month` et `year`

**Base de données**
- [ ] Migration exécutée avec succès (`npx prisma db push` ou `npx prisma migrate dev`)
- [ ] Les relations `Company → Rh*` sont définies dans le schema
- [ ] Les contraintes `@@unique` sont en place sur `RhEmployee` et `RhPayslip`
- [ ] L'index `@@unique` sur `qrToken` est présent
- [ ] Les index sur les colonnes de filtre fréquentes sont présents

**Test rapide**
```bash
# Vérifier que le module est bien chargé au démarrage
node index.js | grep "rh"
# Attendu : ✅ Module loaded: rh at /api/rh

# Dashboard
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/rh/dashboard/summary

# Export CSV employés
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/rh/exports/employees?status=ACTIF" \
  --output employes.csv

# Export paie
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/rh/exports/payroll?period=2026-05" \
  --output paie_2026-05.csv
```

---

## Récapitulatif des endpoints REST du module RH

### Employés & Départements

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/rh/employees` | `view_employees` | Liste des employés |
| GET | `/api/rh/employees/:id` | `view_employees` | Fiche employé |
| POST | `/api/rh/employees` | `create_employee` | Créer un employé |
| PUT | `/api/rh/employees/:id` | `update_employee` | Modifier un employé |
| GET | `/api/rh/departments` | `view_departments` | Liste des départements |
| GET | `/api/rh/departments/:id` | `view_departments` | Département + membres |
| POST | `/api/rh/departments` | `manage_departments` | Créer un département |
| PUT | `/api/rh/departments/:id` | `manage_departments` | Modifier un département |

### Présences (saisie manuelle)

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/rh/attendance` | `view_attendance` | Liste des pointages |
| GET | `/api/rh/attendance/:id` | `view_attendance` | Un pointage |
| GET | `/api/rh/attendance/employees/:id/summary` | `view_attendance` | Résumé mensuel employé |
| POST | `/api/rh/attendance` | `record_attendance` | Enregistrer un pointage |
| POST | `/api/rh/attendance/bulk` | `record_attendance` | Pointage groupé |
| PUT | `/api/rh/attendance/:id` | `edit_attendance` | Corriger un pointage |

### Pointage QR Code

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/rh/qrcode/employees/:id/qrcode` | JWT requis | Télécharger le QR Code PNG |
| POST | `/api/rh/qrcode/employees/:id/qrcode/regenerate` | JWT requis | Régénérer le QR Code |
| POST | `/api/rh/qrcode/scan` | **Public** | Pointer arrivée/départ (borne) |
| GET | `/api/rh/qrcode/scan/status` | **Public** | Statut du jour par token |
| GET | `/kiosk` | **Public** | Page web de la borne |

### Congés

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/rh/leaves` | `view_leaves` | Liste des congés |
| POST | `/api/rh/leaves` | `request_leave` | Soumettre un congé |
| POST | `/api/rh/leaves/:id/approve` | `approve_leave` | Approuver un congé |
| POST | `/api/rh/leaves/:id/refuse` | `refuse_leave` | Refuser un congé |

### Paie

| Méthode | Route | Permission | Description |
|---|---|---|---|
| POST | `/api/rh/payslips` | `generate_payslip` | Générer un bulletin |
| POST | `/api/rh/payslips/:id/validate` | `validate_payslip` | Valider un bulletin |
| POST | `/api/rh/payslips/:id/mark-paid` | `mark_paid` | Marquer comme payé |

### Dashboard & Exports

| Méthode | Route | Permission | Description |
|---|---|---|---|
| GET | `/api/rh/dashboard/summary` | `view_dashboard` | KPIs RH |
| GET | `/api/rh/dashboard/attendance-stats` | `view_dashboard` | Stats présences |
| GET | `/api/rh/dashboard/payroll-evolution` | `view_dashboard` | Évolution masse salariale |
| GET | `/api/rh/exports/employees` | `export_data` | Export CSV employés |
| GET | `/api/rh/exports/attendance` | `export_data` | Export CSV présences |
| GET | `/api/rh/exports/payroll` | `export_data` | Export CSV paie |
