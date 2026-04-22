import { useEffect, useState } from 'react';

import {
  createCourier,
  deleteCourier,
  fetchCourier,
  fetchCouriers,
  updateCourier,
} from '../api/courierApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { CourierActions } from '../components/CourierActions';
import { CourierDetails } from '../components/CourierDetails';
import { CourierFilters } from '../components/CourierFilters';
import { CourierForm } from '../components/CourierForm';
import { CourierList } from '../components/CourierList';
import type {
  Courier,
  CourierCreatePayload,
  CourierFilters as CourierFiltersType,
  CourierListItem,
  CourierUpdatePayload,
} from '../models/courier';

type FormMode = 'create' | 'edit';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function CourierView() {
  const [filters, setFilters] = useState<CourierFiltersType>({ pareigos: '' });
  const [couriers, setCouriers] = useState<CourierListItem[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<Courier>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Pasirinkite filtrus arba kurjeri.');
  const [formMode, setFormMode] = useState<FormMode>();
  const [modal, setModal] = useState<ModalState>();

  const closeModal = () => setModal(undefined);

  const showError = (message: string) => {
    setModal({
      title: 'Klaida',
      message,
      actions: [{ label: 'Uzdaryti', onClick: closeModal, variant: 'primary' }],
    });
  };

  const loadCouriers = async (
    nextFilters: CourierFiltersType = filters,
  ): Promise<CourierListItem[]> => {
    setFilters(nextFilters);
    setStatus('Kraunamas kurjeriu sarasas...');
    try {
      const items = await fetchCouriers(nextFilters);
      setCouriers(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedCourier(undefined);
      }
      setStatus(items.length ? 'Kurjeriu sarasas pateiktas.' : 'Sarasas tuscias.');
      return items;
    } catch (caught) {
      setCouriers([]);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti kurjeriu saraso.');
      setStatus('Nepavyko gauti kurjeriu saraso.');
      return [];
    }
  };

  const selectCourier = async (id: number) => {
    setSelectedId(id);
    setStatus('Kraunama pasirinkto kurjerio informacija...');
    try {
      setSelectedCourier(await fetchCourier(id));
      setStatus('Kurjerio informacija pateikta.');
    } catch (caught) {
      setSelectedCourier(undefined);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti kurjerio informacijos.');
      setStatus('Nepavyko gauti kurjerio informacijos.');
    }
  };

  const handleCreate = async (payload: CourierCreatePayload) => {
    try {
      const created = await createCourier(payload);
      setSelectedId(created.id);
      setSelectedCourier(created);
      setFormMode(undefined);
      await loadCouriers();
      setStatus('Kurjeris sekmingai sukurtas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Kurjerio sukurti nepavyko.');
    }
  };

  const handleUpdate = async (payload: CourierUpdatePayload) => {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await updateCourier(selectedId, payload);
      setSelectedCourier(updated);
      setFormMode(undefined);
      await loadCouriers();
      setStatus('Kurjeris sekmingai redaguotas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Kurjerio redaguoti nepavyko.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await deleteCourier(selectedId);
      setSelectedId(undefined);
      setSelectedCourier(undefined);
      setFormMode(undefined);
      await loadCouriers();
      setStatus('Kurjeris sekmingai panaikintas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Kurjerio panaikinti nepavyko.');
      setStatus(caught instanceof Error ? caught.message : 'Kurjerio panaikinti nepavyko.');
    }
  };

  const requestDelete = () => {
    if (!selectedCourier) {
      showError('Pasirinkite kurjeri, kuri norite naikinti.');
      return;
    }

    setModal({
      title: 'Naikinti kurjeri?',
      message: `Kurjeris "${selectedCourier.vardas} ${selectedCourier.pavarde}" bus visam laikui istrintas.`,
      actions: [
        { label: 'Atsaukti', onClick: closeModal, variant: 'secondary' },
        {
          label: 'Naikinti',
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
      void loadCouriers(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.pareigos]);

  return (
    <div className="admin-workflow">
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
        <section aria-label="Kurjeriu sarasas">
          <p className="workflow-status">{status}</p>
          <CourierList activeId={selectedId} items={couriers} onSelect={selectCourier} />
        </section>

        <section aria-label="Pasirinkto kurjerio informacija">
          <CourierDetails courier={selectedCourier} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
