import { useEffect, useState } from 'react';

import {
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

export function ShipmentsView() {
  const [filters, setFilters] = useState<ShipmentFiltersType>({ shipmentCode: '', status: '' });
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment>();
  const [selectedId, setSelectedId] = useState<number>();
  const [statusMessage, setStatusMessage] = useState('Select filters or a shipment.');
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

  const showSuccess = (message: string) => {
    setModal({
      title: 'Payment successful',
      message,
      actions: [{ label: 'Close', onClick: closeModal, variant: 'primary' }],
    });
  };

  const loadShipments = async (
    nextFilters: ShipmentFiltersType = filters,
  ): Promise<ShipmentListItem[]> => {
    setFilters(nextFilters);
    setStatusMessage('Loading shipments...');

    try {
      const items = await fetchShipments(nextFilters);
      setShipments(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedShipment(undefined);
      }
      setStatusMessage(items.length ? 'Shipment list loaded.' : 'No shipments found.');
      return items;
    } catch (caught) {
      setShipments([]);
      showError(caught instanceof Error ? caught.message : 'Failed to load shipments.');
      setStatusMessage('Failed to load shipments.');
      return [];
    }
  };

  const selectShipment = async (id: number) => {
    setSelectedId(id);
    setStatusMessage('Loading shipment details...');
    try {
      setSelectedShipment(await fetchShipment(id));
      setStatusMessage('Shipment details loaded.');
    } catch (caught) {
      setSelectedShipment(undefined);
      showError(caught instanceof Error ? caught.message : 'Failed to load shipment details.');
      setStatusMessage('Failed to load shipment details.');
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
      setStatusMessage('Shipment updated successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to update shipment.');
    }
  };

  const handleRegistrationComplete = async (
    created: Shipment,
    message: string,
    outcome?: 'payment_success',
  ) => {
    setSelectedId(created.id);
    setSelectedShipment(created);
    setFormMode(undefined);
    await loadShipments();
    setStatusMessage(message);

    if (outcome === 'payment_success') {
      showSuccess(message);
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
      setStatusMessage('Shipment deleted successfully.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Failed to delete shipment.');
      setStatusMessage(caught instanceof Error ? caught.message : 'Failed to delete shipment.');
    }
  };

  const requestDelete = () => {
    if (!selectedShipment) {
      showError('Select a shipment to delete.');
      return;
    }

    setModal({
      title: 'Delete shipment?',
      message: `Shipment "${selectedShipment.shipmentCode}" will be permanently removed.`,
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
      void loadShipments(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.shipmentCode, filters.status]);

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
          onCreateComplete={handleRegistrationComplete}
          onUpdate={handleUpdate}
          onError={showError}
        />
      ) : null}

      <div className="admin-grid">
        <section aria-label="Shipment list">
          <p className="workflow-status">{statusMessage}</p>
          <ShipmentList activeId={selectedId} items={shipments} onSelect={selectShipment} />
        </section>

        <section aria-label="Selected shipment details">
          <ShipmentDetails shipment={selectedShipment} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
