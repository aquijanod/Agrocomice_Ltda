import React from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // This links to RoleDef.name or RoleDef.id
  avatar: string;
  password?: string; // Mock encrypted
  active: boolean;
}

export type RoleDef = {
  id: string;
  name: string;
  description?: string;
  permissionId: string; // Linked to a Permission Matrix
};

export interface PermissionMatrix {
  [entity: string]: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  }
}

export interface Permission {
  id: string;
  name: string; // e.g., "Acceso Total", "Solo Lectura"
  description: string;
  matrix: PermissionMatrix;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'Presente' | 'Ausente' | 'Licencia' | 'Vacaciones';
  notes?: string;
}

export interface AttendanceLog {
  id: string;
  userId: string;
  userName: string;
  department: string;
  dateTime: string; // YYYY-MM-DD HH:mm:ss
  deviceId: string;
}

export type ActivityStatus = 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada';

export interface ActivityAttachment {
  name: string;
  url: string; // Base64 data URI
  type: string;
}

export interface Activity {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description: string;
  assigneeId: string; // User ID
  status: ActivityStatus;
  attachments: ActivityAttachment[];
}

export interface MeterReading {
  id: string;
  userId: string; // Reportado Por
  date: string;   // YYYY-MM-DD
  location: 'Casa Grande' | 'Casa Chica';
  serviceType: 'Agua' | 'Luz' | 'Gas';
  photos: ActivityAttachment[];
  createdAt?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
}

export enum AIModelType {
  CHAT = 'gemini-2.5-flash',
  IMAGE_GEN = 'gemini-3-pro-image-preview',
  IMAGE_EDIT = 'gemini-2.5-flash-image',
  VIDEO_GEN = 'veo-3.1-fast-generate-preview'
}

export const APP_ENTITIES = ['Usuarios', 'Roles', 'Permisos', 'Asistencia', 'Actividades', 'Estado Medidores', 'Herramientas IA'];