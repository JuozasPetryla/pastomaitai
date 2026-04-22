import { useEffect, useState } from 'react';

import {
  createShipment,
  deleteShipment,
  fetchShipment,
  fetchShipments,
  updateShipment,
} from '../api/shipmentsApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { ShipmentActions } from '../components/ShipmentActions';
import { ShipmentDetails } from '../components/ShipmentDetails';
import { ShipmentFilters } from '../components/ShipmentFilters';
import { ShipmentForm } from '../components/ShipmentForm';
import { ShipmentList } from '../components/ShipmentList';
import type {
  Shipment,
  ShipmentCreatePayload,
  ShipmentFilters as ShipmentFiltersType,
  ShipmentListItem,
  ShipmentUpdatePayload,
} from '../models/shipment';

type FormMode = 'create' | 'edit';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function ShipmentsCrudView() {
  const [filters, setFilters] = useState<ShipmentFiltersType>({ siuntosKodas: '', busena: '' });
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Pasirinkite filtrus arba siunta.');
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

  const loadShipments = async (
    nextFilters: ShipmentFiltersType = filters,
  ): Promise<ShipmentListItem[]> => {
    setFilters(nextFilters);
    setStatus('Kraunamas siuntu sarasas...');

    try {
      const items = await fetchShipments(nextFilters);
      setShipments(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedShipment(undefined);
      }
      setStatus(items.length ? 'Siuntu sarasas pateiktas.' : 'Sarasas tuscias.');
      return items;
    } catch (caught) {
      setShipments([]);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti siuntu saraso.');
      setStatus('Nepavyko gauti siuntu saraso.');
      return [];
    }
  };

  const selectShipment = async (id: number) => {
    setSelectedId(id);
    setStatus('Kraunama pasirinktos siuntos informacija...');
    try {
      setSelectedShipment(await fetchShipment(id));
      setStatus('Siuntos informacija pateikta.');
    } catch (caught) {
      setSelectedShipment(undefined);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti siuntos informacijos.');
      setStatus('Nepavyko gauti siuntos informacijos.');
    }
  };

  const handleCreate = async (payload: ShipmentCreatePayload) => {
    try {
      const created = await createShipment(payload);
      setSelectedId(created.id);
      setSelectedShipment(created);
      setFormMode(undefined);
      await loadShipments();
      setStatus('Siunta sekmingai sukurta.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Siuntos sukurti nepavyko.');
    }
  };

  const handleUpdate = async (payload: ShipmentUpdatePayload) => {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await updateShipment(selectedId, payload);
      setSelectedShipment(updated);
      setFormMode(undefined);
      await loadShipments();
      setStatus('Siunta sekmingai redaguota.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Siuntos redaguoti nepavyko.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await deleteShipment(selectedId);
      setSelectedId(undefined);
      setSelectedShipment(undefined);
      setFormMode(undefined);
      await loadShipments();
      setStatus('Siunta sekmingai panaikinta.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Siuntos panaikinti nepavyko.');
      setStatus(caught instanceof Error ? caught.message : 'Siuntos panaikinti nepavyko.');
    }
  };

  const requestDelete = () => {
    if (!selectedShipment) {
      showError('Pasirinkite siunta, kuria norite naikinti.');
      return;
    }

    setModal({
      title: 'Naikinti siunta?',
      message: `Siunta "${selectedShipment.siuntosKodas}" bus visam laikui istrinta.`,
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
      void loadShipments(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.siuntosKodas, filters.busena]);

  return (
    <div className="admin-workflow">
      <ShipmentFilters filters={filters} onChange={setFilters} />
      <ShipmentActions
        canEdit={selectedShipment !== undefined}
        canDelete={selectedId !== undefined}
        onCreate={() => setFormMode('create')}
        onEdit={() => setFormMode('edit')}
        onDelete={requestDelete}
      />

      {formMode ? (
        <ShipmentForm
          mode={formMode}
          shipment={selectedShipment}
          onCancel={() => setFormMode(undefined)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onError={showError}
        />
      ) : null}

      <div className="admin-grid">
        <section aria-label="Siuntu sarasas">
          <p className="workflow-status">{status}</p>
          <ShipmentList activeId={selectedId} items={shipments} onSelect={selectShipment} />
        </section>

        <section aria-label="Pasirinktos siuntos informacija">
          <ShipmentDetails shipment={selectedShipment} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
