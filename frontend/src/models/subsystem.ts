export type SubsystemId =
  | 'administration'
  | 'notifications'
  | 'shipments'
  | 'courier';

export type Subsystem = {
  id: SubsystemId;
  name: string;
  description: string;
  primaryActor: string;
  useCases: string[];
};
