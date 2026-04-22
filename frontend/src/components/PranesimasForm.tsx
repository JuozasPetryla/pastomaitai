import { useEffect, useState } from 'react';

import type {
  Notification,
  NotificationCreatePayload,
  NotificationType,
  NotificationUpdatePayload,
} from '../models/pranesimas';

type NotificationFormMode = 'create' | 'edit';

type NotificationFormProps = {
  mode: NotificationFormMode;
  notification?: Notification;
  onCancel: () => void;
  onCreate: (payload: NotificationCreatePayload) => Promise<void>;
  onUpdate: (payload: NotificationUpdatePayload) => Promise<void>;
  onError: (message: string) => void;
};

type FormState = {
  personId: string;
  message: string;
  type: NotificationType;
  sentToProviderAt: string;
  providerResponseAt: string;
  isSent: boolean;
};

const notificationTypes: NotificationType[] = ['sms', 'email'];

function getInitialState(mode: NotificationFormMode, notification?: Notification): FormState {
  return {
    personId: notification ? String(notification.personId) : '',
    message: notification?.message ?? '',
    type: notification?.type ?? 'sms',
    sentToProviderAt: notification?.sentToProviderAt ?? '',
    providerResponseAt: notification?.providerResponseAt ?? '',
    isSent: notification?.isSent ?? false,
  };
}

export function NotificationForm({
  mode,
  notification,
  onCancel,
  onCreate,
  onUpdate,
  onError,
}: NotificationFormProps) {
  const [form, setForm] = useState<FormState>(() => getInitialState(mode, notification));

  useEffect(() => {
    setForm(getInitialState(mode, notification));
  }, [mode, notification]);

  const submit = async () => {
    if (form.message.trim().length < 1) {
      onError('Message cannot be empty.');
      return;
    }

    if (mode === 'create') {
      const personId = parseInt(form.personId, 10);
      if (!personId || personId < 1) {
        onError('Enter a valid person ID.');
        return;
      }

      await onCreate({
        personId,
        message: form.message.trim(),
        type: form.type,
        sentToProviderAt: form.sentToProviderAt || null,
      });
      return;
    }

    await onUpdate({
      message: form.message.trim(),
      type: form.type,
      sentToProviderAt: form.sentToProviderAt || null,
      providerResponseAt: form.providerResponseAt || null,
      isSent: form.isSent,
    });
  };

  return (
    <section className="locker-form" aria-label="Notification form">
      <header>
        <h3>{mode === 'create' ? 'Create notification' : 'Edit notification'}</h3>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </header>

      <div className="form-grid">
        {mode === 'create' && (
          <label>
            <span>Person ID</span>
            <input
              type="number"
              min={1}
              value={form.personId}
              onChange={(event) => setForm({ ...form, personId: event.target.value })}
            />
          </label>
        )}

        <label>
          <span>Type</span>
          <select
            value={form.type}
            onChange={(event) =>
              setForm({ ...form, type: event.target.value as NotificationType })
            }
          >
            {notificationTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'sms' ? 'SMS' : 'Email'}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Message</span>
          <textarea
            rows={4}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
          />
        </label>

        <label>
          <span>Sent to provider date</span>
          <input
            type="date"
            value={form.sentToProviderAt}
            onChange={(event) => setForm({ ...form, sentToProviderAt: event.target.value })}
          />
        </label>

        {mode === 'edit' && (
          <>
            <label>
              <span>Provider response date</span>
              <input
                type="date"
                value={form.providerResponseAt}
                onChange={(event) => setForm({ ...form, providerResponseAt: event.target.value })}
              />
            </label>

            <label className="checkbox-label">
              <span>Sent</span>
              <input
                type="checkbox"
                checked={form.isSent}
                onChange={(event) => setForm({ ...form, isSent: event.target.checked })}
              />
            </label>
          </>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={submit}>
          {mode === 'create' ? 'Create' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
