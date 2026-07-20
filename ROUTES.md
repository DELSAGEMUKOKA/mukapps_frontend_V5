# MUKAPPS BACKEND - API ROUTES DOCUMENTATION

> Base URL: `/api`
> All protected routes require a valid JWT token via `Authorization: Bearer <token>` header.

---

## TABLE OF CONTENTS

- [Auth Routes](#auth-routes)
- [Users Routes](#users-routes)
- [Subscription Routes](#subscription-routes)
- [Super Admin Routes](#super-admin-routes)
- [Client Module Routes](#client-module-routes)
- [Users Module Routes](#users-module-routes)
- [Magasin Module Routes](#magasin-module-routes)
  - [Products](#products)
  - [Categories](#categories)
  - [Stock](#stock)
  - [Sales](#sales)
  - [Invoices](#invoices)
  - [Financial](#financial)
  - [Dashboard](#dashboard)
  - [Reports](#reports)
  - [Activities](#activities)
  - [User Performance](#user-performance)
  - [Expiry](#expiry)

---

## AUTH ROUTES

**Base path:** `/api/auth`

| Method | Path | Middleware | Controller | Description |
|--------|------|-----------|-----------|-------------|
| POST | `/api/auth/register` | `registerLimiter` | `authController.register` | Register a new user |
| POST | `/api/auth/login` | `loginLimiter` | `authController.login` | Login with email & password |
| GET | `/api/auth/me` | `authenticate`, `passwordResetLimiter` | `authController.getCurrentUser` | Get current authenticated user |
| POST | `/api/auth/change-password` | `authenticate`, `passwordResetLimiter` | `authController.changePassword` | Change user password |

---

## USERS ROUTES

**Base path:** `/api/users` (core)

| Method | Path | Middleware | Controller | Description |
|--------|------|-----------|-----------|-------------|
| POST | `/api/users` | `authenticate`, `requireRole(ADMIN, SUPERVISOR)` | `authController.createUser` | Create a new user (admin/supervisor only) |

---

## SUBSCRIPTION ROUTES

**Base path:** `/api/subscription`
All routes require: `authenticate`

| Method | Path | Middleware | Controller | Description |
|--------|------|-----------|-----------|-------------|
| GET | `/api/subscription` | `authenticate` | `subscriptionController.getSubscriptionInfo` | Get subscription info |
| GET | `/api/subscription/status` | `authenticate` | `subscriptionController.checkStatus` | Check subscription status |
| GET | `/api/subscription/modules` | `authenticate` | `subscriptionController.getActiveModules` | Get active modules |
| GET | `/api/subscription/modules/:moduleName/check` | `authenticate` | `subscriptionController.checkModuleAccess` | Check access to a specific module |
| GET | `/api/subscription/stats` | `authenticate`, `requireRole(ADMIN)` | `subscriptionController.getStats` | Get subscription statistics |
| POST | `/api/subscription/activate` | `authenticate`, `requireRole(ADMIN)` | `subscriptionController.activateSubscription` | Activate subscription |
| POST | `/api/subscription/renew` | `authenticate`, `requireRole(ADMIN)` | `subscriptionController.renewSubscription` | Renew subscription |
| POST | `/api/subscription/cancel` | `authenticate`, `requireRole(ADMIN)` | `subscriptionController.cancelSubscription` | Cancel subscription |
| POST | `/api/subscription/modules/activate` | `authenticate`, `requireRole(ADMIN)` | `subscriptionController.activateModule` | Activate a module |
| POST | `/api/subscription/modules/deactivate` | `authenticate`, `requireRole(ADMIN)` | `subscriptionController.deactivateModule` | Deactivate a module |

---

## SUPER ADMIN ROUTES

**Base path:** `/api/superadmin`
All routes require: `authenticate`, `requireSuperAdmin`

### Health

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/health` | inline | Server health check |

### Dashboard

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/superadmin/dashboard/stats` | `superAdminController.getDashboardStats` | Get global dashboard statistics |

### Company Management

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/superadmin/companies` | `superAdminController.getAllCompanies` | Get all companies |
| POST | `/api/superadmin/companies` | `superAdminController.createCompany` | Create a new company |
| GET | `/api/superadmin/companies/:id` | `superAdminController.getCompanyDetails` | Get company details |
| PUT | `/api/superadmin/companies/:id` | `superAdminController.updateCompany` | Update company info |
| DELETE | `/api/superadmin/companies/:id` | `superAdminController.deleteCompany` | Delete a company |
| PUT | `/api/superadmin/companies/:id/status` | `superAdminController.toggleCompanyStatus` | Toggle company active status |

### Subscription Management (by company)

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| POST | `/api/superadmin/companies/:id/subscription/activate` | `superAdminController.activateSubscription` | Activate subscription for a company |
| POST | `/api/superadmin/companies/:id/subscription/extend` | `superAdminController.extendSubscription` | Extend subscription for a company |
| POST | `/api/superadmin/companies/:id/subscription/cancel` | `superAdminController.cancelSubscription` | Cancel subscription for a company |

### Module Management (by company)

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| POST | `/api/superadmin/companies/:id/modules` | `superAdminController.toggleModule` | Toggle module for a company |

### User Management

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/superadmin/users` | `superAdminController.getAllUsers` | Get all users across all companies |
| GET | `/api/superadmin/users/online` | `superAdminController.getOnlineUsers` | Get currently online users |
| PUT | `/api/superadmin/users/:userId/status` | `superAdminController.toggleUserStatus` | Toggle user active status |

### Activity Logs

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/superadmin/activity-logs` | `superAdminController.getActivityLogs` | Get all activity logs |
| GET | `/api/superadmin/activity-logs/recent` | `superAdminController.getRecentActivity` | Get recent activity |
| GET | `/api/superadmin/activity-logs/stats` | `superAdminController.getActivityStats` | Get activity statistics |

### Module Usage

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/superadmin/modules/usage/stats` | `superAdminController.getModuleUsageStats` | Get module usage statistics |
| GET | `/api/superadmin/modules/most-used` | `superAdminController.getMostUsedModules` | Get most used modules |

---

## CLIENT MODULE ROUTES

**Base path:** `/api/client`
All routes require: `authenticate`, `companyIsolation`

| Method | Path | Permission Required | Controller | Description |
|--------|------|---------------------|-----------|-------------|
| GET | `/api/client` | `client.view` | `clientController.getClients` | Get all clients |
| POST | `/api/client` | `client.create` | `clientController.createClient` | Create a new client |
| GET | `/api/client/stats` | `client.view_stats` | `clientController.getClientStats` | Get client statistics |
| GET | `/api/client/reports/top` | `client.view_reports` | `clientController.getTopClients` | Get top clients report |
| GET | `/api/client/reports/vip` | `client.view_reports` | `clientController.getVIPClients` | Get VIP clients report |
| GET | `/api/client/:id` | `client.view` | `clientController.getClientById` | Get client by ID |
| PUT | `/api/client/:id` | `client.update` | `clientController.updateClient` | Update client |
| DELETE | `/api/client/:id` | `client.delete` | `clientController.deleteClient` | Delete client |
| GET | `/api/client/:id/history` | `client.view_history` | `clientController.getClientHistory` | Get client purchase history |
| PATCH | `/api/client/:id/vip` | `client.manage_vip` | `clientController.updateVIPStatus` | Update VIP status |

---

## USERS MODULE ROUTES

**Base path:** `/api/users`
All routes require: `authenticate`, `companyIsolation`

| Method | Path | Permission Required | Controller | Description |
|--------|------|---------------------|-----------|-------------|
| GET | `/api/users` | `users.view` | `userController.listUsers` | List all company users |
| POST | `/api/users` | `users.create` | `userController.createUser` | Create a new user |
| GET | `/api/users/profile/me` | `users.view_own_profile` | `userController.getMyProfile` | Get own profile |
| PUT | `/api/users/profile/me` | `users.view_own_profile` | `userController.updateMyProfile` | Update own profile |
| PUT | `/api/users/profile/me/password` | `users.update_own_password` | `userController.changePassword` | Change own password |
| GET | `/api/users/activities` | `users.view_activities` | `userController.getActivities` | Get all user activities |
| GET | `/api/users/:id` | `users.view` | `userController.getUserById` | Get user by ID |
| PUT | `/api/users/:id` | `users.update` | `userController.updateUser` | Update user |
| PUT | `/api/users/:id/role` | `users.manage_roles` | `userController.updateUserRole` | Update user role |
| PUT | `/api/users/:id/status` | `users.manage_status` | `userController.updateUserStatus` | Activate / deactivate user |
| DELETE | `/api/users/:id` | `users.delete` | `userController.deleteUser` | Delete user |
| GET | `/api/users/:id/activities` | `users.view_activities` | `userController.getUserActivities` | Get activities for a user |

---

## MAGASIN MODULE ROUTES

**Base path:** `/api/magasin`
All routes require: `authenticate`, `companyIsolation` (unless specified otherwise)

---

### Products

**Path:** `/api/magasin/products`

| Method | Path | Role Required | Controller | Description |
|--------|------|--------------|-----------|-------------|
| GET | `/api/magasin/products` | — | `productController.getProducts` | Get all products |
| POST | `/api/magasin/products` | `ADMIN, SUPERVISOR, OPERATOR` | `productController.createProduct` | Create a product |
| GET | `/api/magasin/products/low-stock` | — | `productController.getLowStockProducts` | Get low stock products |
| GET | `/api/magasin/products/expiring` | — | `productController.getExpiringProducts` | Get expiring products |
| GET | `/api/magasin/products/top-selling` | — | `productController.getTopSellingProducts` | Get top selling products |
| GET | `/api/magasin/products/:id` | — | `productController.getProductById` | Get product by ID |
| PUT | `/api/magasin/products/:id` | `ADMIN, SUPERVISOR, OPERATOR` | `productController.updateProduct` | Update product |
| DELETE | `/api/magasin/products/:id` | `ADMIN, SUPERVISOR` | `productController.deleteProduct` | Delete product |
| PATCH | `/api/magasin/products/:id/stock` | `ADMIN, SUPERVISOR, OPERATOR` | `productController.updateStock` | Update product stock |
| GET | `/api/magasin/products/:id/history` | — | `productController.getStockHistory` | Get stock history |
| GET | `/api/magasin/products/:id/price-history` | — | `productController.getPriceHistory` | Get price history |
| GET | `/api/magasin/products/:id/statistics` | — | `productController.getProductStatistics` | Get product statistics |
| POST | `/api/magasin/products/:id/archive` | `ADMIN, SUPERVISOR` | `productController.archiveProduct` | Archive product |
| POST | `/api/magasin/products/:id/restore` | `ADMIN, SUPERVISOR` | `productController.restoreProduct` | Restore archived product |
| POST | `/api/magasin/products/:id/duplicate` | `ADMIN, SUPERVISOR, OPERATOR` | `productController.duplicateProduct` | Duplicate product |
| POST | `/api/magasin/products/bulk/create` | `ADMIN, SUPERVISOR` | `productController.bulkCreateProducts` | Bulk create products |
| PUT | `/api/magasin/products/bulk/update` | `ADMIN, SUPERVISOR` | `productController.bulkUpdateProducts` | Bulk update products |
| POST | `/api/magasin/products/bulk/archive` | `ADMIN, SUPERVISOR` | `productController.bulkArchiveProducts` | Bulk archive products |
| DELETE | `/api/magasin/products/bulk/delete` | `ADMIN, SUPERVISOR` | `productController.bulkDeleteProducts` | Bulk delete products |

---

### Categories

**Path:** `/api/magasin/categories`

| Method | Path | Role Required | Controller | Description |
|--------|------|--------------|-----------|-------------|
| GET | `/api/magasin/categories` | — | `categoryController.getCategories` | Get all categories |
| POST | `/api/magasin/categories` | `ADMIN, SUPERVISOR` | `categoryController.createCategory` | Create a category |
| GET | `/api/magasin/categories/statistics/all` | — | `categoryController.getAllCategoriesStatistics` | Get all categories statistics |
| GET | `/api/magasin/categories/:id` | — | `categoryController.getCategoryById` | Get category by ID |
| PUT | `/api/magasin/categories/:id` | `ADMIN, SUPERVISOR` | `categoryController.updateCategory` | Update category |
| DELETE | `/api/magasin/categories/:id` | `ADMIN, SUPERVISOR` | `categoryController.deleteCategory` | Delete category |
| POST | `/api/magasin/categories/:id/archive` | `ADMIN, SUPERVISOR` | `categoryController.archiveCategory` | Archive category |
| POST | `/api/magasin/categories/:id/restore` | `ADMIN, SUPERVISOR` | `categoryController.restoreCategory` | Restore archived category |
| GET | `/api/magasin/categories/:id/products` | — | `categoryController.getCategoryProducts` | Get products in a category |
| GET | `/api/magasin/categories/:id/statistics` | — | `categoryController.getCategoryStatistics` | Get category statistics |
| POST | `/api/magasin/categories/bulk/create` | `ADMIN, SUPERVISOR` | `categoryController.bulkCreateCategories` | Bulk create categories |
| PUT | `/api/magasin/categories/bulk/update` | `ADMIN, SUPERVISOR` | `categoryController.bulkUpdateCategories` | Bulk update categories |
| POST | `/api/magasin/categories/bulk/archive` | `ADMIN, SUPERVISOR` | `categoryController.bulkArchiveCategories` | Bulk archive categories |
| PUT | `/api/magasin/categories/bulk/reorder` | `ADMIN, SUPERVISOR` | `categoryController.reorderCategories` | Reorder categories |

---

### Stock

**Path:** `/api/magasin/stock`

| Method | Path | Role Required | Controller | Description |
|--------|------|--------------|-----------|-------------|
| GET | `/api/magasin/stock/overview` | — | `stockController.getStockOverview` | Get stock overview |
| GET | `/api/magasin/stock/low-stock` | — | `stockController.getLowStockProducts` | Get low stock products |
| GET | `/api/magasin/stock/expiring` | — | `stockController.getExpiringProducts` | Get expiring products |
| POST | `/api/magasin/stock/adjust` | `ADMIN, SUPERVISOR, OPERATOR` | `stockController.adjustStock` | Adjust stock quantity |
| GET | `/api/magasin/stock/:productId/history` | — | `stockController.getStockHistory` | Get stock movement history |
| PATCH | `/api/magasin/stock/:id` | `ADMIN, SUPERVISOR, OPERATOR` | `stockController.updateStock` | Update a stock entry |

---

### Sales

**Path:** `/api/magasin/sales`
All routes require: `authenticate`, `companyIsolation`, `applyUserFilter`

| Method | Path | Permission Required | Controller | Description |
|--------|------|---------------------|-----------|-------------|
| GET | `/api/magasin/sales` | `magasin.view_sales` | `saleController.listSales` | List all sales |
| POST | `/api/magasin/sales` | `magasin.create_sales` | `saleController.createSale` | Create a new sale |
| GET | `/api/magasin/sales/:id` | `magasin.view_sales` | `saleController.getSaleById` | Get sale by ID |
| PUT | `/api/magasin/sales/:id/cancel` | `magasin.cancel_sales` | `saleController.cancelSale` | Cancel a sale |
| GET | `/api/magasin/sales/:id/invoice` | `magasin.view_invoices` | `saleController.getInvoice` | Get invoice for a sale |
| GET | `/api/magasin/sales/:id/invoice/download` | `magasin.download_invoices` | `saleController.downloadInvoice` | Download invoice PDF |

---

### Invoices

**Path:** `/api/magasin/invoices`

| Method | Path | Role Required | Controller | Description |
|--------|------|--------------|-----------|-------------|
| GET | `/api/magasin/invoices` | — | `invoiceController.getSales` | Get all invoices |
| POST | `/api/magasin/invoices` | `ADMIN, SUPERVISOR, OPERATOR, CASHIER` | `invoiceController.createSale` | Create an invoice/sale |
| GET | `/api/magasin/invoices/dashboard` | — | `invoiceController.getDashboard` | Get invoices dashboard |
| GET | `/api/magasin/invoices/:id` | — | `invoiceController.getSaleById` | Get invoice by ID |

---

### Financial

**Path:** `/api/magasin/financial`
All routes require: `authenticate`, `companyIsolation`, `applyUserFilter`, `requirePermission(magasin.view_financial)`

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/financial/summary` | `financialController.getFinancialSummary` | Get overall financial summary |
| GET | `/api/magasin/financial/capital/indicators` | `financialController.getStockCapitalIndicators` | Get stock capital indicators |
| GET | `/api/magasin/financial/capital/by-category` | `financialController.getStockValueByCategory` | Get stock value by category |
| GET | `/api/magasin/financial/capital/evolution` | `financialController.getCapitalEvolution` | Get capital evolution over time |
| GET | `/api/magasin/financial/products/top-by-value` | `financialController.getTopProductsByValue` | Get top products by financial value |

---

### Dashboard

**Path:** `/api/magasin/dashboard`
All routes require: `authenticate`, `companyIsolation`, `requirePermission(magasin.view_dashboard)`

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/dashboard/stats` | `dashboardController.getDashboardStats` | Get dashboard statistics |
| GET | `/api/magasin/dashboard/alerts` | `dashboardController.getDashboardAlerts` | Get dashboard alerts |
| GET | `/api/magasin/dashboard/top-products` | `dashboardController.getTopSellingProducts` | Get top selling products |
| GET | `/api/magasin/dashboard/sales-chart` | `dashboardController.getSalesChart` | Get sales chart data |

---

### Reports

**Path:** `/api/magasin/reports`
All routes require: `authenticate`, `companyIsolation`, `applyUserFilter`, `requirePermission(magasin.view_reports)`

#### Sales Reports

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/reports/sales` | `reportController.getSalesReport` | Get full sales report |
| GET | `/api/magasin/reports/sales/daily` | `reportController.getSalesByPeriod` | Get daily sales breakdown |
| GET | `/api/magasin/reports/sales/weekly` | `reportController.getSalesByPeriod` | Get weekly sales breakdown |
| GET | `/api/magasin/reports/sales/monthly` | `reportController.getSalesByPeriod` | Get monthly sales breakdown |

#### Profit Reports

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/reports/profits` | `reportController.getProfitReport` | Get profit report |
| GET | `/api/magasin/reports/profits/monthly` | `reportController.getMonthlyProfits` | Get monthly profits |
| GET | `/api/magasin/reports/revenue-trend` | `reportController.getRevenueTrend` | Get revenue trend |

#### Inventory Reports

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/reports/inventory` | `reportController.getInventoryReport` | Get full inventory report |
| GET | `/api/magasin/reports/low-stock` | `reportController.getLowStockReport` | Get low stock report |
| GET | `/api/magasin/reports/out-of-stock` | `reportController.getOutOfStockReport` | Get out of stock report |
| GET | `/api/magasin/reports/expired-products` | `reportController.getExpiredProductsReport` | Get expired products report |

#### Product Reports

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/reports/top-products` | `reportController.getTopProducts` | Get top performing products |
| GET | `/api/magasin/reports/underperforming-products` | `reportController.getUnderperformingProducts` | Get underperforming products |
| GET | `/api/magasin/reports/products-by-category` | `reportController.getProductsByCategory` | Get products grouped by category |
| GET | `/api/magasin/reports/product-performance` | `reportController.getProductPerformanceReport` | Get product performance report |

#### Customer Reports

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/reports/customers` | `reportController.getCustomerReport` | Get customer report |
| GET | `/api/magasin/reports/customers/top` | `reportController.getTopCustomers` | Get top customers |
| GET | `/api/magasin/reports/customers/vip` | `reportController.getVIPCustomers` | Get VIP customers |

---

### Activities

**Path:** `/api/magasin/activities`
All routes require: `authenticate`, `companyIsolation`

| Method | Path | Permission Required | Controller | Description |
|--------|------|---------------------|-----------|-------------|
| GET | `/api/magasin/activities` | `magasin.view_activities` | `activityController.getRecentActivities` | Get all activities |
| GET | `/api/magasin/activities/recent` | `magasin.view_activities` | `activityController.getRecentActivities` | Get recent activities |
| GET | `/api/magasin/activities/stats` | `magasin.view_stats` | `activityController.getActivityStats` | Get activity statistics |
| GET | `/api/magasin/activities/:entityType/:entityId` | `magasin.view_activities` | `activityController.getActivitiesByEntity` | Get activities for a specific entity |

---

### User Performance

**Path:** `/api/magasin/performance`
All routes require: `authenticate`, `companyIsolation`, `applyUserFilter`, `requirePermission(magasin.view_stats)`

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/performance/my-performance` | `userPerformanceController.getMyPerformance` | Get own performance metrics |
| GET | `/api/magasin/performance/summary` | `userPerformanceController.getUserPerformanceSummary` | Get performance summary for all users |
| GET | `/api/magasin/performance/comparison` | `userPerformanceController.getUserPerformanceComparison` | Compare performance across users |
| GET | `/api/magasin/performance/:userId/details` | `userPerformanceController.getUserDetailedPerformance` | Get detailed performance for a user |
| GET | `/api/magasin/performance/:userId/activity` | `userPerformanceController.getUserActivity` | Get activity breakdown for a user |

---

### Expiry

**Path:** `/api/magasin/expiry`
All routes require: `authenticate`, `companyIsolation`

| Method | Path | Controller | Description |
|--------|------|-----------|-------------|
| GET | `/api/magasin/expiry/expired-products` | `expiryController.getExpiredProducts` | Get all expired products |
| GET | `/api/magasin/expiry/near-expiry-products` | `expiryController.getNearExpiryProducts` | Get products near expiry |
| GET | `/api/magasin/expiry/products-expiry` | `expiryController.getProductsExpiryReport` | Get full expiry report |
| GET | `/api/magasin/expiry/expiry-dashboard` | `expiryController.getExpiryDashboard` | Get expiry dashboard data |
| GET | `/api/magasin/expiry/category-breakdown` | `expiryController.getCategoryExpiryBreakdown` | Get expiry breakdown by category |

---

## SUMMARY

| Section | Route Count |
|---------|-------------|
| Auth | 4 |
| Users (core) | 1 |
| Subscription | 10 |
| Super Admin | 21 |
| Client Module | 10 |
| Users Module | 12 |
| Magasin - Products | 19 |
| Magasin - Categories | 14 |
| Magasin - Stock | 6 |
| Magasin - Sales | 6 |
| Magasin - Invoices | 4 |
| Magasin - Financial | 5 |
| Magasin - Dashboard | 4 |
| Magasin - Reports | 15 |
| Magasin - Activities | 4 |
| Magasin - User Performance | 5 |
| Magasin - Expiry | 5 |
| **TOTAL** | **145** |

---

## MIDDLEWARE LEGEND

| Middleware | Description |
|-----------|-------------|
| `authenticate` | Validates JWT token, sets `req.user` |
| `companyIsolation` | Restricts data access to the user's company |
| `requireRole(...)` | Checks that user has one of the specified roles |
| `requirePermission(...)` | Checks that user has a specific permission key |
| `requireSuperAdmin` | Ensures user is a super administrator |
| `applyUserFilter` | Applies user-level data filter (operators see only their own data) |
| `validateRequest` | Validates request body/params against schema |
| `loginLimiter` | Rate limiter for login endpoint |
| `registerLimiter` | Rate limiter for registration endpoint |
| `passwordResetLimiter` | Rate limiter for password-related endpoints |

---

## ROLES

| Role | Description |
|------|-------------|
| `SUPERADMIN` | Platform-level administrator, full access |
| `ADMIN` | Company administrator, manages subscription and users |
| `SUPERVISOR` | Manages operations within company |
| `OPERATOR` | Standard operational user |
| `CASHIER` | Can create sales and invoices only |
