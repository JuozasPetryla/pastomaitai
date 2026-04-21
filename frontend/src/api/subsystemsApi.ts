import { apiGet } from './client';
import type { Subsystem } from '../models/subsystem';

type SubsystemResponse = {
  id: string;
  name: string;
  description: string;
  primary_actor: string;
  use_cases: string[];
};

function toSubsystem(response: SubsystemResponse): Subsystem {
  return {
    id: response.id as Subsystem['id'],
    name: response.name,
    description: response.description,
    primaryActor: response.primary_actor,
    useCases: response.use_cases,
  };
}

export async function fetchSubsystems(): Promise<Subsystem[]> {
  const subsystems = await apiGet<SubsystemResponse[]>('/api/subsystems');
  return subsystems.map(toSubsystem);
}
