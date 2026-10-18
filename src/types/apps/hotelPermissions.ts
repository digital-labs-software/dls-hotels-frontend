export const DASHBOARD_VIEW = 'dashboard.view'

export const RECEPTION_DESK_VIEW = 'reception.desk.view'
export const RECEPTION_WALK_IN = 'reception.walk-in'
export const RECEPTION_CHECK_IN = 'reception.check-in'
export const RECEPTION_CHECK_OUT = 'reception.check-out'
export const RECEPTION_PAYMENTS_VIEW = 'reception.payments.view'
export const RECEPTION_PAYMENTS_CREATE = 'reception.payments.create'

export const RESERVATIONS_CALENDAR_VIEW = 'reservations.calendar.view'
export const RESERVATIONS_LIST_VIEW = 'reservations.list.view'
export const RESERVATIONS_NOTES_VIEW = 'reservations.notes.view'
export const RESERVATIONS_CREATE = 'reservations.create'
export const RESERVATIONS_EDIT = 'reservations.edit'
export const RESERVATIONS_CANCEL = 'reservations.cancel'
export const RESERVATIONS_NOTES_MANAGE = 'reservations.notes.manage'

export const PRICES_VIEW = 'prices.view'
export const AUDIT_VIEW = 'audit.view'

export const ROOMS_VIEW = 'rooms.view'
export const ROOMS_CREATE = 'rooms.create'
export const ROOMS_EDIT = 'rooms.edit'
export const ROOMS_DELETE = 'rooms.delete'
export const RATES_VIEW = 'rates.view'
export const RATES_CREATE = 'rates.create'
export const RATES_EDIT = 'rates.edit'
export const RATES_DELETE = 'rates.delete'
export const ROOM_TYPES_VIEW = 'room-types.view'
export const ROOM_TYPES_CREATE = 'room-types.create'
export const ROOM_TYPES_EDIT = 'room-types.edit'
export const ROOM_TYPES_DELETE = 'room-types.delete'
export const FLOORS_VIEW = 'floors.view'
export const FLOORS_CREATE = 'floors.create'
export const FLOORS_EDIT = 'floors.edit'
export const FLOORS_DELETE = 'floors.delete'

export const GUESTS_VIEW = 'guests.view'
export const GUESTS_CREATE = 'guests.create'
export const GUESTS_EDIT = 'guests.edit'
export const GUESTS_DELETE = 'guests.delete'
export const COMPANIES_VIEW = 'companies.view'
export const COMPANIES_CREATE = 'companies.create'
export const COMPANIES_EDIT = 'companies.edit'
export const COMPANIES_DELETE = 'companies.delete'

export const REPORTS_ARRIVALS_VIEW = 'reports.arrivals.view'
export const REPORTS_DEPARTURES_VIEW = 'reports.departures.view'
export const REPORTS_IN_HOUSE_VIEW = 'reports.in-house.view'
export const REPORTS_HOUSEKEEPING_VIEW = 'reports.housekeeping.view'
export const REPORTS_INVOICES_VIEW = 'reports.invoices.view'
export const REPORTS_BALANCES_VIEW = 'reports.balances.view'
export const REPORTS_OCCUPANCY_VIEW = 'reports.occupancy.view'
export const REPORTS_MINCETUR_VIEW = 'reports.mincetur.view'
export const REPORTS_SOURCES_VIEW = 'reports.sources.view'
export const REPORTS_COMPANIES_VIEW = 'reports.companies.view'
export const REPORTS_CANCELLATIONS_VIEW = 'reports.cancellations.view'

export const SUBSCRIPTION_HISTORY_VIEW = 'subscription.history.view'

export const EMPLOYEES_CREATE = 'employees.create'
export const EMPLOYEES_EDIT = 'employees.edit'
export const EMPLOYEES_DELETE = 'employees.delete'
export const ROLES_CREATE = 'roles.create'
export const ROLES_EDIT = 'roles.edit'
export const ROLES_DELETE = 'roles.delete'

export const HOTEL_VIEW = 'hotel.view'
export const HOTEL_EDIT = 'hotel.edit'
export const HOTEL_LOGO = 'hotel.logo'

export const SUPPORT_ACTIVE_VIEW = 'support.active.view'
export const SUPPORT_RESOLVED_VIEW = 'support.resolved.view'
export const SUPPORT_CREATE = 'support.create'
export const SUPPORT_REPLY = 'support.reply'
export const SUPPORT_RESOLVE = 'support.resolve'

export const CASH_VIEW = 'cash.view'
export const CASH_OPEN = 'cash.open'
export const CASH_EXPENSE = 'cash.expense'
export const CASH_CLOSE = 'cash.close'

export const PROFILE_VIEW = 'profile.view'
export const PROFILE_EDIT = 'profile.edit'
export const PROFILE_PASSWORD = 'profile.password'

export const REPORT_TAB_PERMISSION: Record<string, string> = {
  arrivals: REPORTS_ARRIVALS_VIEW,
  departures: REPORTS_DEPARTURES_VIEW,
  'in-house': REPORTS_IN_HOUSE_VIEW,
  housekeeping: REPORTS_HOUSEKEEPING_VIEW,
  invoices: REPORTS_INVOICES_VIEW,
  balances: REPORTS_BALANCES_VIEW,
  occupancy: REPORTS_OCCUPANCY_VIEW,
  mincetur: REPORTS_MINCETUR_VIEW,
  audit: AUDIT_VIEW,
  sources: REPORTS_SOURCES_VIEW,
  companies: REPORTS_COMPANIES_VIEW,
  cancellations: REPORTS_CANCELLATIONS_VIEW
}

export const RECEPTION_PERMISSIONS = [
  RECEPTION_DESK_VIEW,
  RECEPTION_WALK_IN,
  RECEPTION_CHECK_IN,
  RECEPTION_CHECK_OUT,
  RECEPTION_PAYMENTS_VIEW,
  RECEPTION_PAYMENTS_CREATE
]

export const RESERVATION_PERMISSIONS = [
  RESERVATIONS_CALENDAR_VIEW,
  RESERVATIONS_LIST_VIEW,
  RESERVATIONS_NOTES_VIEW,
  RESERVATIONS_CREATE,
  RESERVATIONS_EDIT,
  RESERVATIONS_CANCEL,
  RESERVATIONS_NOTES_MANAGE
]

export const ROOM_MENU_PERMISSIONS = [
  ROOMS_VIEW,
  ROOMS_CREATE,
  ROOMS_EDIT,
  ROOMS_DELETE,
  RATES_VIEW,
  RATES_CREATE,
  RATES_EDIT,
  RATES_DELETE,
  ROOM_TYPES_VIEW,
  ROOM_TYPES_CREATE,
  ROOM_TYPES_EDIT,
  ROOM_TYPES_DELETE,
  FLOORS_VIEW,
  FLOORS_CREATE,
  FLOORS_EDIT,
  FLOORS_DELETE
]

export const CLIENT_MENU_PERMISSIONS = [
  GUESTS_VIEW,
  GUESTS_CREATE,
  GUESTS_EDIT,
  GUESTS_DELETE,
  COMPANIES_VIEW,
  COMPANIES_CREATE,
  COMPANIES_EDIT,
  COMPANIES_DELETE
]

export const REPORT_MENU_PERMISSIONS = Object.values(REPORT_TAB_PERMISSION)

export const CASH_MENU_PERMISSIONS = [CASH_VIEW, CASH_OPEN, CASH_EXPENSE, CASH_CLOSE]

export const HOTEL_MENU_PERMISSIONS = [HOTEL_VIEW, HOTEL_EDIT, HOTEL_LOGO]

export const SUPPORT_MENU_PERMISSIONS = [
  SUPPORT_ACTIVE_VIEW,
  SUPPORT_RESOLVED_VIEW,
  SUPPORT_CREATE,
  SUPPORT_REPLY,
  SUPPORT_RESOLVE
]

export const PROFILE_MENU_PERMISSIONS = [PROFILE_VIEW, PROFILE_EDIT, PROFILE_PASSWORD]
