import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  Notification,
  NotificationCreatePayload,
  NotificationListItem,
  NotificationType,
  NotificationUpdatePayload,
} from '../models/notification';

type ApiNotificationType = 'sms' | 'el_pastas';

type NotificationListItemResponse = {
  id: number;
  asmuo_id: number;
  tipas: ApiNotificationType;
  issiustas: boolean;
  issiuntimo_operatoriui_data: string | null;
  created_at: string;
};

type NotificationResponse = NotificationListItemResponse & {
  tekstas: string;
  operatoriaus_atsako_data: string | null;
};

const notificationTypeFromApi: Record<ApiNotificationType, NotificationType> = {
  sms: 'sms',
  el_pastas: 'email',
};

const notificationTypeToApi: Record<NotificationType, ApiNotificationType> = {
  sms: 'sms',
  email: 'el_pastas',
};

function toListItem(response: NotificationListItemResponse): NotificationListItem {
  return {
    id: response.id,
    personId: response.asmuo_id,
    type: notificationTypeFromApi[response.tipas],
    isSent: response.issiustas,
    sentToProviderAt: response.issiuntimo_operatoriui_data,
    createdAt: response.created_at,
  };
}

function toNotification(response: NotificationResponse): Notification {
  return {
    ...toListItem(response),
    message: response.tekstas,
    providerResponseAt: response.operatoriaus_atsako_data,
  };
}

export async function fetchNotifications(params: {
  personId?: number;
  type?: NotificationType;
  isSent?: boolean;
}): Promise<NotificationListItem[]> {
  const searchParams = new URLSearchParams();

  if (params.personId !== undefined) {
    searchParams.set('person_id', String(params.personId));
  }

  if (params.type) {
    searchParams.set('type', notificationTypeToApi[params.type]);
  }

  if (params.isSent !== undefined) {
    searchParams.set('is_sent', String(params.isSent));
  }

  const query = searchParams.toString();
  const response = await apiGet<NotificationListItemResponse[]>(
    `/api/notifications${query ? `?${query}` : ''}`,
  );

  return response.map(toListItem);
}

export async function fetchNotification(id: number): Promise<Notification> {
  const response = await apiGet<NotificationResponse>(`/api/notifications/${id}`);
  return toNotification(response);
}

export async function createNotification(
  payload: NotificationCreatePayload,
): Promise<Notification> {
  const response = await apiPost<
    NotificationResponse,
    {
      asmuo_id: number;
      tekstas: string;
      tipas: ApiNotificationType;
      issiuntimo_operatoriui_data?: string | null;
    }
  >('/api/notifications', {
    asmuo_id: payload.personId,
    tekstas: payload.message,
    tipas: notificationTypeToApi[payload.type],
    issiuntimo_operatoriui_data: payload.sentToProviderAt,
  });
  return toNotification(response);
}

export async function updateNotification(
  id: number,
  payload: NotificationUpdatePayload,
): Promise<Notification> {
  const response = await apiPatch<
    NotificationResponse,
    {
      tekstas?: string;
      tipas?: ApiNotificationType;
      issiuntimo_operatoriui_data?: string | null;
      operatoriaus_atsako_data?: string | null;
      issiustas?: boolean;
    }
  >(`/api/notifications/${id}`, {
    ...(payload.message ? { tekstas: payload.message } : {}),
    ...(payload.type ? { tipas: notificationTypeToApi[payload.type] } : {}),
    ...(payload.sentToProviderAt !== undefined
      ? { issiuntimo_operatoriui_data: payload.sentToProviderAt }
      : {}),
    ...(payload.providerResponseAt !== undefined
      ? { operatoriaus_atsako_data: payload.providerResponseAt }
      : {}),
    ...(payload.isSent !== undefined ? { issiustas: payload.isSent } : {}),
  });
  return toNotification(response);
}

export async function deleteNotification(id: number): Promise<void> {
  await apiDelete(`/api/notifications/${id}`);
}
