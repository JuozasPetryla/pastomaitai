export type NotificationType = 'sms' | 'email';

export type NotificationListItem = {
  id: number;
  personId: number;
  type: NotificationType;
  isSent: boolean;
  sentToProviderAt: string | null;
  createdAt: string;
};

export type Notification = NotificationListItem & {
  message: string;
  providerResponseAt: string | null;
};

export type NotificationFilters = {
  personId: string;
  type: NotificationType | '';
  isSent: 'true' | 'false' | '';
};

export type NotificationCreatePayload = {
  personId: number;
  message: string;
  type: NotificationType;
  sentToProviderAt?: string | null;
};

export type NotificationUpdatePayload = {
  message?: string;
  type?: NotificationType;
  sentToProviderAt?: string | null;
  providerResponseAt?: string | null;
  isSent?: boolean;
};
