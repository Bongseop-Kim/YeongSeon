export {
  sendPhoneVerification,
  verifyPhone,
  saveNotificationConsent,
  updateNotificationEnabled,
} from "./api/notification-api";
export {
  notificationStatusKeys,
  useNotificationStatus,
} from "./api/notification-status-query";
export type { NotificationStatus } from "./model/notification-status";
