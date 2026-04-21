import { useEffect, useState } from 'react';

import {
  createPastomatas,
  deletePastomatas,
  fetchPastomatai,
  fetchPastomatas,
  updatePastomatas,
} from '../api/administrationApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { PastomatoActions } from '../components/PastomatoActions';
import { PastomatoDetails } from '../components/PastomatoDetails';
import { PastomatoForm } from '../components/PastomatoForm';
import { PastomatuFilters } from '../components/PastomatuFilters';
import { PastomatuList } from '../components/PastomatuList';
import type {
  Pastomatas,
  PastomatasCreatePayload,
  PastomatasListItem,
  PastomatasUpdatePayload,
  PastomatuFiltrai,
} from '../models/pastomatas';

type FormMode = 'create' | 'edit';
type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

export function AdministrationView() {
  const [filters, setFilters] = useState<PastomatuFiltrai>({ regionas: '', busena: '' });
  const [pastomatai, setPastomatai] = useState<PastomatasListItem[]>([]);
  const [selectedPastomatas, setSelectedPastomatas] = useState<Pastomatas>();
  const [selectedId, setSelectedId] = useState<number>();
  const [status, setStatus] = useState('Pasirinkite filtrus arba paštomatą.');
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

  const loadPastomatai = async (
    nextFilters: PastomatuFiltrai = filters,
  ): Promise<PastomatasListItem[]> => {
    setFilters(nextFilters);
    setStatus('Kraunamas paštomatų sąrašas...');
    try {
      const items = await fetchPastomatai({
        regionas: nextFilters.regionas || undefined,
        busena: nextFilters.busena || undefined,
      });
      setPastomatai(items);
      if (selectedId !== undefined && !items.some((item) => item.id === selectedId)) {
        setSelectedId(undefined);
        setSelectedPastomatas(undefined);
      }
      setStatus(items.length ? 'Paštomatų sąrašas pateiktas.' : 'Sąrašas tuščias.');
      return items;
    } catch (caught) {
      setPastomatai([]);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti paštomatų sąrašo.');
      setStatus('Nepavyko gauti paštomatų sąrašo.');
      return [];
    }
  };

  const selectPastomatas = async (id: number) => {
    setSelectedId(id);
    setStatus('Kraunama pasirinkto paštomato informacija...');
    try {
      setSelectedPastomatas(await fetchPastomatas(id));
      setStatus('Paštomato informacija pateikta.');
    } catch (caught) {
      setSelectedPastomatas(undefined);
      showError(caught instanceof Error ? caught.message : 'Nepavyko gauti paštomato informacijos.');
      setStatus('Nepavyko gauti paštomato informacijos.');
    }
  };

  const handleCreate = async (payload: PastomatasCreatePayload) => {
    try {
      const created = await createPastomatas(payload);
      setSelectedId(created.id);
      setSelectedPastomatas(created);
      setFormMode(undefined);
      await loadPastomatai();
      setStatus('Paštomatas sėkmingai sukurtas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Paštomato sukurti nepavyko.');
    }
  };

  const handleUpdate = async (payload: PastomatasUpdatePayload) => {
    if (!selectedId) {
      return;
    }

    try {
      const updated = await updatePastomatas(selectedId, payload);
      setSelectedPastomatas(updated);
      setFormMode(undefined);
      await loadPastomatai();
      setStatus('Paštomatas sėkmingai redaguotas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Paštomato redaguoti nepavyko.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      return;
    }

    try {
      await deletePastomatas(selectedId);
      setSelectedId(undefined);
      setSelectedPastomatas(undefined);
      setFormMode(undefined);
      await loadPastomatai();
      setStatus('Paštomatas sėkmingai panaikintas.');
    } catch (caught) {
      showError(caught instanceof Error ? caught.message : 'Paštomato panaikinti nepavyko.');
      setStatus(caught instanceof Error ? caught.message : 'Paštomato panaikinti nepavyko.');
    }
  };

  const requestDelete = () => {
    if (!selectedPastomatas) {
      showError('Pasirinkite paštomatą, kurį norite naikinti.');
      return;
    }

    setModal({
      title: 'Naikinti paštomatą?',
      message: `Paštomatas "${selectedPastomatas.adresas}" bus pažymėtas kaip panaikintas.`,
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
      void loadPastomatai(filters);
    }, 250);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.regionas, filters.busena]);

  return (
    <div className="admin-workflow">
      <PastomatuFilters filters={filters} onChange={setFilters} />
      <PastomatoActions
        canEdit={selectedPastomatas !== undefined}
        canDelete={selectedId !== undefined}
        onCreate={() => setFormMode('create')}
        onEdit={() => setFormMode('edit')}
        onDelete={requestDelete}
      />

      {formMode ? (
        <PastomatoForm
          mode={formMode}
          pastomatas={selectedPastomatas}
          onCancel={() => setFormMode(undefined)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onError={showError}
        />
      ) : null}

      <div className="admin-grid">
        <section aria-label="Paštomatų sąrašas">
          <p className="workflow-status">{status}</p>
          <PastomatuList activeId={selectedId} items={pastomatai} onSelect={selectPastomatas} />
        </section>

        <section aria-label="Pasirinkto paštomato informacija">
          <PastomatoDetails pastomatas={selectedPastomatas} />
        </section>
      </div>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
