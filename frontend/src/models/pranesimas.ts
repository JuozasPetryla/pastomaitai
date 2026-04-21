export type PranesimoTipas = 'sms' | 'el_pastas';

export type PranesimasListItem = {
  id: number;
  asmuo_id: number;
  tipas: PranesimoTipas;
  issiustas: boolean;
  issiuntimo_operatoriui_data: string | null;
  created_at: string;
};

export type Pranesimas = PranesimasListItem & {
  tekstas: string;
  operatoriaus_atsako_data: string | null;
};

export type PranesimuFiltrai = {
  asmuo_id: string;
  tipas: PranesimoTipas | '';
  issiustas: 'true' | 'false' | '';
};

export type PranesimasCreatePayload = {
  asmuo_id: number;
  tekstas: string;
  tipas: PranesimoTipas;
  issiuntimo_operatoriui_data?: string | null;
};

export type PranesimasUpdatePayload = {
  tekstas?: string;
  tipas?: PranesimoTipas;
  issiuntimo_operatoriui_data?: string | null;
  operatoriaus_atsako_data?: string | null;
  issiustas?: boolean;
};