import { useEffect, useState } from 'react';

import {
  createPranesimas,
  deletePranesimas,
  fetchPranesimai,
  fetchPranesimas,
  updatePranesimas,
} from '../api/notificationApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { PranesimasActions } from '../components/PranesimasActions';
import { PranesimasDetails } from '../components/PranesimasDetails';
import { PranesimasForm } from '../components/PranesimasForm';
import { PranesimuFilters } from '../components/PranesimuFilters';
import { PranesimuList } from '../components/PranesimuList';
import type {
  Pranesimas,
  PranesimasCreatePayload,
  PranesimasListItem,
  PranesimasUpdatePayload,
  PranesimuFiltrai,
} from '../models/pranesimas';

type FormMode = 'create' | 'edit';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function NotificationView() {
  const [filters, setFilters] = useState<PranesimuFiltrai>({ asmuo_id: '', tipas: '', issiustas: '' });
  const [pranesimai, setPranesimai] = useState<PranesimasListItem[]>([]);
  const [selectedPranesimas, setSelectedPranesimas] = useState<Pranesimas>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Pasirinkite filtrus arba pranešimą.');
  const [formMode, setFormMode] = useState<FormMode>();
  const [modal, setModal] = useState<ModalState>();

  const closeModal = () => setModal(undefined);

  const showError = (message: string) => {
    setModal({
      title: 'Klaida',
      message,
      actions: [{ label: 'Uždaryti', onClick: closeModal, variant: 'primary' }],
    });
  };

  const loadPranesimai = async (
    nextFilters: PranesimuFiltrai = filters,
  ): Promise<PranesimasListItem[]> => {
    setFilters(nextFilters);
    setStatus('Kraunamas pranešimų sąrašas...');
    try {
      const items = await fetchPranesimai({
        asmuo_id: nextFilters.asmuo_id ? parseInt(nextFilters.asmuo_id, 10) : undefined,
        tipas: nextFilters.tipas || undefined,
        issiustas:
          nextFilters.issiustas === 'true'
            ? true
            : nextFilters.issiustas === 'false'
              ? false
              : undefined,
      });
      setPranesimai(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedPranesimas(undefined);
      }
      setStatus(items.length ? 'Pranešimų sąrašas pateiktas.' : 'Sąrašas tuščias.');
      return items;
    } catch (caught) {
      setPranesimai([]);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti pranešimų sąrašo.');
      setStatus('Nepavyko gauti pranešimų sąrašo.');
      return [];
    }
  };

  const selectPranesimas = async (id: number) => {
    setSelectedId(id);
    setStatus('Kraunama pasirinkto pranešimo informacija...');
    try {
      setSelectedPranesimas(await fetchPranesimas(id));
      setStatus('Pranešimo informacija pateikta.');
    } catch (caught) {
      setSelectedPranesimas(undefined);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti pranešimo informacijos.');
      setStatus('Nepavyko gauti pranešimo informacijos.');
    }
  };

  const handleCreate = async (payload: PranesimasCreatePayload) => {
    try {
      const created = await createPranesimas(payload);
      setSelectedId(created.id);
      setSelectedPranesimas(created);
      setFormMode(undefined);
      await loadPranesimai();
      setStatus('Pranešimas sėkmingai sukurtas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Pranešimo sukurti nepavyko.');
    }
  };

  const handleUpdate = async (payload: PranesimasUpdatePayload) => {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await updatePranesimas(selectedId, payload);
      setSelectedPranesimas(updated);
      setFormMode(undefined);
      await loadPranesimai();
      setStatus('Pranešimas sėkmingai redaguotas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Pranešimo redaguoti nepavyko.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await deletePranesimas(selectedId);
      setSelectedId(undefined);
      setSelectedPranesimas(undefined);
      setFormMode(undefined);
      await loadPranesimai();
      setStatus('Pranešimas sėkmingai panaikintas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Pranešimo panaikinti nepavyko.');
      setStatus(caught instanceof Error ? caught.message : 'Pranešimo panaikinti nepavyko.');
    }
  };

  const requestDelete = () => {
    if (!selectedPranesimas) {
      showError('Pasirinkite pranešimą, kurį norite naikinti.');
      return;
    }

    setModal({
      title: 'Naikinti pranešimą?',
      message: `Pranešimas #${selectedPranesimas.id} (${selectedPranesimas.tipas === 'sms' ? 'SMS' : 'El. paštas'}, asmuo #${selectedPranesimas.asmuo_id}) bus visam laikui ištrintas.`,
      actions: [
        { label: 'Atšaukti', onClick: closeModal, variant: 'secondary' },
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
      void loadPranesimai(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.asmuo_id, filters.tipas, filters.issiustas]);

  return (
    <div className="admin-workflow">
      <PranesimuFilters filters={filters} onChange={setFilters} />
      <PranesimasActions
        canEdit={selectedPranesimas !== undefined}
        canDelete={selectedId !== undefined}
        onCreate={() => setFormMode('create')}
        onEdit={() => setFormMode('edit')}
        onDelete={requestDelete}
      />

      {formMode ? (
        <PranesimasForm
          mode={formMode}
          pranesimas={selectedPranesimas}
          onCancel={() => setFormMode(undefined)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onError={showError}
        />
      ) : null}

      <div className="admin-grid">
        <section aria-label="Pranešimų sąrašas">
          <p className="workflow-status">{status}</p>
          <PranesimuList activeId={selectedId} items={pranesimai} onSelect={selectPranesimas} />
        </section>

        <section aria-label="Pasirinkto pranešimo informacija">
          <PranesimasDetails pranesimas={selectedPranesimas} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}