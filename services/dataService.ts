import { User, RoleDef, Permission, PermissionMatrix, AttendanceRecord, AttendanceLog, APP_ENTITIES } from '../types';

// Helper for mock encryption
const mockEncrypt = (pass: string) => btoa(pass);

// Default Matrix Builder
const createEmptyMatrix = () => {
  const matrix: any = {};
  APP_ENTITIES.forEach(ent => {
    matrix[ent] = { view: false, create: false, edit: false, delete: false };
  });
  return matrix;
};

// --- INITIAL MOCK USERS (Matched to CSV IDs where possible) ---
let MOCK_USERS: User[] = [
  { id: '1', name: 'Alfonso Quijano', email: 'alfonso@agrocomice.cl', role: 'Supervisor', avatar: 'https://picsum.photos/200', password: mockEncrypt('123456') },
  { id: '2', name: 'Ana Maza', email: 'ana@agrocomice.cl', role: 'Admin', avatar: 'https://picsum.photos/201', password: mockEncrypt('123456') },
  { id: '4', name: 'Felipe', email: 'felipe@agrocomice.cl', role: 'Trabajador', avatar: 'https://picsum.photos/203', password: mockEncrypt('123456') },
  { id: '3', name: 'Carlos Ruiz', email: 'carlos@agrocomice.cl', role: 'Trabajador', avatar: 'https://picsum.photos/202', password: mockEncrypt('123456') },
];

// Initial Permissions (Profiles/Matrices)
const adminMatrix = createEmptyMatrix();
APP_ENTITIES.forEach(e => adminMatrix[e] = { view: true, create: true, edit: true, delete: true });

const basicMatrix = createEmptyMatrix();
basicMatrix['Usuarios'] = { view: true, create: false, edit: false, delete: false };
basicMatrix['Roles'] = { view: true, create: false, edit: false, delete: false };
basicMatrix['Permisos'] = { view: false, create: false, edit: false, delete: false };
basicMatrix['Asistencia'] = { view: true, create: true, edit: true, delete: false };
basicMatrix['Herramientas IA'] = { view: true, create: true, edit: false, delete: false };

let MOCK_PERMISSIONS: Permission[] = [
  { id: 'p1', name: 'Acceso Total', description: 'Control total del sistema', matrix: adminMatrix },
  { id: 'p2', name: 'Acceso Básico', description: 'Solo visualización y operación limitada', matrix: basicMatrix },
];

let MOCK_ROLES: RoleDef[] = [
  { id: 'r1', name: 'Admin', description: 'Administrador General', permissionId: 'p1' },
  { id: 'r2', name: 'Supervisor', description: 'Gestión de personal', permissionId: 'p1' },
  { id: 'r4', name: 'Agrónomo', description: 'Especialista técnico', permissionId: 'p2' }, 
  { id: 'r3', name: 'Trabajador', description: 'Personal de campo', permissionId: 'p2' },
];

// --- RAW CSV DATA FOR INITIALIZATION ---
const RAW_CSV_DATA = `
"3afb06bf",1,Alfonso Quijano,Casa Colbún,"2025-08-22 15:28:59","001_Colbún"
"3afbfa2c",1,Alfonso Quijano,Casa Colbún,"2025-08-27 19:00:04","001_Colbún"
"3afc542d",4,Felipe,Casa Colbún,"2025-08-27 19:00:09","001_Colbún"
"659b7a55",1,Alfonso Quijano,Casa Colbún,"2025-07-08 15:07:02","001_Colbún"
"659c3c86",1,Alfonso Quijano,Casa Colbún,"2025-07-08 15:13:11","001_Colbún"
"659c9306",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:14:13","001_Colbún"
"659d6e29",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:15:34","001_Colbún"
"659db051",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:17:14","001_Colbún"
"659df8c9",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:20:44","001_Colbún"
"659e4956",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:25:40","001_Colbún"
"659e983a",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:27:12","001_Colbún"
"659f4f72",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:31:23","001_Colbún"
"659f9133",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:35:03","001_Colbún"
"659fe1cb",2,User,Casa Colbún,"2025-08-08 15:35:49","001_Colbún"
"65a0343f",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:36:11","001_Colbún"
"65a077da",2,User,Casa Colbún,"2025-08-08 15:37:20","001_Colbún"
"65a10ec3",2,User,Casa Colbún,"2025-08-08 15:55:01","001_Colbún"
"65a14e48",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:55:04","001_Colbún"
"65a1931e",2,User,Casa Colbún,"2025-08-08 16:16:52","001_Colbún"
"65a1e6d2",1,Alfonso Quijano,Casa Colbún,"2025-08-08 16:16:55","001_Colbún"
"65a2377c",2,User,Casa Colbún,"2025-08-08 16:18:24","001_Colbún"
"65a28b21",1,Alfonso Quijano,Casa Colbún,"2025-08-08 16:18:28","001_Colbún"
"724a061e",1,Alfonso Quijano,Casa Colbún,"2025-08-19 16:05:29","001_Colbún"
"724aec44",2,User,Casa Colbún,"2025-08-19 16:05:32","001_Colbún"
"724b72d3",1,Alfonso Quijano,Casa Colbún,"2025-08-19 16:07:30","001_Colbún"
"724ba805",2,User,Casa Colbún,"2025-08-19 16:07:33","001_Colbún"
"8d146282",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:07:02","001_Colbún"
"8d15555b",1,Alfonso Quijano,Casa Colbún,"2025-08-08 15:13:11","001_Colbún"
"8d1837af",1,Alfonso Quijano,Casa Colbún,"2025-08-08 18:30:37","001_Colbún"
"8d194bf7",2,User,Casa Colbún,"2025-08-08 18:30:40","001_Colbún"
"8d1995b1",1,Alfonso Quijano,Casa Colbún,"2025-08-08 18:34:48","001_Colbún"
"8d19ea1c",2,User,Casa Colbún,"2025-08-08 18:34:51","001_Colbún"
"96a7e7b4",1,Alfonso Quijano,Casa Colbún,"2025-08-22 15:45:59","001_Colbún"
"a1c97215",1,Alfonso Quijano,Casa Colbún,"2025-08-27 12:05:09","001_Colbún"
"baf8af13",4,Felipe,Casa Colbún,"2025-08-27 20:20:09","001_Colbún"
"cee43f67",1,Alfonso Quijano,Casa Colbún,"2025-08-22 17:23:59","001_Colbún"
"f8926fa6",2,User,Casa Colbún,"2025-08-08 18:21:05","001_Colbún"
"f8938fd4",1,Alfonso Quijano,Casa Colbún,"2025-08-08 18:21:09","001_Colbún"
"f8941fef",1,Alfonso Quijano,Casa Colbún,"2025-08-11 08:30:37","001_Colbún"
"f8948eef",2,User,Casa Colbún,"2025-08-11 18:30:40","001_Colbún"
"f894d897",1,Alfonso Quijano,Casa Colbún,"2025-08-09 10:34:48","001_Colbún"
"f8952a67",2,User,Casa Colbún,"2025-08-09 18:34:51","001_Colbún"
"f89568d8",1,Alfonso Quijano,Casa Colbún,"2025-08-09 11:40:33","001_Colbún"
"f895b544",2,User,Casa Colbún,"2025-08-09 11:40:37","001_Colbún"
"f895f44c",1,Alfonso Quijano,Casa Colbún,"2025-08-11 09:31:53","001_Colbún"
"f8964099",2,User,Casa Colbún,"2025-08-11 09:31:55","001_Colbún"
`;

let attendanceDB: AttendanceRecord[] = [];
let logsDB: AttendanceLog[] = [];

// Initialize DBs from RAW CSV
const initData = () => {
    const lines = RAW_CSV_DATA.trim().split('\n');
    lines.forEach(line => {
        // Simple regex to parse CSV line respecting potential quotes
        const matches = line.match(/(?:\"([^\"]*)\")|([^,]+)/g);
        if(matches && matches.length >= 6) {
             const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : '';
             
             // Map columns based on assumed CSV structure
             // ID, UserID, Name, Dept, Date, Device
             const id = clean(matches[0]);
             const userId = clean(matches[1]);
             const userName = clean(matches[2]);
             const dept = clean(matches[3]);
             const dateTime = clean(matches[4]);
             const deviceId = clean(matches[5]);

             if (userId && dateTime) {
                 // Add to Logs
                 logsDB.push({
                     id,
                     userId,
                     userName,
                     department: dept,
                     dateTime,
                     deviceId
                 });

                 // Add to Daily Summary (Presente if log exists)
                 const dateOnly = dateTime.split(' ')[0];
                 const exists = attendanceDB.find(r => r.userId === userId && r.date === dateOnly);
                 if (!exists) {
                     attendanceDB.push({
                         id: Math.random().toString(36),
                         userId,
                         date: dateOnly,
                         status: 'Presente',
                         notes: 'Sistema biométrico'
                     });
                 }
             }
        }
    });
};

// Run initialization
initData();


// --- HELPER: Resolve Permissions ---
export const resolveUserPermissions = async (roleName: string): Promise<PermissionMatrix> => {
    return new Promise(resolve => setTimeout(() => {
        const role = MOCK_ROLES.find(r => r.name === roleName);
        if (!role) {
            resolve(createEmptyMatrix());
            return;
        }
        const perm = MOCK_PERMISSIONS.find(p => p.id === role.permissionId);
        resolve(perm ? perm.matrix : createEmptyMatrix());
    }, 200));
};

// --- USERS CRUD ---

export const getUsers = async (): Promise<User[]> => {
  return new Promise(resolve => setTimeout(() => resolve([...MOCK_USERS]), 300));
};

export const saveUser = async (user: User): Promise<User> => {
  return new Promise(resolve => setTimeout(() => {
    const userToSave = { ...user };
    
    const existing = MOCK_USERS.find(u => u.id === user.id);
    if (user.password && user.password !== existing?.password) {
        userToSave.password = mockEncrypt(user.password);
    } else if (!user.password && existing) {
        userToSave.password = existing.password;
    }

    if (existing) {
      MOCK_USERS = MOCK_USERS.map(u => u.id === user.id ? userToSave : u);
    } else {
      MOCK_USERS.push({ ...userToSave, id: Math.random().toString(36).substr(2, 9) });
    }
    resolve(userToSave);
  }, 300));
};

export const deleteUser = async (id: string): Promise<void> => {
  return new Promise(resolve => setTimeout(() => {
    MOCK_USERS = MOCK_USERS.filter(u => u.id !== id);
    resolve();
  }, 300));
};

// --- ROLES CRUD ---

export const getRoles = async (): Promise<RoleDef[]> => {
  return new Promise(resolve => setTimeout(() => resolve([...MOCK_ROLES]), 300));
};

export const saveRole = async (role: RoleDef): Promise<RoleDef> => {
  return new Promise(resolve => setTimeout(() => {
    const exists = MOCK_ROLES.find(r => r.id === role.id);
    if (exists) {
      MOCK_ROLES = MOCK_ROLES.map(r => r.id === role.id ? role : r);
    } else {
      MOCK_ROLES.push({ ...role, id: Math.random().toString(36).substr(2, 9) });
    }
    resolve(role);
  }, 300));
};

export const deleteRole = async (id: string): Promise<void> => {
  return new Promise(resolve => setTimeout(() => {
    MOCK_ROLES = MOCK_ROLES.filter(r => r.id !== id);
    resolve();
  }, 300));
};

// --- PERMISSIONS CRUD ---

export const getPermissions = async (): Promise<Permission[]> => {
  return new Promise(resolve => setTimeout(() => resolve([...MOCK_PERMISSIONS]), 300));
};

export const savePermission = async (perm: Permission): Promise<Permission> => {
  return new Promise(resolve => setTimeout(() => {
    const exists = MOCK_PERMISSIONS.find(p => p.id === perm.id);
    if (exists) {
      MOCK_PERMISSIONS = MOCK_PERMISSIONS.map(p => p.id === perm.id ? perm : p);
    } else {
      MOCK_PERMISSIONS.push({ ...perm, id: Math.random().toString(36).substr(2, 9) });
    }
    resolve(perm);
  }, 300));
};

export const deletePermission = async (id: string): Promise<void> => {
  return new Promise(resolve => setTimeout(() => {
    MOCK_PERMISSIONS = MOCK_PERMISSIONS.filter(p => p.id !== id);
    resolve();
  }, 300));
};

// --- ATTENDANCE ---

export const getAttendance = async (userId: string, month: string): Promise<AttendanceRecord[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const records = attendanceDB.filter(r => r.userId === userId && r.date.startsWith(month));
      resolve(records);
    }, 300);
  });
};

// Search by range
export const getAttendanceByRange = async (userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const records = attendanceDB.filter(r => {
            return r.userId === userId && r.date >= startDate && r.date <= endDate;
        });
        resolve(records);
      }, 500); 
    });
};

// Get Detailed Logs for a specific date and user
export const getAttendanceLogs = async (userId: string, date: string): Promise<AttendanceLog[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const logs = logsDB.filter(l => l.userId === userId && l.dateTime.startsWith(date));
            // Sort by time
            logs.sort((a,b) => a.dateTime.localeCompare(b.dateTime));
            resolve(logs);
        }, 200);
    });
};

export const saveAttendance = async (record: AttendanceRecord): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // Remove existing record for that user/date combo if exists
      attendanceDB = attendanceDB.filter(r => !(r.userId === record.userId && r.date === record.date));
      attendanceDB.push(record);
      resolve();
    }, 300);
  });
};

// Bulk upload
export const bulkSaveAttendance = async (records: AttendanceRecord[]): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => {
      records.forEach(newRecord => {
        // Prevent duplicates for the same day/user (Last write wins or keep existing 'Presente')
        const existsIndex = attendanceDB.findIndex(r => r.userId === newRecord.userId && r.date === newRecord.date);
        if (existsIndex === -1) {
            attendanceDB.push(newRecord);
        } else {
            if (attendanceDB[existsIndex].status !== 'Presente') {
                attendanceDB[existsIndex] = newRecord;
            }
        }
      });
      resolve();
    }, 500);
  });
};