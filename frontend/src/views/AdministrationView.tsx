import { useEffect, useState } from 'react';

import {
  createLocker,
  deleteLocker,
  fetchLocker,
  fetchLockers,
  updateLocker,
} from '../api/administrationApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { LockerActions } from '../components/PastomatoActions';
import { LockerDetails } from '../components/PastomatoDetails';
import { LockerForm } from '../components/PastomatoForm';
import { LockerFilters } from '../components/PastomatuFilters';
import { LockerList } from '../components/PastomatuList';
import type {
  Locker,
  LockerCreatePayload,
  LockerFilters as LockerFiltersType,
  LockerListItem,
  LockerUpdatePayload,
} from '../models/pastomatas';

type FormMode = 'create' | 'edit';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function AdministrationView() {
  const [filters, setFilters] = useState<LockerFiltersType>({ region: '', status: '' });
  const [lockers, setLockers] = useState<LockerListItem[]>([]);
  const [selectedLocker, setSelectedLocker] = useState<Locker>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Select filters or a locker.');
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

  const loadLockers = async (
    nextFilters: LockerFiltersType = filters,
  ): Promise<LockerListItem[]> => {
    setFilters(nextFilters);
    setStatus('Loading lockers...');
    try {
      const items = await fetchLockers({
        region: nextFilters.region || undefined,
        status: nextFilters.status || undefined,
      });
      setLockers(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedLocker(undefined);
      }
      setStatus(items.length ? 'Locker list loaded.' : 'No lockers found.');
      return items;
    } catch (caught) {
      setLockers([]);
      showError(caught instanceof Error ? caught.message : 'Failed to load lockers.');
      setStatus('Failed to load lockers.');
      return [];
    }
  };

  const selectLocker = async (id: number) => {
    setSelectedId(id);
    setStatus('Loading locker details...');
    try {
      setSelectedLocker(await fetchLocker(id));
      setStatus('Locker details loaded.');
    } catch (caught) {
      setSelectedLocker(undefined);
      showError(caught instanceof Error ? caught.message : 'Failed to load locker details.');
      setStatus('Failed to load locker details.');
    }
  };

  const handleCreate = async (payload: LockerCreatePayload) => {
    try {
      const created = await createLocker(payload);
      setSelectedId(created.id);
      setSelectedLocker(created);
      setFormMode(undefined);
      await loadLockers();
      setStatus('Locker created successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to create locker.');
    }
  };

  const handleUpdate = async (payload: LockerUpdatePayload) => {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await updateLocker(selectedId, payload);
      setSelectedLocker(updated);
      setFormMode(undefined);
      await loadLockers();
      setStatus('Locker updated successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to update locker.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await deleteLocker(selectedId);
      setSelectedId(undefined);
      setSelectedLocker(undefined);
      setFormMode(undefined);
      await loadLockers();
      setStatus('Locker deleted successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to delete locker.');
      setStatus(caught instanceof Error ? caught.message : 'Failed to delete locker.');
    }
  };

  const requestDelete = () => {
    if (!selectedLocker) {
      showError('Select a locker to delete.');
      return;
    }

    setModal({
      title: 'Delete locker?',
      message: `Locker "${selectedLocker.address}" will be permanently removed.`,
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
      void loadLockers(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.region, filters.status]);

  return (
    <div className="admin-workflow">
      <LockerFilters filters={filters} onChange={setFilters} />
      <LockerActions
        canEdit={selectedLocker !== undefined}
        canDelete={selectedId !== undefined}
        onCreate={() => setFormMode('create')}
        onEdit={() => setFormMode('edit')}
        onDelete={requestDelete}
      />

      {formMode ? (
        <LockerForm
          mode={formMode}
          locker={selectedLocker}
          onCancel={() => setFormMode(undefined)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onError={showError}
        />
      ) : null}

      <div className="admin-grid">
        <section aria-label="Locker list">
          <p className="workflow-status">{status}</p>
          <LockerList activeId={selectedId} items={lockers} onSelect={selectLocker} />
        </section>

        <section aria-label="Selected locker details">
          <LockerDetails locker={selectedLocker} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
