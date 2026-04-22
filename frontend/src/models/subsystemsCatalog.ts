import type { Subsystem } from './subsystem';

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
    id: 'shipments',
    name: 'Siuntų posistemis',
    description: 'Siuntų registravimas, siuntimas, atsiėmimas ir apmokėjimas.',
    primaryActor: 'Siuntėjas / Gavėjas',
    useCases: [],
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
