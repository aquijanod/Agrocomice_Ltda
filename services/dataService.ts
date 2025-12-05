import { createClient } from '@supabase/supabase-js';
import { User, RoleDef, Permission, PermissionMatrix, AttendanceRecord, AttendanceLog, Activity, APP_ENTITIES, MeterReading } from '../types';

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://zyfkpvlfthmbhehmofti.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZmtwdmxmdGhtYmhlaG1vZnRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTExNDIsImV4cCI6MjA4MDM2NzE0Mn0.eBqlIO0CleJzH-ugOllPE4MnrlSZ4La6AXqxIf8j_RA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for simple encoding (legacy support from mock)
const mockEncrypt = (pass: string) => btoa(pass);

// Default Matrix Builder
const createEmptyMatrix = () => {
  const matrix: any = {};
  APP_ENTITIES.forEach(ent => {
    matrix[ent] = { view: false, create: false, edit: false, delete: false };
  });
  return matrix;
};

// --- AUTHENTICATION ---

export const authenticate = async (email: string, passwordInput: string): Promise<User | null> => {
    // Nota: En un entorno de producción real, usar supabase.auth.signInWithPassword
    // Aquí usamos la tabla 'users' personalizada según el script SQL solicitado.
    const encryptedPass = mockEncrypt(passwordInput);
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', encryptedPass)
        .single();

    if (error || !data) {
        console.error("Auth error:", error);
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        avatar: data.avatar,
        password: data.password // Mantener para lógica interna si es necesario
    };
};

// --- HELPER: Resolve Permissions ---
export const resolveUserPermissions = async (roleName: string): Promise<PermissionMatrix> => {
    // 1. Get Role
    const { data: roleData } = await supabase
        .from('roles')
        .select('permission_id')
        .eq('name', roleName)
        .single();

    if (!roleData || !roleData.permission_id) return createEmptyMatrix();

    // 2. Get Permission Matrix
    const { data: permData } = await supabase
        .from('permissions')
        .select('matrix')
        .eq('id', roleData.permission_id)
        .single();

    return permData ? (permData.matrix as PermissionMatrix) : createEmptyMatrix();
};

// --- USERS CRUD ---

export const getUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true }); // Ordenado alfabéticamente
    
    if (error) throw error;
    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        password: u.password
    }));
};

export const saveUser = async (user: User): Promise<User> => {
    // Prepare payload. If password changes, encrypt it.
    const payload: any = {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
    };
    
    // Only update password if provided (for edits) or required (for new)
    if (user.password) {
        payload.password = mockEncrypt(user.password);
    }
    
    if (user.id && user.id.length > 10) { // Simple check if UUID-ish
        // Update
        const { data, error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', user.id)
            .select()
            .single();
        if (error) throw error;
        return { ...user, ...data };
    } else {
        // Insert
        const { data, error } = await supabase
            .from('users')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return { ...user, id: data.id };
    }
};

export const deleteUser = async (id: string): Promise<void> => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
};

// --- ROLES CRUD ---

export const getRoles = async (): Promise<RoleDef[]> => {
    const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true }); // Ordenado alfabéticamente
        
    if (error) throw error;
    return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissionId: r.permission_id
    }));
};

export const saveRole = async (role: RoleDef): Promise<RoleDef> => {
    const payload = {
        name: role.name,
        description: role.description,
        permission_id: role.permissionId
    };

    if (role.id && role.id.length > 10) {
        const { error } = await supabase.from('roles').update(payload).eq('id', role.id);
        if (error) throw error;
    } else {
        const { data, error } = await supabase.from('roles').insert([payload]).select().single();
        if (error) throw error;
        role.id = data.id;
    }
    return role;
};

export const deleteRole = async (id: string): Promise<void> => {
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) throw error;
};

// --- PERMISSIONS CRUD ---

export const getPermissions = async (): Promise<Permission[]> => {
    const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('name', { ascending: true }); // Ordenado alfabéticamente
        
    if (error) throw error;
    return data as Permission[];
};

export const savePermission = async (perm: Permission): Promise<Permission> => {
    const payload = {
        name: perm.name,
        description: perm.description,
        matrix: perm.matrix
    };

    if (perm.id && perm.id.length > 10) {
        const { error } = await supabase.from('permissions').update(payload).eq('id', perm.id);
        if (error) throw error;
    } else {
        const { data, error } = await supabase.from('permissions').insert([payload]).select().single();
        if (error) throw error;
        perm.id = data.id;
    }
    return perm;
};

export const deletePermission = async (id: string): Promise<void> => {
    const { error } = await supabase.from('permissions').delete().eq('id', id);
    if (error) throw error;
};

// --- ACTIVITIES CRUD ---

export const getActivities = async (): Promise<Activity[]> => {
    const { data, error } = await supabase.from('activities').select('*');
    if (error) throw error;
    return data.map((a: any) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        startDate: a.start_date,
        endDate: a.end_date,
        assigneeId: a.assignee_id,
        status: a.status,
        attachments: a.attachments || []
    }));
};

export const saveActivity = async (activity: Activity): Promise<Activity> => {
    const payload = {
        name: activity.name,
        description: activity.description,
        start_date: activity.startDate,
        end_date: activity.endDate,
        assignee_id: activity.assigneeId,
        status: activity.status,
        attachments: activity.attachments
    };

    if (activity.id && activity.id.length > 10) {
        const { error } = await supabase.from('activities').update(payload).eq('id', activity.id);
        if (error) throw error;
    } else {
        const { data, error } = await supabase.from('activities').insert([payload]).select().single();
        if (error) throw error;
        activity.id = data.id;
    }
    return activity;
};

export const deleteActivity = async (id: string): Promise<void> => {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
};

// --- METER READINGS CRUD ---

export const getMeterReadings = async (): Promise<MeterReading[]> => {
    const { data, error } = await supabase
        .from('meter_readings')
        .select('*')
        .order('date', { ascending: false });
    
    if (error) throw error;
    return data.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        date: r.date,
        location: r.location,
        serviceType: r.service_type,
        photos: r.photos || []
    }));
};

export const saveMeterReading = async (reading: MeterReading): Promise<MeterReading> => {
    const payload = {
        user_id: reading.userId,
        date: reading.date,
        location: reading.location,
        service_type: reading.serviceType,
        photos: reading.photos
    };

    if (reading.id && reading.id.length > 10) {
        const { error } = await supabase.from('meter_readings').update(payload).eq('id', reading.id);
        if (error) throw error;
    } else {
        const { data, error } = await supabase.from('meter_readings').insert([payload]).select().single();
        if (error) throw error;
        reading.id = data.id;
    }
    return reading;
};

export const deleteMeterReading = async (id: string): Promise<void> => {
    const { error } = await supabase.from('meter_readings').delete().eq('id', id);
    if (error) throw error;
};

// --- ATTENDANCE ---

// Synthesize AttendanceRecords (for Calendar) from Logs (Present) ONLY.
export const getAttendanceByRange = async (userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> => {
    const records: AttendanceRecord[] = [];

    // 1. Fetch Logs (Presence)
    const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select('date_time')
        .eq('user_id', userId)
        .gte('date_time', `${startDate} 00:00:00`)
        .lte('date_time', `${endDate} 23:59:59`);
    
    if (logsError) throw logsError;

    // Map unique log dates to "Presente" records
    const presentDates = new Set<string>();
    logs?.forEach(l => {
        const dateOnly = l.date_time.split('T')[0];
        if (!presentDates.has(dateOnly)) {
            presentDates.add(dateOnly);
            records.push({
                id: `log-${dateOnly}`,
                userId,
                date: dateOnly,
                status: 'Presente'
            });
        }
    });

    return records;
};

export const getAttendanceLogs = async (userId: string, date: string): Promise<AttendanceLog[]> => {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date_time', `${date} 00:00:00`)
        .lte('date_time', `${date} 23:59:59`)
        .order('date_time', { ascending: true });

    if (error) throw error;

    return data.map((l: any) => ({
        id: l.id,
        userId: l.user_id,
        userName: l.user_name_snapshot || 'Unknown',
        department: l.department,
        dateTime: new Date(l.date_time).toLocaleString('es-CL'),
        deviceId: l.device_id
    }));
};

// Batch Insert for Upload
export const bulkSaveLogs = async (logs: any[]): Promise<void> => {
    const dbLogs = logs.map(l => ({
        user_id: l.userId,
        user_name_snapshot: l.userName,
        department: l.department,
        date_time: l.dateTime, 
        device_id: l.deviceId
    }));

    const { error } = await supabase
        .from('attendance_logs')
        .insert(dbLogs);
    
    if (error) throw error;
};