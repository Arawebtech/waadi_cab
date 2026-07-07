/**
 * Endpoint paths copied verbatim from vehicleRoutes.js and subscriptionRoutes.js.
 *
 * IMPORTANT — read this before wiring anything else up:
 * subscriptionRoutes.js references several controller functions that do not
 * exist in subscriptionController_copy.js (the active, uncommented part of
 * the file). Mounting that router as-is will throw
 * `Route.get() requires a callback function but got a [object Undefined]`
 * at server boot, so these paths are currently broken on the backend:
 *
 *   route                          controller fn referenced   actual export
 *   ------------------------------ --------------------------  --------------------------
 *   POST /purchase/testing         purchasePlanTesting          (does not exist)
 *   GET  /check-status             checkSubscriptionStatus      (does not exist)
 *   GET  /history                  getMySubscriptionHistory      getSubscriptionHistory
 *   DELETE /admin/plans/:id        deletePlan                    safeDeletePlan
 *   PATCH  /admin/plans/:id/status togglePlanStatus              (does not exist — use PUT
 *                                                                 /admin/plans/:id with
 *                                                                 { isActive })
 *   GET  /admin/:id                getSubscriptionById            getSubscriptionByIdAdmin
 *   PATCH /admin/:id/expire         expireSubscription            expireSubscriptions (bulk,
 *                                                                 no :id param)
 *   PATCH /admin/:id/auto-renew    autoRenewSubscription          (does not exist)
 *   GET  /admin/history            getAllSubscriptionHistoryAdmin (does not exist)
 *   DELETE /admin/history/:id       deleteSubscriptionHistory      (does not exist)
 *   PATCH /admin/history/:id/restore restoreSubscriptionHistory   (does not exist)
 *
 * Similarly, vehicleRoutes.js imports getAllVehicles, getPendingVehicles,
 * verifyVehicle, verifyDocument from vehicleController.js, but that
 * controller only exports createVehicle, getMyVehicles, getVehicleById,
 * updateVehicle, deleteVehicle, uploadDocument, deleteDocument. The entire
 * `/admin/*` block of vehicleRoutes.js is currently unwired.
 *
 * This frontend only calls the endpoints that are actually implemented
 * today (driver-facing vehicle CRUD/docs, driver-facing subscription
 * purchase/renew/cancel/history, and admin plan CRUD). The admin
 * vehicle-verification screens and the admin subscription-history screens
 * are left as clearly marked TODOs — wire them up once the corresponding
 * backend handlers exist. Nothing here was changed in your backend files.
 */

export const VEHICLE_ENDPOINTS = {
  list: '/vehicles',
  create: '/vehicles',
  detail: (id: string) => `/vehicles/${id}`,
  update: (id: string) => `/vehicles/${id}`,
  remove: (id: string) => `/vehicles/${id}`,
  uploadDocument: (id: string) => `/vehicles/${id}/document`,
  deleteDocument: (id: string, documentType: string) =>
    `/vehicles/${id}/document/${documentType}`,
} as const;

export const SUBSCRIPTION_ENDPOINTS = {
  plans: '/subscriptions/plans',
  purchase: '/subscriptions/purchase',
  purchaseWallet: '/subscriptions/purchase/wallet',
  renew: '/subscriptions/renew',
  paymentSuccess: '/subscriptions/payment/success',
  paymentFailed: '/subscriptions/payment/failed',
  mySubscription: '/subscriptions/me',
  history: '/subscriptions/history',
  cancel: '/subscriptions/cancel',

  // Admin plan management (controller functions confirmed to exist)
  adminPlans: '/subscriptions/admin/plans',
  adminCreatePlan: '/subscriptions/admin/plans',
  adminUpdatePlan: (id: string) => `/subscriptions/admin/plans/${id}`,
  // NOTE: route file wires this to `deletePlan`, which doesn't exist; the
  // real handler is `safeDeletePlan`. Path/method are unaffected, only the
  // backend needs a one-line export alias fix.
  adminDeletePlan: (id: string) => `/subscriptions/admin/plans/${id}`,
} as const;
