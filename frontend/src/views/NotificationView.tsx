import { useEffect, useState } from 'react';

import {
  createNotification,
  deleteNotification,
  fetchNotification,
  fetchNotifications,
  updateNotification,
} from '../api/notificationApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { NotificationActions } from '../components/PranesimasActions';
import { NotificationDetails } from '../components/PranesimasDetails';
import { NotificationForm } from '../components/PranesimasForm';
import { NotificationFilters } from '../components/PranesimuFilters';
import { NotificationList } from '../components/PranesimuList';
import type {
  Notification,
  NotificationCreatePayload,
  NotificationFilters as NotificationFiltersType,
  NotificationListItem,
  NotificationUpdatePayload,
} from '../models/pranesimas';

type FormMode = 'create' | 'edit';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function NotificationView() {
  const [filters, setFilters] = useState<NotificationFiltersType>({
    personId: '',
    type: '',
    isSent: '',
  });
  const [notifications, setNotifications] = useState<NotificationListItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Select filters or a notification.');
  const [formMode, setFormMode] = useState<FormMode>();
  const [modal, setModal] = useState<ModalState>();

  const closeModal = () => setModal(undefined);

  const showError = (message: string) => {
    setModal({
      title: 'Error',
      message,
      actions: [{ label: 'Close', onClick: closeModal, variant: 'primary' }],
    });
  };

  const loadNotifications = async (
    nextFilters: NotificationFiltersType = filters,
  ): Promise<NotificationListItem[]> => {
    setFilters(nextFilters);
    setStatus('Loading notifications...');
    try {
      const items = await fetchNotifications({
        personId: nextFilters.personId ? parseInt(nextFilters.personId, 10) : undefined,
        type: nextFilters.type || undefined,
        isSent:
          nextFilters.isSent === 'true'
            ? true
            : nextFilters.isSent === 'false'
              ? false
              : undefined,
      });
      setNotifications(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedNotification(undefined);
      }
      setStatus(items.length ? 'Notification list loaded.' : 'No notifications found.');
      return items;
    } catch (caught) {
      setNotifications([]);
      showError(caught instanceof Error ? caught.message : 'Failed to load notifications.');
      setStatus('Failed to load notifications.');
      return [];
    }
  };

  const selectNotification = async (id: number) => {
    setSelectedId(id);
    setStatus('Loading notification details...');
    try {
      setSelectedNotification(await fetchNotification(id));
      setStatus('Notification details loaded.');
    } catch (caught) {
      setSelectedNotification(undefined);
      showError(caught instanceof Error ? caught.message : 'Failed to load notification details.');
      setStatus('Failed to load notification details.');
    }
  };

  const handleCreate = async (payload: NotificationCreatePayload) => {
    try {
      const created = await createNotification(payload);
      setSelectedId(created.id);
      setSelectedNotification(created);
      setFormMode(undefined);
      await loadNotifications();
      setStatus('Notification created successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to create notification.');
    }
  };

  const handleUpdate = async (payload: NotificationUpdatePayload) => {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await updateNotification(selectedId, payload);
      setSelectedNotification(updated);
      setFormMode(undefined);
      await loadNotifications();
      setStatus('Notification updated successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to update notification.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await deleteNotification(selectedId);
      setSelectedId(undefined);
      setSelectedNotification(undefined);
      setFormMode(undefined);
      await loadNotifications();
      setStatus('Notification deleted successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to delete notification.');
      setStatus(caught instanceof Error ? caught.message : 'Failed to delete notification.');
    }
  };

  const requestDelete = () => {
    if (!selectedNotification) {
      showError('Select a notification to delete.');
      return;
    }

    setModal({
      title: 'Delete notification?',
      message: `Notification #${selectedNotification.id} (${selectedNotification.type === 'sms' ? 'SMS' : 'Email'}, person #${selectedNotification.personId}) will be permanently removed.`,
      actions: [
        { label: 'Cancel', onClick: closeModal, variant: 'secondary' },
        {
          label: 'Delete',
          variant: 'danger',
          onClick: () => {
            closeModal();
            void handleDelete();
          },
        },
      ],
    });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadNotifications(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.personId, filters.type, filters.isSent]);

  return (
    <div className="admin-workflow">
      <NotificationFilters filters={filters} onChange={setFilters} />
      <NotificationActions
        canEdit={selectedNotification !== undefined}
        canDelete={selectedId !== undefined}
        onCreate={() => setFormMode('create')}
        onEdit={() => setFormMode('edit')}
        onDelete={requestDelete}
      />

      {formMode ? (
        <NotificationForm
          mode={formMode}
          notification={selectedNotification}
          onCancel={() => setFormMode(undefined)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onError={showError}
        />
      ) : null}

      <div className="admin-grid">
        <section aria-label="Notification list">
          <p className="workflow-status">{status}</p>
          <NotificationList
            activeId={selectedId}
            items={notifications}
            onSelect={selectNotification}
          />
        </section>

        <section aria-label="Selected notification details">
          <NotificationDetails notification={selectedNotification} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
