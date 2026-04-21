export type SubsystemId =
  | 'administration'
  | 'notifications'
  | 'labels'
  | 'shipments'
  | 'courier';

export type Subsystem = {
  id: SubsystemId;
  name: string;
  description: string;
  primaryActor: string;
  useCases: string[];
};

export const subsystems: Subsystem[] = [
  {
    id: 'administration',
    name: 'Administracijos posistemis',
    description: 'Paštomatų ir kurjerių administravimas.',
    primaryActor: 'Administratorius',
    useCases: [
      'Peržiūrėti paštomatų sąrašą',
      'Redaguoti paštomatą',
      'Naikinti paštomatą',
      'Kurti paštomatą',
      'Registruoti kurjerį',
    ],
  },
  {
    id: 'notifications',
    name: 'Pranešimų posistemis',
    description: 'Žinučių, laiškų ir SMS pranešimų siuntimas.',
    primaryActor: 'Naudotojas',
    useCases: [
      'Suformuoti žinutes',
      'Siųsti el. laišką',
      'Peržiūrėti siuntos statusą',
      'Siųsti SMS pranešimą',
    ],
  },
  {
    id: 'labels',
    name: 'Lipdukų posistemis',
    description: 'Siuntos lipduko generavimas ir gavimas.',
    primaryActor: 'Siuntėjas',
    useCases: [
      'Generuoti siuntos lipduką',
      'Gauti skaitmeninį lipduką',
      'Gauti fizinį lipduką paštomate',
    ],
  },
  {
    id: 'shipments',
    name: 'Siuntų posistemis',
    description: 'Siuntų registravimas, siuntimas, atsiėmimas ir apmokėjimas.',
    primaryActor: 'Siuntėjas / Gavėjas',
    useCases: [
      'Registruoti siuntą',
      'Registruoti internetu',
      'Registruoti paštomate',
      'Apmokėti siuntą',
      'Apmokėti paštomate',
      'Apmokėti internetu',
      'Siųsti siuntą',
      'Atsiimti siuntą',
    ],
  },
  {
    id: 'courier',
    name: 'Kurjerio posistemis',
    description: 'Kurjerio siuntų sąrašas ir paštomato pakrovimas.',
    primaryActor: 'Kurjeris',
    useCases: [
      'Žiūrėti siuntų sąrašą',
      'Aptarnauti paštomatą',
      'Eiti į siuntą iki paštomato',
      'Iškrauti paštomatą',
      'Pakrauti paštomatą',
    ],
  },
];
