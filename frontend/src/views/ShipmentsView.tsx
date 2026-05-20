import { useEffect, useState } from 'react';

import { fetchLockers } from '../api/administrationApi';
import { requestStickerPdf } from '../api/stickersApi';
import { AppModal, type AppModalAction } from '../components/AppModal';
import { LockerPickupSimulator } from '../components/LockerPickupSimulator';
import { ShipmentForm } from '../components/ShipmentForm';
import type { LockerListItem } from '../models/locker';
import type { Shipment } from '../models/shipment';

type ModalState = {
  title: string;
  message: string;
  actions: AppModalAction[];
};

function formatPartyName(party: Shipment['sender']): string {
  return `${party.firstName} ${party.lastName}`.trim();
}

function downloadStickerPdf(stickerPdf: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(stickerPdf);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function openStickerPdf(stickerPdf: Blob, printWindow: Window, fileName: string) {
  const stickerUrl = URL.createObjectURL(stickerPdf);
  printWindow.location.href = stickerUrl;
  downloadStickerPdf(stickerPdf, fileName);
  window.setTimeout(() => URL.revokeObjectURL(stickerUrl), 60000);
}

export function ShipmentsView() {
  const [lockers, setLockers] = useState<LockerListItem[]>([]);
  const [registeredShipment, setRegisteredShipment] = useState<Shipment>();
  const [registrationMessage, setRegistrationMessage] = useState('');
  const [isPrintingSticker, setIsPrintingSticker] = useState(false);
  const [modal, setModal] = useState<ModalState>();

  const closeModal = () => setModal(undefined);

  const ShowErrorMessage = (message: string) => {
    setModal({
      title: 'Error',
      message,
      actions: [{ label: 'Close', onClick: closeModal, variant: 'primary' }],
    });
  };

  const loadLockers = async () => {
    try {
      setLockers(await fetchLockers({}));
    } catch (caught) {
      ShowErrorMessage(caught instanceof Error ? caught.message : 'Failed to load lockers.');
    }
  };

  const handleRegistrationComplete = async (shipment: Shipment, message: string) => {
    setRegisteredShipment(shipment);
    setRegistrationMessage(message);
  };

  const PrintSticker = async () => {
    if (!registeredShipment) {
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      ShowErrorMessage('Allow pop-ups to open the sticker in a new window.');
      return;
    }

    printWindow.document.write('<p>Preparing sticker...</p>');
    setIsPrintingSticker(true);

    try {
      const stickerPdf = await requestStickerPdf(registeredShipment);
      openStickerPdf(stickerPdf, printWindow, `sticker_${registeredShipment.shipmentCode}.pdf`);
    } catch (caught) {
      printWindow.close();
      ShowErrorMessage(caught instanceof Error ? caught.message : 'Failed to generate sticker.');
    } finally {
      setIsPrintingSticker(false);
    }
  };

  useEffect(() => {
    void loadLockers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="shipments-public-page">
      <section className="shipments-public-grid">
        <div className="shipments-main-column">
          {registeredShipment ? (
            <section className="shipment-form-card" aria-label="Shipment registration summary">
              <div className="shipments-section-header">
                <div>
                  <p className="eyebrow">Registration complete</p>
                  <h3>{registeredShipment.shipmentCode}</h3>
                </div>
              </div>

              {registrationMessage ? <p className="feedback feedback-success">{registrationMessage}</p> : null}

              <div className="review-grid">
                <div>
                  <span>Sender</span>
                  <strong>{formatPartyName(registeredShipment.sender)}</strong>
                </div>
                <div>
                  <span>Receiver</span>
                  <strong>{formatPartyName(registeredShipment.receiver)}</strong>
                </div>
                <div>
                  <span>Send from</span>
                  <strong>{registeredShipment.dispatchAddress}</strong>
                </div>
                <div>
                  <span>Deliver to</span>
                  <strong>{registeredShipment.destinationAddress}</strong>
                </div>
                <div>
                  <span>Parcel size</span>
                  <strong>{registeredShipment.size.toUpperCase()}</strong>
                </div>
                <div>
                  <span>Shipment date</span>
                  <strong>{registeredShipment.shipmentDate}</strong>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" disabled={isPrintingSticker} onClick={() => void PrintSticker()}>
                  {isPrintingSticker ? 'Preparing sticker...' : 'Download sticker'}
                </button>
                <button
                  type="button"
                  disabled={isPrintingSticker}
                  onClick={() => {
                    setRegisteredShipment(undefined);
                    setRegistrationMessage('');
                  }}
                >
                  Register another shipment
                </button>
              </div>
            </section>
          ) : (
            <ShipmentForm
              lockers={lockers}
              onCreateComplete={handleRegistrationComplete}
              onError={ShowErrorMessage}
            />
          )}
        </div>

        <LockerPickupSimulator onError={ShowErrorMessage} />
      </section>

      {modal ? <AppModal title={modal.title} message={modal.message} actions={modal.actions} /> : null}
    </div>
  );
}
