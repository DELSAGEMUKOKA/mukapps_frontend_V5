// ==================== RESTAURANT MODULE ====================
  RESTAURANT: {
    // ─────────────────────────────────────────────
    // 1. Tables
    // ─────────────────────────────────────────────
    TABLES: ' /restaurant/tables',
    TABLE_BY_ID: (id: string) =>  `/restaurant/tables/${id}`,
    TABLE_STATUS: (id: string) =>  `/restaurant/tables/${id}/status`,
    TABLE_STATS: ' /restaurant/tables/stats',
    TABLES_BULK_STATUS: ' /restaurant/tables/bulk/status',

    // ─────────────────────────────────────────────
    // 2. Shifts (Caisses)
    // ─────────────────────────────────────────────
    SHIFTS: ' /restaurant/shifts',
    SHIFTS_CURRENT: ' /restaurant/shifts/current',
    SHIFT_BY_ID: (id: string) =>  `/restaurant/shifts/${id}`,
    SHIFT_REPORT: (id: string) =>  `/restaurant/shifts/${id}/report`,
    SHIFT_CLOSE: (id: string) =>  `/restaurant/shifts/${id}/close`,

    // ─────────────────────────────────────────────
    // 3. Menu - Catégories
    // ─────────────────────────────────────────────
    MENU_FULL: ' /restaurant/menu/full',
    MENU_CATEGORIES: ' /restaurant/menu/categories',
    MENU_CATEGORY_BY_ID: (id: string) =>  `/restaurant/menu/categories/${id}`,

    // ─────────────────────────────────────────────
    // 4. Menu - Articles
    // ─────────────────────────────────────────────
    MENU_ITEMS: ' /restaurant/menu/items',
    MENU_ITEM_BY_ID: (id: string) =>  `/restaurant/menu/items/${id}`,
    MENU_ITEM_AVAILABILITY: (id: string) =>  `/restaurant/menu/items/${id}/availability`,
    MENU_ITEM_STOCK_LINK: (id: string) =>  `/restaurant/menu/items/${id}/stock-link`,
    BAR_STOCK_REPORT: ' /restaurant/menu/bar-stock-report',

    // ─────────────────────────────────────────────
    // 5. Menu - Modificateurs
    // ─────────────────────────────────────────────
    MENU_ITEM_MODIFIERS: (itemId: string) =>  `/restaurant/menu/items/${itemId}/modifiers`,
    MENU_ITEM_MODIFIER_GROUP: (itemId: string, groupId: string) =>  `/restaurant/menu/items/${itemId}/modifiers/${groupId}`,
    MENU_ITEM_MODIFIER_OPTIONS: (itemId: string, groupId: string) =>  `/restaurant/menu/items/${itemId}/modifiers/${groupId}/options`,
    MENU_ITEM_MODIFIER_OPTION: (itemId: string, groupId: string, optionId: string) =>  `/restaurant/menu/items/${itemId}/modifiers/${groupId}/options/${optionId}`,

    // ─────────────────────────────────────────────
    // 6. Menu - Planification (Schedules)
    // ─────────────────────────────────────────────
    SCHEDULES: ' /restaurant/schedules',
    SCHEDULES_ACTIVE_NOW: ' /restaurant/schedules/active-now',
    SCHEDULE_BY_ID: (id: string) =>  `/restaurant/schedules/${id}`,

    // ─────────────────────────────────────────────
    // 7. Commandes (Orders)
    // ─────────────────────────────────────────────
    ORDERS: ' /restaurant/orders',
    ORDER_BY_ID: (id: string) =>  `/restaurant/orders/${id}`,
    ORDER_ITEMS: (orderId: string) =>  `/restaurant/orders/${orderId}/items`,
    ORDER_ITEM: (orderId: string, itemId: string) =>  `/restaurant/orders/${orderId}/items/${itemId}`,
    ORDER_SEND: (orderId: string) =>  `/restaurant/orders/${orderId}/send`,
    ORDER_CANCEL: (orderId: string) =>  `/restaurant/orders/${orderId}/cancel`,
    ORDER_TRANSFER: (orderId: string) =>  `/restaurant/orders/${orderId}/transfer`,
    ORDER_BILL: (orderId: string) =>  `/restaurant/orders/${orderId}/bill`,
    ORDER_BILL_DRAFT: (orderId: string) =>  `/restaurant/orders/${orderId}/bill/draft`,

    // ─────────────────────────────────────────────
    // 8. Transferts de table
    // ─────────────────────────────────────────────
    TRANSFERS: ' /restaurant/transfers',

    // ─────────────────────────────────────────────
    // 9. Cuisine / Bar (KDS)
    // ─────────────────────────────────────────────
    KITCHEN: ' /restaurant/kitchen',
    KITCHEN_READY: ' /restaurant/kitchen/ready',
    KITCHEN_ITEM_PREPARE: (id: string) =>  `/restaurant/kitchen/items/${id}/prepare`,
    KITCHEN_ITEM_READY: (id: string) =>  `/restaurant/kitchen/items/${id}/ready`,
    KITCHEN_ITEM_SERVED: (id: string) =>  `/restaurant/kitchen/items/${id}/served`,

    // ─────────────────────────────────────────────
    // 10. Retours cuisine
    // ─────────────────────────────────────────────
    RETURNS: ' /restaurant/returns',
    ORDER_RETURNS: (orderId: string) =>  `/restaurant/orders/${orderId}/returns`,
    RETURN_PROCESS: (returnId: string) =>  `/restaurant/returns/${returnId}/process`,

    // ─────────────────────────────────────────────
    // 11. Tickets (Bills / Facturation)
    // ─────────────────────────────────────────────
    BILLS: ' /restaurant/bills',
    BILL_BY_ID: (id: string) =>  `/restaurant/bills/${id}`,
    BILL_DRAFT_ITEMS: (billId: string) =>  `/restaurant/bills/${billId}/draft/items`,
    BILL_DRAFT_ITEM: (billId: string, itemId: string) =>  `/restaurant/bills/${billId}/draft/items/${itemId}`,
    BILL_DRAFT_NOTES: (billId: string) =>  `/restaurant/bills/${billId}/draft/notes`,
    BILL_DISCOUNT: (billId: string) =>  `/restaurant/bills/${billId}/discount`,
    BILL_VALIDATE: (billId: string) =>  `/restaurant/bills/${billId}/validate`,
    BILL_PAYMENT: (billId: string) =>  `/restaurant/bills/${billId}/payment`,
    BILL_SPLIT_EQUAL: (billId: string) =>  `/restaurant/bills/${billId}/split/equal`,
    BILL_SPLIT_BY_ITEMS: (billId: string) =>  `/restaurant/bills/${billId}/split/by-items`,
    BILL_SPLIT_PAY_PART: (billId: string) =>  `/restaurant/bills/${billId}/split/pay-part`,
    BILL_CLOSE: (billId: string) =>  `/restaurant/bills/${billId}/close`,
    BILL_CANCEL: (billId: string) =>  `/restaurant/bills/${billId}/cancel`,

    // ─────────────────────────────────────────────
    // 12. Réservations
    // ─────────────────────────────────────────────
    RESERVATIONS: ' /restaurant/reservations',
    RESERVATION_BY_ID: (id: string) =>  `/restaurant/reservations/${id}`,
    RESERVATION_CONFIRM: (id: string) =>  `/restaurant/reservations/${id}/confirm`,
    RESERVATION_ARRIVE: (id: string) =>  `/restaurant/reservations/${id}/arrive`,
    RESERVATION_COMPLETE: (id: string) =>  `/restaurant/reservations/${id}/complete`,
    RESERVATION_NO_SHOW: (id: string) =>  `/restaurant/reservations/${id}/no-show`,
    RESERVATION_CANCEL: (id: string) =>  `/restaurant/reservations/${id}/cancel`,

    // ─────────────────────────────────────────────
    // 13. Dashboard & Rapports
    // ─────────────────────────────────────────────
    DASHBOARD: '/restaurant/dashboard',
    REPORT_DAILY: '/restaurant/dashboard/reports/daily',
    REPORT_ITEMS: '/restaurant/dashboard/reports/items',
    REPORT_SERVERS: '/restaurant/dashboard/reports/servers',
    REPORT_TABLES: '/restaurant/dashboard/reports/tables',
    REPORT_PEAK_HOURS: '/restaurant/dashboard/reports/peak-hours',
    REPORT_TIPS: '/restaurant/dashboard/reports/tips',

    // ─────────────────────────────────────────────
    // 14. Unités de vente (Produits)
    // ─────────────────────────────────────────────
    PRODUCT_UNITS: (productId: string) => `/products/${productId}/units`,
    PRODUCT_UNIT_BY_ID: (productId: string, unitId: string) =>  `/products/${productId}/units/${unitId}`,
    PRODUCT_UNITS_BULK: (productId: string) => `/products/${productId}/units/bulk`,
  },
