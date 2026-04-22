import type { Subsystem } from './subsystem';

export const subsystems: Subsystem[] = [
  {
    id: 'administration',
    name: 'Administration subsystem',
    description: 'Locker and courier administration.',
    primaryActor: 'Administrator',
    useCases: [
      'Browse locker list',
      'Edit locker',
      'Delete locker',
      'Create locker',
      'Register courier',
    ],
  },
  {
    id: 'notifications',
    name: 'Notifications subsystem',
    description: 'Email and SMS notification management.',
    primaryActor: 'User',
    useCases: [
      'Create messages',
      'Send email notification',
      'Review shipment status',
      'Send SMS notification',
    ],
  },
  {
    id: 'shipments',
    name: 'Shipments subsystem',
    description: 'Shipment registration and status management.',
    primaryActor: 'Sender / Receiver',
    useCases: [],
  },
  {
    id: 'courier',
    name: 'Courier subsystem',
    description: 'Courier list and parcel handling workflow.',
    primaryActor: 'Courier',
    useCases: [
      'Browse shipment list',
      'Service locker',
      'Pick up shipment',
      'Unload locker',
      'Load locker',
    ],
  },
];
