import type { Pranesimas } from '../models/pranesimas';

type PranesimasDetailsProps = {
  pranesimas?: Pranesimas;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('lt-LT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PranesimasDetails({ pranesimas }: PranesimasDetailsProps) {
  if (!pranesimas) {
    return <p className="empty-state">Pasirinkite pranešimą informacijai peržiūrėti.</p>;
  }

  return (
    <article className="detail-panel">
      <header>
        <p>{pranesimas.issiustas ? 'Išsiųstas' : 'Neišsiųstas'}</p>
        <h3>{pranesimas.tipas === 'sms' ? 'SMS' : 'El. paštas'} · Asmuo #{pranesimas.asmuo_id}</h3>
      </header>

      <dl>
        <div>
          <dt>Tekstas</dt>
          <dd>{pranesimas.tekstas}</dd>
        </div>
        <div>
          <dt>Sukurta</dt>
          <dd>{formatDate(pranesimas.created_at)}</dd>
        </div>
        <div>
          <dt>Išsiųsta operatoriui</dt>
          <dd>{formatDate(pranesimas.issiuntimo_operatoriui_data)}</dd>
        </div>
        <div>
          <dt>Operatoriaus atsakas</dt>
          <dd>{formatDate(pranesimas.operatoriaus_atsako_data)}</dd>
        </div>
      </dl>
    </article>
  );
}