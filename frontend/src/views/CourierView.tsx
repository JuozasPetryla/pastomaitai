import { useEffect, useState } from 'react';

import {
  createCourier,
  deleteCourier,
  fetchCourier,
  fetchCouriers,
  updateCourier,
} from '../api/courierApi';
import { fetchCourierLockers, type CourierLockerListItem } from '../api/courierLockerApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { CourierActions } from '../components/CourierActions';
import { CourierDetails } from '../components/CourierDetails';
import { CourierFilters } from '../components/CourierFilters';
import { CourierForm } from '../components/CourierForm';
import { CourierList } from '../components/CourierList';
import { CourierLockerList } from '../components/CourierLockerList';
import { CourierLockerTerminal } from '../components/CourierLockerTerminal';
import type {
  Courier,
  CourierCreatePayload,
  CourierFilters as CourierFiltersType,
  CourierListItem,
  CourierUpdatePayload,
} from '../models/courier';

type FormMode = 'create' | 'edit';
type WorkflowTab = 'couriers' | 'lockers';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function CourierView() {
  const [tab, setTab] = useState<WorkflowTab>('couriers');

  // ── Courier management state ──────────────────────────────────────────────
  const [filters, setFilters] = useState<CourierFiltersType>({ role: '' });
  const [couriers, setCouriers] = useState<CourierListItem[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Select filters or a courier.');
  const [formMode, setFormMode] = useState<FormMode>();

  // ── Locker service state ──────────────────────────────────────────────────
  const [lockers, setLockers] = useState<CourierLockerListItem[]>([]);
  const [selectedLockerId, setSelectedLockerId] = useState<number>();
  const [lockerStatus, setLockerStatus] = useState('Loading parcel machines...');

  // ── Shared modal state ────────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>();
  const closeModal = () => setModal(undefined);
  const showError = (message: string) => {
    setModal({
      title: 'Error',
      message,
      actions: [{ label: 'Close', onClick: closeModal, variant: 'primary' }],
    });
  };

  // ── Courier CRUD ──────────────────────────────────────────────────────────

  const loadCouriers = async (nextFilters: CourierFiltersType = filters) => {
    setFilters(nextFilters);
    setStatus('Loading couriers...');
    try {
      const items = await fetchCouriers(nextFilters);
      setCouriers(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedCourier(undefined);
      }
      setStatus(items.length ? 'Courier list loaded.' : 'No couriers found.');
      return items;
    } catch (caught) {
      setCouriers([]);
      showError(caught instanceof Error ? caught.message : 'Failed to load couriers.');
      setStatus('Failed to load couriers.');
      return [];
    }
  };

  const selectCourier = async (id: number) => {
    setSelectedId(id);
    setStatus('Loading courier details...');
    try {
      setSelectedCourier(await fetchCourier(id));
      setStatus('Courier details loaded.');
    } catch (caught) {
      setSelectedCourier(undefined);
      showError(caught instanceof Error ? caught.message : 'Failed to load courier details.');
      setStatus('Failed to load courier details.');
    }
  };

  const handleCreate = async (payload: CourierCreatePayload) => {
    try {
      const created = await createCourier(payload);
      setSelectedId(created.id);
      setSelectedCourier(created);
      setFormMode(undefined);
      await loadCouriers();
      setStatus('Courier created successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to create courier.');
    }
  };

  const handleUpdate = async (payload: CourierUpdatePayload) => {
    if (!selectedId) return;
    try {
      const updated = await updateCourier(selectedId, payload);
      setSelectedCourier(updated);
      setFormMode(undefined);
      await loadCouriers();
      setStatus('Courier updated successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to update courier.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await deleteCourier(selectedId);
      setSelectedId(undefined);
      setSelectedCourier(undefined);
      setFormMode(undefined);
      await loadCouriers();
      setStatus('Courier deleted successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to delete courier.');
      setStatus(caught instanceof Error ? caught.message : 'Failed to delete courier.');
    }
  };

  const requestDelete = () => {
    if (!selectedCourier) { showError('Select a courier to delete.'); return; }
    setModal({
      title: 'Delete courier?',
      message: `Courier "${selectedCourier.firstName} ${selectedCourier.lastName}" will be permanently removed.`,
      actions: [
        { label: 'Cancel', onClick: closeModal, variant: 'secondary' },
        {
          label: 'Delete',
          variant: 'danger',
          onClick: () => { closeModal(); void handleDelete(); },
        },
      ],
    });
  };

  // ── Locker list ───────────────────────────────────────────────────────────

  const loadLockers = async () => {
    setLockerStatus('Loading parcel machines...');
    try {
      const items = await fetchCourierLockers();
      setLockers(items);
      setLockerStatus(items.length ? 'Select a parcel machine to service.' : 'No active parcel machines.');
    } catch (caught) {
      setLockers([]);
      setLockerStatus('Failed to load parcel machines.');
      showError(caught instanceof Error ? caught.message : 'Failed to load parcel machines.');
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadCouriers(filters); }, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role]);

  useEffect(() => {
    if (tab === 'lockers') { void loadLockers(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="admin-workflow">
      {/* Top-level tabs */}
      <div className="courier-view-tabs">
        <button
          className={tab === 'couriers' ? 'active' : ''}
          type="button"
          onClick={() => setTab('couriers')}
        >
          Courier Management
        </button>
        <button
          className={tab === 'lockers' ? 'active' : ''}
          type="button"
          onClick={() => setTab('lockers')}
        >
          Service Parcel Machines
        </button>
      </div>

      {/* ── Courier Management ── */}
      {tab === 'couriers' && (
        <>
          <CourierFilters filters={filters} onChange={setFilters} />
          <CourierActions
            canEdit={selectedCourier !== undefined}
            canDelete={selectedId !== undefined}
            onCreate={() => setFormMode('create')}
            onEdit={() => setFormMode('edit')}
            onDelete={requestDelete}
          />

          {formMode ? (
            <CourierForm
              mode={formMode}
              courier={selectedCourier}
              onCancel={() => setFormMode(undefined)}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onError={showError}
            />
          ) : null}

          <div className="admin-grid">
            <section aria-label="Courier list">
              <p className="workflow-status">{status}</p>
              <CourierList activeId={selectedId} items={couriers} onSelect={selectCourier} />
            </section>
            <section aria-label="Selected courier details">
              <CourierDetails courier={selectedCourier} />
            </section>
          </div>
        </>
      )}

      {/* ── Locker Service ── */}
      {tab === 'lockers' && (
        <div className="admin-grid">
          <section aria-label="Parcel machine list">
            <p className="workflow-status">{lockerStatus}</p>
            <CourierLockerList
              lockers={lockers}
              selectedId={selectedLockerId}
              onSelect={(id) => {
                setSelectedLockerId(id);
              }}
            />
          </section>

          <section aria-label="Locker service terminal">
            {selectedLockerId ? (
              <CourierLockerTerminal
                lockerId={selectedLockerId}
                onError={showError}
              />
            ) : (
              <p className="empty-state">Select a parcel machine to start servicing.</p>
            )}
          </section>
        </div>
      )}

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}