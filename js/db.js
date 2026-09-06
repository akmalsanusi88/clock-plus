// Clock+ Client-Side Relational Database Module
// Stores application state in localStorage with seed data.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { generateNewRequestEmailHtml, generateStatusUpdateEmailHtml, generateClosedOtEmailHtml } from './views/shared.js';

const DB_KEY = 'clock_plus_db';
const supabaseUrl = 'https://dkxjlhpiaignyqbbxyxu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRreGpsaHBpYWlnbnlxYmJ4eXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NTU2MjcsImV4cCI6MjEwMzAzMTYyN30.Ina8RxDpukQbBNLSu8C96876I_QDfu-HiUQYH5YkymY';
export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to convert Date objects or strings to local ISO-like date string (YYYY-MM-DD)
export function getLocalDateString(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get the Monday of the week for a given date
export function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

// Get the start of the month for a given date
export function getStartOfMonth(date) {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Helper to match user strictly by exact recorded email, ID, or name
export function matchesUserIdentifier(userOrCu, input) {
    if (!userOrCu || !input) return false;
    const cleanInput = String(input).toLowerCase().trim();
    if (!cleanInput) return false;

    const email = (userOrCu.email || '').toLowerCase().trim();
    const id = (userOrCu.userId || userOrCu.id || '').toLowerCase().trim();
    const name = (userOrCu.name || '').toLowerCase().trim();

    return email === cleanInput || id === cleanInput || name === cleanInput;
}

// Default initial data if database doesn't exist
const initialData = {
    users: [
        { id: 'ADMIN-01', name: 'System Admin', role: 'admin', position: 'IT Director', email: 'admin@clockplus.com' },
        { id: 'SUP-01', name: 'Sarah Jenkins', role: 'superior', position: 'Engineering Manager', email: 'sarah.j@clockplus.com' },
        { id: 'SUP-02', name: 'David Miller', role: 'superior', position: 'Product Director', email: 'david.m@clockplus.com' },
        { id: 'EMP-01', name: 'Jane Doe', role: 'worker', position: 'Software Engineer', email: 'jane.doe@clockplus.com' },
        { id: 'EMP-02', name: 'John Smith', role: 'worker', position: 'QA Tester', email: 'john.smith@clockplus.com' },
        { id: 'EMP-03', name: 'Alice Johnson', role: 'worker', position: 'UI Designer', email: 'alice.j@clockplus.com' },
        { id: 'EMP-04', name: 'Bob Brown', role: 'worker', position: 'UX Researcher', email: 'bob.b@clockplus.com' }
    ],
    projects: [
        { id: 'PRJ-ALPHA', name: 'Project Alpha (Core Dev)' },
        { id: 'PRJ-BETA', name: 'Project Beta (Redesign)' },
        { id: 'PRJ-MIGRATE', name: 'Cloud Migration' },
        { id: 'PRJ-SUPPORT', name: 'System Support & Ops' }
    ],
    hierarchy: [
        { workerId: 'EMP-01', approverId: 'SUP-01' },
        { workerId: 'EMP-02', approverId: 'SUP-01' },
        { workerId: 'EMP-03', approverId: 'SUP-02' },
        { workerId: 'EMP-04', approverId: 'SUP-02' }
    ],
    limits: [
        // Global limits
        { scope: 'global', targetId: null, dailyMax: 4, weeklyMax: 12, monthlyMax: 40 },
        // Position-based limits (e.g. QA Testers get tighter limits to avoid burnout)
        { scope: 'position', targetId: 'QA Tester', dailyMax: 2, weeklyMax: 8, monthlyMax: 20 },
        // Individual limits (e.g. John has special limit configured by admin)
        { scope: 'individual', targetId: 'EMP-02', dailyMax: 3, weeklyMax: 10, monthlyMax: 30 }
    ],
    requests: [],
    notifications: [],
    company_email_settings: [],
    companies: [
        { id: 'COM-01', name: 'CoreTech Innovations', industry: 'Software & Technology', icon: '💻' },
        { id: 'COM-02', name: 'Vertex Industries', industry: 'Manufacturing & Logistics', icon: '🏭' },
        { id: 'COM-03', name: 'Apex Biotech Labs', industry: 'Healthcare & Research', icon: '🔬' },
        { id: 'COM-04', name: 'Nova Logistics', industry: 'Global Supply Chain', icon: '🚚' }
    ],
    user_companies: [
        { userId: 'ADMIN-01', companyId: 'COM-01' },
        { userId: 'ADMIN-01', companyId: 'COM-02' },
        { userId: 'ADMIN-01', companyId: 'COM-03' },
        { userId: 'ADMIN-01', companyId: 'COM-04' },
        { userId: 'SUP-01', companyId: 'COM-01' },
        { userId: 'SUP-01', companyId: 'COM-02' },
        { userId: 'EMP-01', companyId: 'COM-01' },
        { userId: 'EMP-01', companyId: 'COM-02' },
        { userId: 'EMP-02', companyId: 'COM-01' },
        { userId: 'EMP-02', companyId: 'COM-02' },
        { userId: 'SUP-02', companyId: 'COM-03' },
        { userId: 'SUP-02', companyId: 'COM-04' },
        { userId: 'EMP-03', companyId: 'COM-03' },
        { userId: 'EMP-03', companyId: 'COM-04' },
        { userId: 'EMP-04', companyId: 'COM-03' },
        { userId: 'EMP-04', companyId: 'COM-04' }
    ]
};

// Database class
class Database {
    constructor() {
        this.data = null;
        this.init();
    }

    init() {
        if (typeof localStorage !== 'undefined') {
            const cached = localStorage.getItem(DB_KEY);
            if (cached) {
                this.data = JSON.parse(cached);
            }
        }
        if (!this.data) {
            this.data = JSON.parse(JSON.stringify(initialData));
        }

        // Background synchronization
        this.syncFromSupabase();
        this.setupRealtimeSubscription();
    }

    async syncFromSupabase() {
        try {
            const [
                { data: companies, error: cErr },
                { data: company_users, error: cuErr },
                { data: sbLimits },
                { data: sbHierarchy },
                { data: sbRequests },
                { data: sbNotifications },
                { data: sbEmailSettings }
            ] = await Promise.all([
                supabase.from('companies').select('*'),
                supabase.from('company_users').select('*'),
                supabase.from('limits').select('*'),
                supabase.from('hierarchy').select('*'),
                supabase.from('overtime_requests').select('*'),
                supabase.from('notifications').select('*'),
                supabase.from('company_email_settings').select('*')
            ]);

            if (cErr || cuErr) {
                console.error("Error syncing from Supabase:", { cErr, cuErr });
                return;
            }

            const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');

            // Auto-push any local requests that were created when Supabase RLS was blocked
            if (this.data.requests && this.data.requests.length > 0) {
                const sbRequestIds = new Set((sbRequests || []).map(r => r.id));
                const unsyncedRequests = this.data.requests.filter(r => !sbRequestIds.has(r.id));
                for (const r of unsyncedRequests) {
                    supabase.from('overtime_requests').upsert({
                        id: r.id,
                        company_id: r.companyId || activeCompanyId || null,
                        requester_id: r.requesterId,
                        approver_id: r.approverId,
                        project: r.project,
                        work_progress: r.workProgress || r.work_progress || '',
                        target_work: r.targetWork || r.target_work || '',
                        overtime_date: r.dateStart || r.overtimeDate || (r.startDate ? r.startDate.slice(0, 10) : null),
                        date_start: r.dateStart || (r.startDate ? r.startDate.slice(0, 10) : null),
                        date_end: r.dateEnd || (r.endDate ? r.endDate.slice(0, 10) : null),
                        time_start: r.timeStart || null,
                        time_end: r.timeEnd || null,
                        start_date: r.startDate,
                        end_date: r.endDate,
                        duration: Number(r.duration) || 0,
                        team_members: r.teamMembers || [],
                        status: r.status,
                        rejection_reason: r.rejectionReason || null,
                        approver_remarks: r.approverRemarks || null
                    }).then(({ error }) => {
                        if (error) console.error("Error syncing local request to Supabase:", error);
                    });
                }
            }

            // Auto-push any local notifications that need syncing to Supabase
            if (this.data.notifications && this.data.notifications.length > 0) {
                const sbNotifIds = new Set((sbNotifications || []).map(n => n.id));
                const unsyncedNotifs = this.data.notifications.filter(n => !sbNotifIds.has(n.id));
                for (const n of unsyncedNotifs) {
                    supabase.from('notifications').upsert({
                        id: n.id,
                        company_id: activeCompanyId || (this.data.companies && this.data.companies[0]?.id) || 'COMP-101',
                        user_id: n.userId,
                        message: n.message,
                        timestamp: n.timestamp
                    }).then(({ error }) => {
                        if (error) console.error("Error syncing notification to Supabase:", error);
                    });
                }
            }

            let currentAuthEmail = '';
            try {
                const { data: authData } = await supabase.auth.getUser();
                if (authData && authData.user && authData.user.email) {
                    currentAuthEmail = authData.user.email;
                }
            } catch (e) {}

            if (!this.data.user_permissions) this.data.user_permissions = {};

            const mappedCompanyUsers = (company_users || []).map(cu => {
                const rawRole = (cu.role || '').toLowerCase().trim();
                let normalizedRole = 'worker';
                if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
                else if (rawRole === 'admin') normalizedRole = 'admin';
                else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
                else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
                else normalizedRole = 'worker';

                const dataScope = cu.data_scope || cu.dataScope || (
                    normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                    (normalizedRole === 'superior' ? 'team' : 'own')
                );

                const userEmail = (cu.email && cu.email.trim() !== '') ? cu.email : (currentAuthEmail || '');
                const hasCustomName = cu.name && cu.name.trim() !== '' && cu.name.toUpperCase() !== 'EMPTY' && cu.name !== 'User';
                const cleanName = hasCustomName ? cu.name : (userEmail || 'User');
                
                let userPerms = this.data.user_permissions[cu.user_id] || cu.permissions;
                if (typeof userPerms === 'string') {
                    try { userPerms = JSON.parse(userPerms); } catch (e) {}
                }
                if (!userPerms || !Array.isArray(userPerms) || userPerms.length === 0) {
                    userPerms = (normalizedRole === 'superadmin' || normalizedRole === 'admin') 
                        ? ['dashboard', 'request', 'report', 'settings']
                        : ['dashboard', 'request', 'report'];
                }
                this.data.user_permissions[cu.user_id] = userPerms;

                const defaultPosition = normalizedRole === 'superadmin' ? 'Super Administrator' :
                    (normalizedRole === 'admin' ? 'Administrator' :
                    (normalizedRole === 'superior' ? 'Project Manager' :
                    (normalizedRole === 'supervisor' ? 'Site Supervisor' : 'Staff')));

                return {
                    companyId: cu.company_id,
                    userId: cu.user_id,
                    name: cleanName,
                    role: normalizedRole,
                    position: cu.position || defaultPosition,
                    email: userEmail,
                    password: cu.password || 'password123',
                    permissions: userPerms,
                    data_scope: dataScope,
                    dataScope: dataScope
                };
            });

            if (currentAuthEmail) {
                const needsEmailBackfill = (company_users || []).some(cu => !cu.email);
                if (needsEmailBackfill) {
                    supabase.from('company_users').update({ email: currentAuthEmail }).is('email', null).then();
                }
            }

            // Deduplicate company_users to build the global users list
            const uniqueUsers = [];
            const seen = new Set();
            for (const cu of mappedCompanyUsers) {
                if (!seen.has(cu.userId)) {
                    seen.add(cu.userId);
                    uniqueUsers.push({
                        id: cu.userId,
                        name: cu.name,
                        role: cu.role,
                        position: cu.position,
                        email: cu.email || '',
                        password: cu.password,
                        permissions: cu.permissions,
                        data_scope: cu.data_scope,
                        dataScope: cu.dataScope
                    });
                }
            }

            let mappedLimits = this.data.limits || [];
            if (sbLimits && sbLimits.length > 0) {
                mappedLimits = sbLimits.map(l => ({
                    id: l.id,
                    companyId: l.company_id || null,
                    scope: l.scope,
                    targetId: l.target_id,
                    monthlyMax: l.monthly_max || 104,
                    restDeductionEnabled: l.rest_deduction_enabled !== undefined ? l.rest_deduction_enabled : undefined,
                    restThresholdHours: l.rest_threshold_hours !== undefined ? Number(l.rest_threshold_hours) : undefined,
                    restDeductHours: l.rest_deduct_hours !== undefined ? Number(l.rest_deduct_hours) : undefined
                }));

                const sbGlobal = mappedLimits.find(l => l.scope === 'global' && (!l.companyId || !activeCompanyId || l.companyId === activeCompanyId));
                if (sbGlobal && sbGlobal.restThresholdHours !== undefined && !isNaN(sbGlobal.restThresholdHours)) {
                    localStorage.setItem('clock_plus_rest_deduction_rule', JSON.stringify({
                        enabled: sbGlobal.restDeductionEnabled !== false,
                        thresholdHours: Number(sbGlobal.restThresholdHours) || 5,
                        deductHours: Number(sbGlobal.restDeductHours) || 0.5
                    }));
                }
            }

            let mappedHierarchy = this.data.hierarchy || [];
            if (sbHierarchy && sbHierarchy.length > 0) {
                mappedHierarchy = sbHierarchy.map(h => ({
                    companyId: h.company_id || null,
                    workerId: h.worker_id,
                    approverId: h.approver_id,
                    level1: h.approver_id || null,
                    level2: h.level2_id || null,
                    level3: h.level3_id || null,
                    approverIds: [h.approver_id, h.level2_id, h.level3_id].filter(Boolean)
                }));
            }

            const mappedRequests = (sbRequests || []).map(r => ({
                id: r.id,
                companyId: r.company_id,
                requesterId: r.requester_id,
                approverId: r.approver_id,
                project: r.project,
                workProgress: r.work_progress,
                targetWork: r.target_work,
                dateStart: r.date_start || r.overtime_date || (r.start_date ? r.start_date.slice(0, 10) : null),
                dateEnd: r.date_end || (r.end_date ? r.end_date.slice(0, 10) : null),
                overtimeDate: r.date_start || r.overtime_date || (r.start_date ? r.start_date.slice(0, 10) : null),
                timeStart: r.time_start,
                timeEnd: r.time_end,
                startDate: r.start_date,
                endDate: r.end_date,
                duration: Number(r.duration) || 0,
                teamMembers: Array.isArray(r.team_members) ? r.team_members : (typeof r.team_members === 'string' ? JSON.parse(r.team_members || '[]') : []),
                status: r.status || 'Pending Approval',
                rejectionReason: r.rejection_reason || null,
                approverRemarks: r.approver_remarks || null,
                isSpecialRequest: Boolean(r.is_special_request),
                workerConsented: Boolean(r.worker_consented),
                actualStartDate: r.actual_start_date || null,
                actualEndDate: r.actual_end_date || null,
                actualTimeStart: r.actual_time_start || null,
                actualTimeEnd: r.actual_time_end || null,
                actualDuration: r.actual_duration ? Number(r.actual_duration) : null,
                actualGrossDuration: r.actual_gross_duration ? Number(r.actual_gross_duration) : null,
                actualRestDeduction: r.actual_rest_deduction ? Number(r.actual_rest_deduction) : null,
                closingRemarks: r.closing_remarks || null,
                closedAt: r.closed_at || null,
                closedBy: r.closed_by || null,
                history: Array.isArray(r.history) ? r.history : (typeof r.history === 'string' ? JSON.parse(r.history || '[]') : [])
            }));

            const mappedNotifications = (sbNotifications || []).map(n => ({
                id: n.id,
                companyId: n.company_id || null,
                userId: n.user_id,
                message: n.message,
                timestamp: n.timestamp,
                read: Boolean(n.read)
            }));

            // Auto-generate notification for any pending requests awaiting approval
            if (mappedRequests && mappedRequests.length > 0) {
                const pending = mappedRequests.filter(r => r.status === 'Pending Approval');
                for (const r of pending) {
                    const reqUser = uniqueUsers.find(u => u.id === r.requesterId || u.email === r.requesterId);
                    const reqName = reqUser ? reqUser.name : r.requesterId;
                    const proj = this.getProject(r.project);
                    const projName = proj ? proj.name : (r.project || 'Project');

                    const approverIds = new Set();
                    if (r.approverId) approverIds.add(r.approverId);
                    
                    const hierMap = (mappedHierarchy || []).find(h => h.workerId === r.requesterId);
                    if (hierMap?.approverId) approverIds.add(hierMap.approverId);

                    // If no explicit approver is set, notify company superiors and admins
                    if (approverIds.size === 0) {
                        const superiors = mappedCompanyUsers.filter(u => u.role === 'superior' || u.role === 'admin');
                        superiors.forEach(s => approverIds.add(s.userId));
                    }

                    approverIds.forEach(appId => {
                        const hasNotif = mappedNotifications.some(n => 
                            (n.userId === appId || (n.userId && appId && (n.userId.startsWith(appId) || appId.startsWith(n.userId)))) && 
                            (!n.companyId || !r.companyId || n.companyId === r.companyId) &&
                            n.message && n.message.includes(r.id)
                        );
                        if (!hasNotif) {
                            const newNotif = {
                                id: `NT-${Math.floor(100000 + Math.random() * 900000)}`,
                                companyId: r.companyId || activeCompanyId || 'COMP-101',
                                userId: appId,
                                message: `Worker ${reqName} submitted a new OT request (${r.id}) for project ${projName}.`,
                                timestamp: r.startDate || new Date().toISOString(),
                                read: false
                            };
                            mappedNotifications.unshift(newNotif);
                            supabase.from('notifications').upsert({
                                id: newNotif.id,
                                company_id: newNotif.companyId,
                                user_id: newNotif.userId,
                                message: newNotif.message,
                                timestamp: newNotif.timestamp
                            }).then();
                        }
                    });
                }
            }

            // Sync with local cache
            this.data = {
                ...this.data,
                users: uniqueUsers,
                companies: companies || [],
                company_users: mappedCompanyUsers,
                limits: mappedLimits,
                hierarchy: mappedHierarchy,
                requests: mappedRequests.length > 0 ? mappedRequests : this.data.requests,
                notifications: mappedNotifications.length > 0 ? mappedNotifications : (this.data.notifications || []),
                company_email_settings: sbEmailSettings || this.data.company_email_settings || []
            };

            this.saveData(this.data);
        } catch (e) {
            console.error("Failed to sync from Supabase:", e);
        }
    }

    setupRealtimeSubscription() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
        }

        this.realtimeChannel = supabase
            .channel('public-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
                console.log("Realtime DB update received:", payload);
                await this.syncFromSupabase();
            })
            .subscribe();
    }

    getData() {
        if (!this.data) {
            this.init();
        }
        return this.data;
    }

    saveData(data) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(DB_KEY, JSON.stringify(data));
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('clock_plus_db_update'));
        }
    }

    // --- Users ---
    getUsers() {
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const companyUsers = this.getData().company_users || [];
        
        const ROLE_PRIORITY = {
            superadmin: 1,
            admin: 2,
            superior: 3,
            supervisor: 4,
            worker: 5
        };

        const sortUsersByRoleAndName = (arr) => {
            return arr.sort((a, b) => {
                const rankA = ROLE_PRIORITY[a.role] || 99;
                const rankB = ROLE_PRIORITY[b.role] || 99;
                if (rankA !== rankB) return rankA - rankB;
                const nameA = (a.name || a.email || '').trim();
                const nameB = (b.name || b.email || '').trim();
                return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
            });
        };

        if (!activeCompanyId) {
            const rawUsers = this.getData().users || [];
            const mapped = rawUsers.map(u => {
                const rawRole = (u.role || '').toLowerCase().trim();
                let normalizedRole = 'worker';
                if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
                else if (rawRole === 'admin') normalizedRole = 'admin';
                else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
                else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
                else normalizedRole = 'worker';

                const dataScope = u.data_scope || u.dataScope || (
                    normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                    (normalizedRole === 'superior' ? 'team' : 'own')
                );

                return {
                    ...u,
                    role: normalizedRole,
                    data_scope: dataScope,
                    dataScope: dataScope
                };
            });
            return sortUsersByRoleAndName(mapped);
        }

        const activeCompanyUsers = companyUsers.filter(cu => cu.companyId === activeCompanyId);
        const list = activeCompanyUsers.map(cu => {
            const rawRole = (cu.role || '').toLowerCase().trim();
            let normalizedRole = 'worker';
            if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
            else if (rawRole === 'admin') normalizedRole = 'admin';
            else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
            else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
            else normalizedRole = 'worker';

            const dataScope = cu.data_scope || cu.dataScope || (
                normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                (normalizedRole === 'superior' ? 'team' : 'own')
            );

            const hasCustomName = cu.name && cu.name.trim() !== '' && cu.name.toUpperCase() !== 'EMPTY' && cu.name !== 'User';
            const defaultPosition = normalizedRole === 'superadmin' ? 'Super Administrator' :
                (normalizedRole === 'admin' ? 'Administrator' :
                (normalizedRole === 'superior' ? 'Project Manager' :
                (normalizedRole === 'supervisor' ? 'Site Supervisor' : 'Staff')));

            return {
                id: cu.userId,
                name: hasCustomName ? cu.name : (cu.email || 'User'),
                role: normalizedRole,
                position: cu.position || defaultPosition,
                email: cu.email || '',
                password: cu.password || 'password123',
                permissions: cu.permissions,
                data_scope: dataScope,
                dataScope: dataScope
            };
        });

        return sortUsersByRoleAndName(list);
    }

    getAllUsers() {
        return this.getUsers();
    }

    getUser(id) {
        if (!id) return null;
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const companyUsers = this.getData().company_users || [];
        
        let cu = null;
        if (activeCompanyId) {
            cu = companyUsers.find(m => m.companyId === activeCompanyId && matchesUserIdentifier(m, id));
        }
        if (!cu) {
            cu = companyUsers.find(m => matchesUserIdentifier(m, id));
        }

        if (cu) {
            const rawRole = (cu.role || '').toLowerCase().trim();
            let normalizedRole = 'worker';
            if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
            else if (rawRole === 'admin') normalizedRole = 'admin';
            else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
            else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
            else normalizedRole = 'worker';

            const dataScope = cu.data_scope || cu.dataScope || (
                normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                (normalizedRole === 'superior' ? 'team' : 'own')
            );

            const hasCustomName = cu.name && cu.name.trim() !== '' && cu.name.toUpperCase() !== 'EMPTY' && cu.name !== 'User';
            return {
                id: cu.userId,
                name: hasCustomName ? cu.name : (cu.email || 'User'),
                role: normalizedRole,
                position: cu.position || (normalizedRole === 'admin' ? 'Administrator' : 'Staff'),
                email: cu.email || '',
                password: cu.password || 'password123',
                permissions: cu.permissions,
                data_scope: dataScope,
                dataScope: dataScope
            };
        }

        const globalUser = (this.getData().users || []).find(u => matchesUserIdentifier(u, id));
        if (globalUser) {
            const rawRole = (globalUser.role || '').toLowerCase().trim();
            let normalizedRole = 'worker';
            if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
            else if (rawRole === 'admin') normalizedRole = 'admin';
            else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
            else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
            else normalizedRole = 'worker';

            const dataScope = globalUser.data_scope || globalUser.dataScope || (
                normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                (normalizedRole === 'superior' ? 'team' : 'own')
            );

            return {
                ...globalUser,
                name: globalUser.name || globalUser.email || 'User',
                role: normalizedRole,
                data_scope: dataScope,
                dataScope: dataScope
            };
        }

        return null;
    }

    async signIn(email, password) {
        const normalizedInput = (email || '').toLowerCase().trim();

        // 1. Sync latest users from Supabase
        await this.syncFromSupabase();

        // 2. Search company_users and global users with flexible smart matcher (handles email, userId, username, and mohd <-> muhd)
        const companyUsers = this.getData().company_users || [];
        const match = companyUsers.find(cu => matchesUserIdentifier(cu, normalizedInput));

        // Try Supabase Auth in parallel
        try {
            await supabase.auth.signInWithPassword({
                email: (match && match.email) ? match.email : normalizedInput,
                password: password
            });
        } catch (e) {
            console.warn("Supabase Auth note:", e);
        }

        if (match) {
            const hasCustomName = match.name && match.name.trim() !== '' && match.name.toUpperCase() !== 'EMPTY' && match.name !== 'User';
            const rawRole = (match.role || '').toLowerCase().trim();
            let normalizedRole = 'worker';
            if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
            else if (rawRole === 'admin') normalizedRole = 'admin';
            else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
            else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
            else normalizedRole = 'worker';

            const dataScope = match.data_scope || match.dataScope || (
                normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                (normalizedRole === 'superior' ? 'team' : 'own')
            );

            return {
                id: match.userId,
                name: hasCustomName ? match.name : (match.email || 'User'),
                role: normalizedRole,
                position: match.position || (normalizedRole === 'admin' ? 'Administrator' : 'Staff'),
                email: match.email || normalizedInput,
                data_scope: dataScope,
                dataScope: dataScope,
                permissions: match.permissions
            };
        }

        // 3. Check global users
        const globalUsers = this.getData().users || [];
        const globalMatch = globalUsers.find(u => matchesUserIdentifier(u, normalizedInput));

        if (globalMatch) {
            const rawRole = (globalMatch.role || '').toLowerCase().trim();
            let normalizedRole = 'worker';
            if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
            else if (rawRole === 'admin') normalizedRole = 'admin';
            else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
            else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
            else normalizedRole = 'worker';

            const dataScope = globalMatch.data_scope || globalMatch.dataScope || (
                normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                (normalizedRole === 'superior' ? 'team' : 'own')
            );

            return {
                id: globalMatch.id,
                name: globalMatch.name || globalMatch.email || 'User',
                role: normalizedRole,
                position: globalMatch.position || 'Staff',
                email: globalMatch.email || normalizedInput,
                data_scope: dataScope,
                dataScope: dataScope,
                permissions: globalMatch.permissions
            };
        }

        throw new Error("Invalid username or password. Please check your credentials.");
    }

    getCurrentUser() {
        if (typeof localStorage === 'undefined') return null;
        const activeUserId = localStorage.getItem('clock_plus_session_user_id');
        if (activeUserId) {
            const u = this.getUser(activeUserId);
            if (u) return u;
        }
        const activeEmail = localStorage.getItem('clock_plus_session_user_email');
        if (activeEmail) {
            const u = this.getUsers().find(user => user.email && user.email.toLowerCase() === activeEmail.toLowerCase());
            if (u) return u;
        }
        return null;
    }

    async getActiveSessionUser() {
        const localUser = this.getCurrentUser();
        if (localUser) return localUser;

        try {
            const { data: { user: authUser }, error } = await supabase.auth.getUser();
            if (error || !authUser) return null;

            await this.syncFromSupabase();

            const companyUsers = this.getData().company_users || [];
            const match = companyUsers.find(cu => matchesUserIdentifier(cu, authUser.id) || matchesUserIdentifier(cu, authUser.email));

            if (!match) return null;

            const hasCustomName = match.name && match.name.trim() !== '' && match.name.toUpperCase() !== 'EMPTY' && match.name !== 'User';
            const rawRole = (match.role || '').toLowerCase().trim();
            let normalizedRole = 'worker';
            if (rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'owner') normalizedRole = 'superadmin';
            else if (rawRole === 'admin') normalizedRole = 'admin';
            else if (rawRole === 'superior' || rawRole === 'manager') normalizedRole = 'superior';
            else if (rawRole === 'supervisor' || rawRole === 'coordinator') normalizedRole = 'supervisor';
            else normalizedRole = 'worker';

            const dataScope = match.data_scope || match.dataScope || (
                normalizedRole === 'superadmin' || normalizedRole === 'admin' ? 'global' :
                (normalizedRole === 'superior' ? 'team' : 'own')
            );

            return {
                id: authUser.id,
                name: hasCustomName ? match.name : (authUser.email || 'User'),
                role: normalizedRole,
                position: match.position || (normalizedRole === 'admin' ? 'Administrator' : 'Staff'),
                email: authUser.email,
                data_scope: dataScope,
                dataScope: dataScope,
                permissions: match.permissions
            };
        } catch (e) {
            return null;
        }
    }

    async createUser(user) {
        let activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const data = this.getData();
        if (!activeCompanyId && data.companies && data.companies.length > 0) {
            activeCompanyId = data.companies[0].id;
            localStorage.setItem('clock_plus_session_company_id', activeCompanyId);
        }

        if (!activeCompanyId) {
            throw new Error("No active company workspace. Cannot create user.");
        }

        let authUserId = null;

        // 1. Create User in Supabase Authentication (auth.users)
        if (user.email && user.password) {
            try {
                const { data: authData, error: authErr } = await supabase.auth.signUp({
                    email: user.email,
                    password: user.password,
                    options: {
                        data: {
                            name: user.name || user.email,
                            role: user.role,
                            position: user.position || 'Staff'
                        }
                    }
                });

                if (authErr) {
                    console.warn("Supabase Auth SignUp note:", authErr.message);
                } else if (authData && authData.user) {
                    authUserId = authData.user.id;
                }
            } catch (e) {
                console.error("Supabase Auth SignUp exception:", e);
            }
        }

        const userId = authUserId || user.id || `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

        const newCompanyUser = {
            companyId: activeCompanyId,
            userId: userId,
            name: user.name || user.email,
            role: user.role === 'admin' ? 'admin' : (user.role === 'superior' ? 'superior' : 'member'),
            position: user.position || 'Staff',
            email: user.email || ''
        };

        if (!data.users) data.users = [];
        if (!data.company_users) data.company_users = [];

        data.company_users.push(newCompanyUser);

        // Update deduplicated users cache
        if (!data.users.some(u => u.id === userId)) {
            data.users.push({
                id: userId,
                name: newCompanyUser.name,
                role: user.role,
                position: user.position || 'Staff',
                email: user.email || ''
            });
        }

        this.saveData(data);

        // 2. Insert into company_users in Supabase with the matching Auth User ID
        const { error: cuErr } = await supabase.from('company_users').upsert({
            company_id: activeCompanyId,
            user_id: userId,
            name: newCompanyUser.name,
            role: user.role === 'admin' ? 'admin' : (user.role === 'superior' ? 'superior' : 'member'),
            position: user.position || 'Staff',
            email: user.email || ''
        });

        if (cuErr) {
            console.error("Error creating company user in Supabase:", cuErr);
            throw new Error(`Supabase error: ${cuErr.message}`);
        }

        return newCompanyUser;
    }

    saveUser(user) {
        return this.createUser(user);
    }

    async updateUser(id, updatedFields) {
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const data = this.getData();
        
        // Update user cache
        const index = data.users.findIndex(u => u.id === id || (u.id && (u.id.startsWith(id) || id.startsWith(u.id))));
        if (index !== -1) {
            data.users[index] = { ...data.users[index], ...updatedFields };
        }

        // Update company user mapping cache
        const cuIndex = data.company_users.findIndex(cu => (cu.userId === id || (cu.userId && (cu.userId.startsWith(id) || id.startsWith(cu.userId)))));
        if (cuIndex !== -1) {
            data.company_users[cuIndex] = { ...data.company_users[cuIndex], ...updatedFields };
        }

        this.saveData(data);

        const payload = {};
        if (updatedFields.name !== undefined) payload.name = updatedFields.name;
        if (updatedFields.email !== undefined) payload.email = updatedFields.email;
        if (updatedFields.position !== undefined) payload.position = updatedFields.position;
        if (updatedFields.role !== undefined) {
            payload.role = updatedFields.role;
        }
        if (updatedFields.data_scope !== undefined || updatedFields.dataScope !== undefined) {
            payload.data_scope = updatedFields.data_scope || updatedFields.dataScope;
        }

        console.log("Updating company_users in Supabase with payload:", { id, payload });
        const { data: updatedRows, error } = await supabase
            .from('company_users')
            .update(payload)
            .eq('user_id', id)
            .select();

        if (error) {
            console.error("Supabase update error:", error);
            throw new Error(`Failed to save to Supabase: ${error.message}`);
        }
        
        console.log("Supabase successfully updated:", updatedRows);
        return updatedRows;
    }

    deleteUser(id) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || currentUser.role !== 'superadmin') {
            throw new Error("Unauthorized: Only Super Administrators have the authority to delete user accounts.");
        }

        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        if (!activeCompanyId) return;

        const data = this.getData();
        data.company_users = (data.company_users || []).filter(cu => !(cu.userId === id && cu.companyId === activeCompanyId));
        this.saveData(data);

        supabase.from('company_users').delete().eq('company_id', activeCompanyId).eq('user_id', id).then(({ error }) => {
            if (error) console.error("Error deleting company user mapping in Supabase:", error);
        });
    }

    // Reset user password
    async resetUserPassword(userId, newPassword) {
        const data = this.getData();
        const user = data.users.find(u => u.id === userId);
        if (user) {
            user.password = newPassword;
        }
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const cu = (data.company_users || []).find(m => (m.userId === userId || m.userId?.startsWith(userId)) && m.companyId === activeCompanyId);
        if (cu) {
            cu.password = newPassword;
        }
        this.saveData(data);

        try {
            await supabase.from('company_users').update({
                password: newPassword
            }).eq('company_id', activeCompanyId).eq('user_id', userId);
        } catch (e) {
            console.warn("Supabase company_users password sync:", e);
        }
        return true;
    }

    // Send official Supabase Password Reset Email Link
    async sendPasswordResetEmail(email) {
        if (!email) throw new Error("Email is required to send password reset.");
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });
        if (error) throw error;
        return data;
    }

    // Update user page permissions (e.g. ['dashboard', 'request', 'report', 'settings'])
    async updateUserPermissions(userId, permissions) {
        const data = this.getData();
        if (!data.user_permissions) data.user_permissions = {};
        data.user_permissions[userId] = permissions;

        const user = (data.users || []).find(u => u.id === userId || (u.id && (u.id.startsWith(userId) || userId.startsWith(u.id))));
        if (user) {
            user.permissions = permissions;
        }
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const cu = (data.company_users || []).find(m => (m.userId === userId || (m.userId && (m.userId.startsWith(userId) || userId.startsWith(m.userId)))) && (!activeCompanyId || m.companyId === activeCompanyId));
        if (cu) {
            cu.permissions = permissions;
        }
        this.saveData(data);

        // Also try saving permissions to Supabase if permissions column exists in table
        try {
            await supabase.from('company_users').update({
                permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : permissions
            }).eq('user_id', userId);
        } catch (e) {
            console.warn("Supabase permissions sync note:", e);
        }
        return permissions;
    }

    // Get user allowed pages
    getUserAllowedPages(userId) {
        const data = this.getData();
        if (data.user_permissions && data.user_permissions[userId] && Array.isArray(data.user_permissions[userId]) && data.user_permissions[userId].length > 0) {
            return data.user_permissions[userId];
        }

        const user = this.getUser(userId);
        if (!user) return ['dashboard'];

        if (user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
            return user.permissions;
        }

        if (user.role === 'admin') {
            return ['dashboard', 'request', 'report', 'settings'];
        }
        if (user.role === 'superior') {
            return ['dashboard', 'request', 'report'];
        }
        return ['dashboard', 'request'];
    }

    // --- Projects ---
    getProjects() {
        return this.getData().projects;
    }

    getProject(id) {
        if (!id) return { id: '', name: 'General / Unspecified' };
        const found = this.getProjects().find(p => p.id === id || p.name === id);
        if (found) return found;
        return { id: id, name: id };
    }

    // --- Companies ---
    getCompanies() {
        return this.getData().companies || [];
    }

    getCompany(id) {
        return this.getCompanies().find(c => c.id === id);
    }

    getUserCompanies(userId) {
        const mappings = this.getData().company_users || [];
        const userCompanyIds = mappings
            .filter(m => m.userId === userId || (m.userId && (userId.startsWith(m.userId) || m.userId.startsWith(userId))))
            .map(m => m.companyId);
        const companies = this.getCompanies().filter(c => userCompanyIds.includes(c.id));
        return companies.length > 0 ? companies : this.getCompanies();
    }

    // --- Client Email Settings (Configured by Super Admin) ---
    getCompanyEmailSettings(companyId) {
        if (!companyId) return null;
        const allSettings = this.getData().company_email_settings || [];
        return allSettings.find(s => s.company_id === companyId || s.companyId === companyId) || null;
    }

    async saveCompanyEmailSettings(companyId, settings) {
        if (!companyId) throw new Error("Company ID is required.");
        const data = this.getData();
        if (!data.company_email_settings) data.company_email_settings = [];

        const payload = {
            company_id: companyId,
            is_enabled: Boolean(settings.is_enabled),
            sender_name: settings.sender_name || 'Clock+ Overtime Alerts',
            sender_email: settings.sender_email || '',
            provider_type: settings.provider_type || 'smtp',
            smtp_host: settings.smtp_host || '',
            smtp_port: Number(settings.smtp_port) || 587,
            smtp_user: settings.smtp_user || '',
            smtp_password: settings.smtp_password || '',
            smtp_secure: Boolean(settings.smtp_secure),
            api_key: settings.api_key || '',
            notify_on_request: settings.notify_on_request !== false,
            notify_on_approval: settings.notify_on_approval !== false,
            notify_on_close: settings.notify_on_close !== false,
            hr_cc_email: settings.hr_cc_email || '',
            updated_at: new Date().toISOString(),
            updated_by: this.getCurrentUser()?.email || 'Superadmin'
        };

        const existingIdx = data.company_email_settings.findIndex(s => s.company_id === companyId || s.companyId === companyId);
        if (existingIdx >= 0) {
            data.company_email_settings[existingIdx] = payload;
        } else {
            data.company_email_settings.push(payload);
        }
        this.saveData(data);

        // Upsert to Supabase
        const { error } = await supabase.from('company_email_settings').upsert(payload);
        if (error) {
            console.error("Supabase error saving company email settings:", error);
            throw new Error(`Failed to save to Supabase: ${error.message}`);
        }
        return payload;
    }

    async sendNotificationEmail({ companyId, to, subject, htmlBody, cc, isTest = false }) {
        if (!to) {
            console.warn("[Email Notification] No recipient specified.");
            return { success: false, message: "No recipient specified." };
        }
        
        const activeCompanyId = companyId || localStorage.getItem('clock_plus_session_company_id');
        const settings = this.getCompanyEmailSettings(activeCompanyId);

        if (!isTest) {
            if (!settings || !settings.is_enabled) {
                console.log(`[Email Notification] Email alerts are disabled for company ${activeCompanyId}.`);
                return { success: false, message: "Email notifications disabled for this company." };
            }
        } else {
            if (!settings) {
                throw new Error("Please configure and save email settings first before sending a test.");
            }
        }

        const senderEmail = settings.sender_email || 'noreply@clockplus.app';
        const senderName = settings.sender_name || 'Clock+ Alerts';
        const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
        const ccList = cc ? (Array.isArray(cc) ? cc.filter(Boolean) : [cc].filter(Boolean)) : (settings.hr_cc_email ? [settings.hr_cc_email] : []);

        if (recipients.length === 0) {
            console.warn("[Email Notification] Recipient list is empty.");
            return { success: false, message: "Recipient email is missing." };
        }

        console.log(`[Email Notification] Dispatching email:`, {
            from: `${senderName} <${senderEmail}>`,
            to: recipients,
            cc: ccList,
            subject,
            provider: settings.provider_type
        });

        // 1. Transactional API Dispatch (e.g. Resend)
        if (settings.provider_type === 'api_key' && settings.api_key) {
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${settings.api_key.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: `${senderName} <${senderEmail}>`,
                        to: recipients,
                        cc: ccList.length > 0 ? ccList : undefined,
                        subject: subject,
                        html: htmlBody
                    })
                });
                const resData = await res.json();
                if (!res.ok) {
                    throw new Error(resData.message || resData.name || "Email delivery failed.");
                }
                console.log("[Email Notification] Sent successfully via Resend API:", resData);
                return { success: true, message: `Email delivered to ${recipients.join(', ')}`, data: resData };
            } catch (err) {
                console.error("[Email Notification] API error:", err);
                if (isTest) throw err;
                return { success: false, message: err.message };
            }
        }

        // 2. SMTP Dispatch via Serverless Endpoint
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId: activeCompanyId,
                    settings: {
                        smtp_host: settings.smtp_host,
                        smtp_port: settings.smtp_port,
                        smtp_user: settings.smtp_user,
                        smtp_password: settings.smtp_password,
                        smtp_secure: settings.smtp_secure,
                        sender_name: senderName,
                        sender_email: senderEmail
                    },
                    to: recipients,
                    cc: ccList,
                    subject,
                    html: htmlBody
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.success) {
                    return { success: true, message: data.message || `Email delivered to ${recipients.join(', ')}` };
                }
                throw new Error(data?.error || data?.message || "Email delivery failed.");
            } else {
                let errMsg;
                try {
                    const errData = await res.json();
                    errMsg = errData.error || errData.message;
                } catch {
                    errMsg = `Server returned status ${res.status}`;
                }
                throw new Error(errMsg);
            }
        } catch (apiErr) {
            console.error("[Email Notification] SMTP endpoint error:", apiErr);
            if (isTest) throw apiErr;
            return { success: false, message: apiErr.message };
        }
    }

    // --- Hierarchy ---
    getHierarchy() {
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const all = this.getData().hierarchy || [];
        if (!activeCompanyId) return all;
        return all.filter(h => !h.companyId || h.companyId === activeCompanyId);
    }

    getApproversForWorker(workerId) {
        const mapping = this.getHierarchy().find(h => h.workerId === workerId);
        if (!mapping) return { level1: null, level2: null, level3: null };
        if (mapping.approverIds && Array.isArray(mapping.approverIds)) {
            return {
                level1: mapping.approverIds[0] || null,
                level2: mapping.approverIds[1] || null,
                level3: mapping.approverIds[2] || null
            };
        }
        return {
            level1: mapping.level1 || mapping.approverId || null,
            level2: mapping.level2 || null,
            level3: mapping.level3 || null
        };
    }

    getApproverForWorker(workerId, level = 1) {
        const approvers = this.getApproversForWorker(workerId);
        let target = null;
        if (level === 1) target = approvers.level1;
        else if (level === 2) target = approvers.level2;
        else if (level === 3) target = approvers.level3;
        else target = approvers.level1;

        if (target) return target;

        // Fallback: If no explicit mapping exists, route to first Superadmin, Admin, or Superior in company
        const fallbackLeader = this.getUsers().find(u => (u.role === 'superadmin' || u.role === 'admin' || u.role === 'superior') && u.id !== workerId);
        if (fallbackLeader) return fallbackLeader.id;

        return null;
    }

    getSubordinatesForSuperior(superiorId) {
        const hierarchy = this.getHierarchy();
        const workerIds = [];
        for (const h of hierarchy) {
            const approvers = this.getApproversForWorker(h.workerId);
            if (approvers.level1 === superiorId || approvers.level2 === superiorId || approvers.level3 === superiorId || h.approverId === superiorId) {
                workerIds.push(h.workerId);
            }
        }
        
        const superiorUser = this.getUser(superiorId);
        const isGlobalRole = superiorUser && (superiorUser.role === 'superadmin' || superiorUser.role === 'admin');

        // If hierarchy is not yet explicitly mapped, global admins manage all, superiors manage all non-admins
        if (workerIds.length === 0) {
            if (isGlobalRole) {
                return this.getUsers().filter(u => u.id !== superiorId);
            }
            if (superiorUser && superiorUser.role === 'superior') {
                return this.getUsers().filter(u => u.id !== superiorId && u.role !== 'admin' && u.role !== 'superadmin');
            }
            return [];
        }
        return this.getUsers().filter(u => workerIds.includes(u.id));
    }

    getUserDataScope(userId) {
        const user = this.getUser(userId);
        if (!user) return 'own';
        if (user.data_scope) return user.data_scope;
        if (user.dataScope) return user.dataScope;
        
        if (user.role === 'superadmin' || user.role === 'admin') return 'global';
        if (user.role === 'superior') return 'team';
        
        const subordinates = this.getSubordinatesForSuperior(userId);
        if (subordinates && subordinates.length > 0) return 'team';
        
        return 'own';
    }

    getAccessibleWorkerIds(userId) {
        const scope = this.getUserDataScope(userId);
        if (scope === 'global') {
            return this.getUsers().map(u => u.id);
        }
        if (scope === 'team') {
            const subIds = this.getSubordinatesForSuperior(userId).map(u => u.id);
            const ids = new Set([userId, ...subIds]);
            return Array.from(ids);
        }
        return [userId];
    }

    canUserApproveFor(approverId, workerId) {
        if (!approverId || !workerId) return false;
        const approver = this.getUser(approverId);
        if (!approver) return false;

        // Superadmin and Admin have global approval override power
        if (approver.role === 'superadmin' || approver.role === 'admin') return true;

        // Check assigned hierarchy
        const approvers = this.getApproversForWorker(workerId);
        return approvers.level1 === approverId || approvers.level2 === approverId || approvers.level3 === approverId;
    }

    hasApprovalQueue(userId) {
        const user = this.getUser(userId);
        if (!user) return false;
        if (user.role === 'superadmin' || user.role === 'admin') return true;
        const subordinates = this.getSubordinatesForSuperior(userId);
        return subordinates.length > 0;
    }

    async updateHierarchyMapping(workerId, level1Id, level2Id = null, level3Id = null) {
        const data = this.getData();
        if (!data.hierarchy) data.hierarchy = [];
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');

        const approverIds = [level1Id, level2Id, level3Id].filter(Boolean);
        const index = data.hierarchy.findIndex(h => h.workerId === workerId && (!h.companyId || !activeCompanyId || h.companyId === activeCompanyId));
        const record = {
            companyId: activeCompanyId || null,
            workerId,
            approverId: level1Id || null,
            level1: level1Id || null,
            level2: level2Id || null,
            level3: level3Id || null,
            approverIds
        };

        if (index !== -1) {
            data.hierarchy[index] = record;
        } else {
            data.hierarchy.push(record);
        }
        this.saveData(data);

        try {
            const payload = {
                company_id: activeCompanyId || null,
                worker_id: workerId,
                approver_id: level1Id || '',
                level2_id: level2Id || null,
                level3_id: level3Id || null
            };
            const { error: hierErr } = await supabase.from('hierarchy').upsert(payload);
            if (hierErr) {
                // Fallback for older schema without company_id / level2_id columns
                await supabase.from('hierarchy').upsert({
                    worker_id: workerId,
                    approver_id: level1Id || ''
                });
            }
        } catch (e) {
            console.error("Error upserting hierarchy in Supabase:", e);
        }
    }

    // --- Limits ---
    getLimits() {
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const list = this.getData().limits || [];
        if (!activeCompanyId) return list;
        return list.filter(l => !l.companyId || l.companyId === activeCompanyId);
    }

    getWorkerLimits(workerId) {
        const user = this.getUser(workerId);
        if (!user) return { monthlyMax: 104 };

        const limits = this.getLimits() || [];

        const individual = limits.find(l => l.scope === 'individual' && l.targetId === workerId);
        if (individual) return { monthlyMax: individual.monthlyMax || 104 };

        const position = limits.find(l => l.scope === 'position' && l.targetId === user.position);
        if (position) return { monthlyMax: position.monthlyMax || 104 };

        const global = limits.find(l => l.scope === 'global');
        if (global) return { monthlyMax: global.monthlyMax || 104 };

        return { monthlyMax: 104 };
    }

    getRestDeductionRule() {
        const limitsList = this.getLimits() || [];
        const globalLimit = limitsList.find(l => l.scope === 'global') || {};
        const savedRule = localStorage.getItem('clock_plus_rest_deduction_rule');
        let localConfig = null;
        if (savedRule) {
            try { localConfig = JSON.parse(savedRule); } catch (e) {}
        }

        return {
            enabled: localConfig ? localConfig.enabled : (globalLimit.restDeductionEnabled !== false),
            thresholdHours: Number(localConfig?.thresholdHours ?? globalLimit.restThresholdHours ?? 5),
            deductHours: Number(localConfig?.deductHours ?? globalLimit.restDeductHours ?? 0.5)
        };
    }

    calculateNetOvertime(grossHours) {
        const gross = Number(grossHours) || 0;
        const rule = this.getRestDeductionRule();

        if (!rule.enabled || rule.thresholdHours <= 0 || rule.deductHours <= 0 || gross < rule.thresholdHours) {
            return {
                grossHours: gross,
                restDeducted: 0,
                netHours: gross,
                breakCount: 0,
                ruleApplied: false
            };
        }

        const breakCount = Math.floor(gross / rule.thresholdHours);
        const restDeducted = Number((breakCount * rule.deductHours).toFixed(2));
        const netHours = Math.max(0, Number((gross - restDeducted).toFixed(2)));

        return {
            grossHours: gross,
            restDeducted,
            netHours,
            breakCount,
            ruleApplied: true
        };
    }

    async saveLimit(limit) {
        const data = this.getData();
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        limit.companyId = limit.companyId || activeCompanyId || null;

        const index = data.limits.findIndex(l => 
            (!l.companyId || !activeCompanyId || l.companyId === activeCompanyId) &&
            l.scope === limit.scope && 
            l.targetId === limit.targetId
        );
        if (index !== -1) {
            data.limits[index] = { ...data.limits[index], ...limit };
        } else {
            data.limits.push(limit);
        }
        this.saveData(data);

        if (limit.scope === 'global') {
            localStorage.setItem('clock_plus_rest_deduction_rule', JSON.stringify({
                enabled: limit.restDeductionEnabled !== false,
                thresholdHours: Number(limit.restThresholdHours) || 5,
                deductHours: Number(limit.restDeductHours) || 0.5
            }));
        }

        try {
            let query = supabase.from('limits').delete().eq('scope', limit.scope);
            if (activeCompanyId) {
                query = query.eq('company_id', activeCompanyId);
            }
            if (limit.targetId) {
                await query.eq('target_id', limit.targetId);
            } else {
                await query.is('target_id', null);
            }

            const insertPayload = {
                company_id: activeCompanyId || null,
                scope: limit.scope,
                target_id: limit.targetId,
                monthly_max: limit.monthlyMax || 104
            };
            if (limit.scope === 'global') {
                insertPayload.rest_deduction_enabled = limit.restDeductionEnabled !== false;
                insertPayload.rest_threshold_hours = Number(limit.restThresholdHours) || 5;
                insertPayload.rest_deduct_hours = Number(limit.restDeductHours) || 0.5;
            }

            const { error: insErr } = await supabase.from('limits').insert(insertPayload);
            if (insErr) {
                // If company_id or rest deduction columns don't exist yet in Supabase schema, fallback gracefully
                if (insErr.message && (insErr.message.includes('column') || insErr.code === '42703')) {
                    await supabase.from('limits').insert({
                        scope: limit.scope,
                        target_id: limit.targetId,
                        monthly_max: limit.monthlyMax || 104
                    });
                } else {
                    console.error("Error inserting limit to Supabase:", insErr);
                }
            }
        } catch (e) {
            console.error("Exception saving limit to Supabase:", e);
        }
    }

    // --- Overtime Requests ---
    getRequests() {
        const allRequests = this.getData().requests || [];
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        if (!activeCompanyId) return allRequests;
        return allRequests.filter(r => !r.companyId || r.companyId === activeCompanyId);
    }

    getRequest(id) {
        return this.getRequests().find(r => r.id === id);
    }

    getOverlapInHours(startA, endA, startB, endB) {
        const sA = new Date(startA).getTime();
        const eA = new Date(endA).getTime();
        const sB = new Date(startB).getTime();
        const eB = new Date(endB).getTime();

        const overlapStart = Math.max(sA, sB);
        const overlapEnd = Math.min(eA, eB);

        if (overlapStart < overlapEnd) {
            return (overlapEnd - overlapStart) / (1000 * 60 * 60);
        }
        return 0;
    }

    getAccruedHours(workerId, dateStr, scope = 'day') {
        const requests = this.getRequests().filter(r => r.status === 'Approved' || r.status === 'Completed');
        
        let startWindow, endWindow;
        const refDate = new Date(dateStr + 'T00:00:00');

        if (scope === 'day') {
            startWindow = new Date(refDate);
            startWindow.setHours(0, 0, 0, 0);
            endWindow = new Date(refDate);
            endWindow.setHours(23, 59, 59, 999);
        } else if (scope === 'week') {
            startWindow = getStartOfWeek(refDate);
            endWindow = new Date(startWindow);
            endWindow.setDate(startWindow.getDate() + 7);
            endWindow.setMilliseconds(-1);
        } else if (scope === 'month') {
            startWindow = getStartOfMonth(refDate);
            endWindow = new Date(startWindow.getFullYear(), startWindow.getMonth() + 1, 0);
            endWindow.setHours(23, 59, 59, 999);
        }

        let totalHours = 0;
        for (const req of requests) {
            if (req.requesterId === workerId || (req.teamMembers && req.teamMembers.includes(workerId))) {
                const sDate = req.status === 'Completed' && req.actualStartDate ? req.actualStartDate : req.startDate;
                const eDate = req.status === 'Completed' && req.actualEndDate ? req.actualEndDate : req.endDate;
                totalHours += this.getOverlapInHours(sDate, eDate, startWindow, endWindow);
            }
        }
        return totalHours;
    }

    getRemainingHours(workerId, referenceDate = new Date()) {
        const dateStr = getLocalDateString(referenceDate);
        const limits = this.getWorkerLimits(workerId);
        const dailyAccrued = this.getAccruedHours(workerId, dateStr, 'day');
        const weeklyAccrued = this.getAccruedHours(workerId, dateStr, 'week');
        
        const authorizedReqs = this.getRequests().filter(r => 
            (r.status === 'Approved' || r.status === 'Completed') && (r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId)))
        );
        const totalAuthorized = authorizedReqs.reduce((acc, r) => {
            const h = r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration) : Number(r.duration || 0);
            return acc + (isNaN(h) ? 0 : h);
        }, 0);

        const dailyMax = limits.dailyMax || 4;
        const weeklyMax = limits.weeklyMax || 12;
        const monthlyMax = limits.monthlyMax || 104;

        const dailyRemaining = Math.max(0, dailyMax - dailyAccrued);
        const weeklyRemaining = Math.max(0, weeklyMax - weeklyAccrued);
        const monthlyRemaining = Math.max(0, monthlyMax - totalAuthorized);

        return {
            limits: { dailyMax, weeklyMax, monthlyMax, ...limits },
            accrued: {
                day: dailyAccrued || 0,
                week: weeklyAccrued || 0,
                month: totalApproved || 0,
                total: totalApproved || 0
            },
            remaining: {
                day: dailyRemaining || 0,
                week: weeklyRemaining || 0,
                month: monthlyRemaining || 0,
                overall: monthlyRemaining
            }
        };
    }

    checkLimitsForRequest(workerId, startDate, endDate, teamMembers = [], existingRequestId = null) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (isNaN(duration) || duration <= 0) {
            return { allowed: false, error: 'Invalid schedule dates.' };
        }

        const dateStr = getLocalDateString(start);
        const allParticipants = [workerId, ...teamMembers];
        const results = [];

        let limitExceeded = false;
        let limitType = null;

        for (const pid of allParticipants) {
            const limits = this.getWorkerLimits(pid);
            const user = this.getUser(pid);
            const monthlyMax = limits.monthlyMax || 104;

            const requests = this.getRequests().filter(r => r.status === 'Approved' && r.id !== existingRequestId);
            
            const getAccruedExcludingSelf = () => {
                const refDate = new Date(dateStr + 'T00:00:00');
                const startWindow = getStartOfMonth(refDate);
                const endWindow = new Date(startWindow.getFullYear(), startWindow.getMonth() + 1, 0); 
                endWindow.setHours(23, 59, 59, 999);

                let total = 0;
                for (const req of requests) {
                    if (req.requesterId === pid || (req.teamMembers && req.teamMembers.includes(pid))) {
                        total += this.getOverlapInHours(req.startDate, req.endDate, startWindow, endWindow);
                    }
                }
                return total;
            };

            const monthAccrued = getAccruedExcludingSelf();
            const monthStart = getStartOfMonth(start);
            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0); 
            monthEnd.setHours(23,59,59,999);
            const newMonthOverlap = this.getOverlapInHours(startDate, endDate, monthStart, monthEnd);
            const finalMonth = monthAccrued + newMonthOverlap;

            const monthExceeded = finalMonth > monthlyMax;

            if (monthExceeded) {
                limitExceeded = true;
                limitType = 'monthly';
            }

            results.push({
                userId: pid,
                userName: user ? user.name : pid,
                limits,
                accrued: { month: monthAccrued },
                proposed: { month: newMonthOverlap },
                totals: { month: finalMonth },
                exceeded: { month: monthExceeded }
            });
        }

        return {
            allowed: !limitExceeded,
            limitType,
            details: results
        };
    }

    createRequest(reqData) {
        const data = this.getData();
        const newId = `OT-${Math.floor(100000 + Math.random() * 900000)}`;
        const newRequest = {
            id: newId,
            ...reqData,
            history: [
                { timestamp: new Date().toISOString(), userId: reqData.requesterId, action: 'Created request' }
            ]
        };
        data.requests.push(newRequest);
        this.saveData(data);

        const reqUser = this.getUser(newRequest.requesterId);
        const approverUser = this.getUser(newRequest.approverId);
        const proj = this.getProject(newRequest.project);
        const projName = proj ? proj.name : (newRequest.project || 'Project');

        if (newRequest.status === 'Approved') {
            if (newRequest.teamMembers && newRequest.teamMembers.length > 0) {
                newRequest.teamMembers.forEach(tid => {
                    this.createNotification(
                        tid,
                        `Superior ${reqUser ? reqUser.name : 'Supervisor'} assigned you to an approved overtime shift (${newId}) for project ${projName}.`
                    );
                });
            }
        } else if (newRequest.status === 'Pending Approval') {
            const approverIds = new Set();
            if (newRequest.approverId) approverIds.add(newRequest.approverId);

            const approvers = this.getApproversForWorker(newRequest.requesterId);
            if (approvers.level1) approverIds.add(approvers.level1);
            if (approvers.level2) approverIds.add(approvers.level2);
            if (approvers.level3) approverIds.add(approvers.level3);

            // If no explicit approver is assigned, notify company superiors and admins
            if (approverIds.size === 0) {
                const superiors = this.getUsers().filter(u => (u.role === 'superior' || u.role === 'admin') && u.id !== newRequest.requesterId);
                superiors.forEach(s => approverIds.add(s.id));
            }

            approverIds.forEach(targetId => {
                this.createNotification(
                    targetId,
                    `Worker ${reqUser ? reqUser.name : newRequest.requesterId} submitted a new OT request (${newId}) for project ${projName}.`
                );
            });

            // Email notification to Approver(s)
            try {
                const activeCoId = activeCompanyId || (this.getCompanies()[0]?.id);
                const emailSettings = this.getCompanyEmailSettings(activeCoId);
                if (emailSettings && emailSettings.is_enabled && emailSettings.notify_on_request) {
                    const clientCompany = this.getCompany(activeCoId);
                    const approverEmails = Array.from(approverIds)
                        .map(aid => this.getUser(aid)?.email)
                        .filter(Boolean);

                    if (approverEmails.length > 0) {
                        const primaryApprover = this.getUser(Array.from(approverIds)[0]);
                        const emailHtml = generateNewRequestEmailHtml({
                            req: newRequest,
                            workerName: reqUser ? reqUser.name : newRequest.requesterId,
                            approverName: primaryApprover ? primaryApprover.name : 'Approver',
                            projectName: projName,
                            clientName: clientCompany ? clientCompany.name : 'Clock+'
                        });
                        this.sendNotificationEmail({
                            companyId: activeCoId,
                            to: approverEmails,
                            subject: `[Clock+] New OT Request (${newId}) from ${reqUser ? reqUser.name : 'Worker'}`,
                            htmlBody: emailHtml
                        }).catch(e => console.warn("Email dispatch error:", e));
                    }
                }
            } catch (e) {
                console.warn("Could not check email settings:", e);
            }
        } else if (newRequest.status === 'Pending Worker Consent' && newRequest.requesterId) {
            this.createNotification(
                newRequest.requesterId,
                `Superior ${approverUser ? approverUser.name : 'Supervisor'} assigned you overtime (${newId}). Consent is required.`
            );
        }

        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        const payload = {
            id: newRequest.id,
            company_id: activeCompanyId || null,
            requester_id: newRequest.requesterId,
            approver_id: newRequest.approverId,
            project: newRequest.project,
            work_progress: newRequest.workProgress || newRequest.work_progress || '',
            target_work: newRequest.targetWork || newRequest.target_work || '',
            overtime_date: newRequest.dateStart || newRequest.overtimeDate || (newRequest.startDate ? newRequest.startDate.slice(0, 10) : null),
            date_start: newRequest.dateStart || (newRequest.startDate ? newRequest.startDate.slice(0, 10) : null),
            date_end: newRequest.dateEnd || (newRequest.endDate ? newRequest.endDate.slice(0, 10) : null),
            time_start: newRequest.timeStart || null,
            time_end: newRequest.timeEnd || null,
            start_date: newRequest.startDate,
            end_date: newRequest.endDate,
            duration: Number(newRequest.duration) || 0,
            team_members: newRequest.teamMembers || [],
            status: newRequest.status,
            rejection_reason: newRequest.rejectionReason || null,
            approver_remarks: newRequest.approverRemarks || null
        };

        supabase.from('overtime_requests').upsert(payload).then(({ error }) => {
            if (error) {
                console.error("Supabase insert error for overtime_requests:", error);
            }
        });

        return newRequest;
    }

    updateRequest(id, updatedFields, actionUserId, actionText) {
        const data = this.getData();
        const index = data.requests.findIndex(r => r.id === id);
        if (index === -1) throw new Error(`Request ${id} not found.`);

        const oldRequest = data.requests[index];
        const newRequest = { ...oldRequest, ...updatedFields };

        newRequest.history.push({
            timestamp: new Date().toISOString(),
            userId: actionUserId,
            action: actionText || 'Updated request'
        });

        data.requests[index] = newRequest;
        this.saveData(data);

        if (actionText.includes('Approved')) {
            const notesText = newRequest.approverRemarks ? ` Notes: "${newRequest.approverRemarks}"` : '';
            this.createNotification(newRequest.requesterId, `Your OT request ${id} has been Approved.${notesText}`);
            if (newRequest.teamMembers) {
                newRequest.teamMembers.forEach(tid => {
                    this.createNotification(tid, `You have been added to an approved OT session ${id} for project ${this.getProject(newRequest.project)?.name || newRequest.project}.${notesText}`);
                });
            }
        } else if (actionText.includes('Rejected')) {
            this.createNotification(newRequest.requesterId, `Your OT request ${id} has been Rejected. Reason: ${newRequest.rejectionReason || 'Not specified'}`);
        } else if (actionText.includes('Modified')) {
            const notesText = newRequest.approverRemarks ? ` Notes: "${newRequest.approverRemarks}"` : '';
            this.createNotification(newRequest.requesterId, `Your OT request ${id} has been modified and approved by superior.${notesText}`);
            if (newRequest.teamMembers) {
                newRequest.teamMembers.forEach(tid => {
                    this.createNotification(tid, `You have been added to an approved OT session ${id} for project ${this.getProject(newRequest.project)?.name || newRequest.project}.${notesText}`);
                });
            }
        } else if (actionText.includes('Consented')) {
            const workerName = this.getUser(newRequest.requesterId)?.name || newRequest.requesterId;
            this.createNotification(newRequest.approverId, `Worker ${workerName} has consented to the Special Request ${id}. Status is now Approved.`);
            if (newRequest.teamMembers) {
                newRequest.teamMembers.forEach(tid => {
                    this.createNotification(tid, `You have been added to finalized OT session ${id} for project ${this.getProject(newRequest.project)?.name || newRequest.project}.`);
                });
            }
        }

        // Email status update notification to worker
        try {
            const activeCoId = newRequest.companyId || localStorage.getItem('clock_plus_session_company_id') || (this.getCompanies()[0]?.id);
            const emailSettings = this.getCompanyEmailSettings(activeCoId);
            if (emailSettings && emailSettings.is_enabled && emailSettings.notify_on_approval && (actionText.includes('Approved') || actionText.includes('Rejected') || actionText.includes('Modified'))) {
                const clientCompany = this.getCompany(activeCoId);
                const workerUser = this.getUser(newRequest.requesterId);
                const approverUser = this.getUser(actionUserId);
                const status = actionText.includes('Rejected') ? 'Rejected' : 'Approved';
                const remarks = actionText.includes('Rejected') ? newRequest.rejectionReason : newRequest.approverRemarks;

                if (workerUser && workerUser.email) {
                    const emailHtml = generateStatusUpdateEmailHtml({
                        req: newRequest,
                        workerName: workerUser.name || 'Worker',
                        status: status,
                        approverName: approverUser ? approverUser.name : 'Approver',
                        remarks: remarks,
                        clientName: clientCompany ? clientCompany.name : 'Clock+'
                    });
                    this.sendNotificationEmail({
                        companyId: activeCoId,
                        to: workerUser.email,
                        subject: `[Clock+] OT Request ${id} ${status}`,
                        htmlBody: emailHtml
                    }).catch(e => console.warn("Email status update error:", e));
                }
            }
        } catch (e) {
            console.warn("Could not check approval email settings:", e);
        }

        supabase.from('overtime_requests').update({
            status: newRequest.status,
            rejection_reason: newRequest.rejectionReason || null,
            approver_remarks: newRequest.approverRemarks || null,
            date_start: newRequest.date_start || (newRequest.startDate ? newRequest.startDate.slice(0, 10) : null),
            date_end: newRequest.date_end || (newRequest.endDate ? newRequest.endDate.slice(0, 10) : null),
            time_start: newRequest.timeStart || null,
            time_end: newRequest.timeEnd || null,
            start_date: newRequest.startDate,
            end_date: newRequest.endDate,
            duration: Number(newRequest.duration) || 0
        }).eq('id', id).then(({ error }) => {
            if (error) console.error("Error updating overtime_requests in Supabase:", error);
        });

        return newRequest;
    }

    closeOvertimeRequest(id, closeoutData, actionUserId) {
        const data = this.getData();
        const index = data.requests.findIndex(r => r.id === id);
        if (index === -1) throw new Error(`Request ${id} not found.`);

        const req = data.requests[index];
        const user = this.getCurrentUser();
        const actorId = actionUserId || (user ? user.id : req.requesterId);
        const actorName = user ? user.name : 'Requester';

        const updatedFields = {
            status: 'Completed',
            actualStartDate: closeoutData.actualStartDate || req.startDate,
            actualEndDate: closeoutData.actualEndDate || req.endDate,
            actualTimeStart: closeoutData.actualTimeStart || req.timeStart,
            actualTimeEnd: closeoutData.actualTimeEnd || req.timeEnd,
            actualDateStart: closeoutData.actualDateStart || req.dateStart,
            actualDateEnd: closeoutData.actualDateEnd || req.dateEnd,
            actualDuration: Number(closeoutData.actualDuration) || Number(req.duration) || 0,
            actualGrossDuration: Number(closeoutData.actualGrossDuration) || Number(req.grossDuration || req.duration) || 0,
            actualRestDeduction: Number(closeoutData.actualRestDeduction) || 0,
            closingRemarks: closeoutData.closingRemarks || '',
            closedAt: new Date().toISOString(),
            closedBy: actorId
        };

        const newRequest = { ...req, ...updatedFields };
        newRequest.history = newRequest.history || [];
        newRequest.history.push({
            timestamp: new Date().toISOString(),
            userId: actorId,
            action: `Closed & Completed Overtime (${updatedFields.actualDuration}h net actual). Remarks: "${updatedFields.closingRemarks || 'None'}"`
        });

        data.requests[index] = newRequest;
        this.saveData(data);

        // Notify Approver / Superior that work was completed and closed
        const approverIds = new Set();
        if (req.approverId) approverIds.add(req.approverId);
        const hierApprovers = this.getApproversForWorker(req.requesterId);
        if (hierApprovers.level1) approverIds.add(hierApprovers.level1);
        if (hierApprovers.level2) approverIds.add(hierApprovers.level2);
        if (hierApprovers.level3) approverIds.add(hierApprovers.level3);

        const projName = this.getProject(newRequest.project)?.name || newRequest.project;
        approverIds.forEach(targetId => {
            if (targetId !== actorId) {
                this.createNotification(
                    targetId,
                    `${actorName} has closed and completed Overtime shift (${id}) on ${projName} with ${updatedFields.actualDuration}h actual claimable time.`
                );
            }
        });

        // Email notification on closeout & finalization
        try {
            const activeCoId = req.companyId || localStorage.getItem('clock_plus_session_company_id') || (this.getCompanies()[0]?.id);
            const emailSettings = this.getCompanyEmailSettings(activeCoId);
            if (emailSettings && emailSettings.is_enabled && emailSettings.notify_on_close) {
                const clientCompany = this.getCompany(activeCoId);
                const workerUser = this.getUser(req.requesterId);
                const recipients = [];
                if (workerUser?.email) recipients.push(workerUser.email);
                Array.from(approverIds).forEach(aid => {
                    const em = this.getUser(aid)?.email;
                    if (em && !recipients.includes(em)) recipients.push(em);
                });

                if (recipients.length > 0) {
                    const emailHtml = generateClosedOtEmailHtml({
                        req: newRequest,
                        workerName: workerUser ? workerUser.name : 'Worker',
                        actualHours: updatedFields.actualDuration,
                        closedByName: actorName,
                        clientName: clientCompany ? clientCompany.name : 'Clock+'
                    });
                    this.sendNotificationEmail({
                        companyId: activeCoId,
                        to: recipients,
                        subject: `[Clock+] OT Request ${id} Closed & Finalized`,
                        htmlBody: emailHtml
                    }).catch(e => console.warn("Email closeout notification error:", e));
                }
            }
        } catch (e) {
            console.warn("Could not check close email settings:", e);
        }

        // Sync to Supabase
        const sbPayload = {
            status: 'Completed',
            actual_start_date: updatedFields.actualStartDate,
            actual_end_date: updatedFields.actualEndDate,
            actual_time_start: updatedFields.actualTimeStart,
            actual_time_end: updatedFields.actualTimeEnd,
            actual_duration: updatedFields.actualDuration,
            actual_gross_duration: updatedFields.actualGrossDuration,
            actual_rest_deduction: updatedFields.actualRestDeduction,
            closing_remarks: updatedFields.closingRemarks,
            closed_at: updatedFields.closedAt,
            closed_by: updatedFields.closedBy
        };

        supabase.from('overtime_requests').update(sbPayload).eq('id', id).then(({ error }) => {
            if (error) {
                // If columns not added yet in Supabase, update at least status
                supabase.from('overtime_requests').update({ status: 'Completed' }).eq('id', id).catch(e => {});
            }
        });

        return newRequest;
    }

    cancelOvertimeRequest(id, cancelData = {}, actionUserId) {
        const data = this.getData();
        const index = data.requests.findIndex(r => r.id === id);
        if (index === -1) throw new Error(`Request ${id} not found.`);

        const req = data.requests[index];
        const user = this.getCurrentUser();
        const actorId = actionUserId || (user ? user.id : req.requesterId);
        const actorName = user ? user.name : 'Requester';
        const remarks = (cancelData.cancellationRemarks || cancelData.closingRemarks || '').trim() || 'Work did not proceed.';

        const updatedFields = {
            status: 'Cancelled',
            actualDuration: 0,
            actualGrossDuration: 0,
            actualRestDeduction: 0,
            closingRemarks: remarks,
            cancellationReason: remarks,
            closedAt: new Date().toISOString(),
            closedBy: actorId
        };

        const newRequest = { ...req, ...updatedFields };
        newRequest.history = newRequest.history || [];
        newRequest.history.push({
            timestamp: new Date().toISOString(),
            userId: actorId,
            action: `Cancelled Overtime (0.0h recorded). Reason: "${remarks}"`
        });

        data.requests[index] = newRequest;
        this.saveData(data);

        // Notify Approvers / Superiors
        const approverIds = new Set();
        if (req.approverId) approverIds.add(req.approverId);
        const hierApprovers = this.getApproversForWorker(req.requesterId);
        if (hierApprovers.level1) approverIds.add(hierApprovers.level1);
        if (hierApprovers.level2) approverIds.add(hierApprovers.level2);
        if (hierApprovers.level3) approverIds.add(hierApprovers.level3);

        const projName = this.getProject(newRequest.project)?.name || newRequest.project;
        approverIds.forEach(targetId => {
            if (targetId !== actorId) {
                this.createNotification(
                    targetId,
                    `${actorName} cancelled Overtime shift (${id}) on ${projName} (0.0h). Reason: "${remarks}"`
                );
            }
        });

        // Sync to Supabase
        const sbPayload = {
            status: 'Cancelled',
            actual_duration: 0,
            actual_gross_duration: 0,
            actual_rest_deduction: 0,
            closing_remarks: remarks,
            closed_at: updatedFields.closedAt,
            closed_by: updatedFields.closedBy
        };

        supabase.from('overtime_requests').update(sbPayload).eq('id', id).then(({ error }) => {
            if (error) {
                supabase.from('overtime_requests').update({ status: 'Cancelled' }).eq('id', id).catch(e => {});
            }
        });

        return newRequest;
    }

    // Superadmin-exclusive OT Override
    overrideRequest(id, overrideData, actionUserId) {
        const currentUser = this.getCurrentUser();
        const actorRole = currentUser ? currentUser.role : null;
        if (actorRole !== 'superadmin') {
            throw new Error("Unauthorized: Only Super Administrators can override overtime records.");
        }

        const data = this.getData();
        const index = data.requests.findIndex(r => r.id === id);
        if (index === -1) throw new Error(`Request ${id} not found.`);

        const oldRequest = data.requests[index];
        const actorId = actionUserId || (currentUser ? currentUser.id : 'superadmin');
        const actorName = currentUser ? (currentUser.name || currentUser.email) : 'Super Administrator';

        const history = Array.isArray(oldRequest.history) ? [...oldRequest.history] : [];
        history.push({
            timestamp: new Date().toISOString(),
            userId: actorId,
            action: `Record overridden by Superadmin ${actorName}`
        });

        const newRequest = {
            ...oldRequest,
            ...overrideData,
            history
        };

        data.requests[index] = newRequest;
        this.saveData(data);

        // Sync to Supabase
        const sbPayload = {
            project: newRequest.project,
            status: newRequest.status,
            date_start: newRequest.dateStart || (newRequest.startDate ? newRequest.startDate.slice(0, 10) : null),
            date_end: newRequest.dateEnd || (newRequest.endDate ? newRequest.endDate.slice(0, 10) : null),
            time_start: newRequest.timeStart || null,
            time_end: newRequest.timeEnd || null,
            start_date: newRequest.startDate,
            end_date: newRequest.endDate,
            duration: Number(newRequest.duration) || 0,
            actual_start_date: newRequest.actualStartDate || null,
            actual_end_date: newRequest.actualEndDate || null,
            actual_duration: newRequest.actualDuration != null ? Number(newRequest.actualDuration) : null,
            actual_gross_duration: newRequest.actualGrossDuration != null ? Number(newRequest.actualGrossDuration) : null,
            actual_rest_deduction: newRequest.actualRestDeduction != null ? Number(newRequest.actualRestDeduction) : null,
            target_work: newRequest.targetWork || '',
            work_progress: newRequest.workProgress || '',
            approver_remarks: newRequest.approverRemarks || null,
            rejection_reason: newRequest.rejectionReason || null,
            closing_remarks: newRequest.closingRemarks || null
        };

        supabase.from('overtime_requests').update(sbPayload).eq('id', id).then(({ error }) => {
            if (error) console.error("Error updating overtime request override in Supabase:", error);
        });

        window.dispatchEvent(new Event('clock_plus_db_update'));
        return newRequest;
    }

    // Superadmin-exclusive OT Deletion
    deleteRequest(id, actionUserId) {
        const currentUser = this.getCurrentUser();
        const actorRole = currentUser ? currentUser.role : null;
        if (actorRole !== 'superadmin') {
            throw new Error("Unauthorized: Only Super Administrators can delete overtime records.");
        }

        const data = this.getData();
        const index = data.requests.findIndex(r => r.id === id);
        if (index === -1) throw new Error(`Request ${id} not found.`);

        const removedRequest = data.requests.splice(index, 1)[0];
        this.saveData(data);

        // Delete from Supabase
        supabase.from('overtime_requests').delete().eq('id', id).then(({ error }) => {
            if (error) console.error("Error deleting overtime request from Supabase:", error);
        });

        window.dispatchEvent(new Event('clock_plus_db_update'));
        return removedRequest;
    }

    // --- Notifications ---
    cleanupExpiredNotifications() {
        const data = this.getData();
        if (!data.notifications || data.notifications.length === 0) return;

        // Auto-purge threshold: 5 days (5 * 24 * 60 * 60 * 1000 ms)
        const fiveDaysAgoMs = Date.now() - (5 * 24 * 60 * 60 * 1000);
        const validNotifs = [];
        const expiredIds = [];

        data.notifications.forEach(n => {
            const time = new Date(n.timestamp).getTime();
            if (isNaN(time) || time >= fiveDaysAgoMs) {
                validNotifs.push(n);
            } else {
                expiredIds.push(n.id);
            }
        });

        if (expiredIds.length > 0) {
            data.notifications = validNotifs;
            this.saveData(data);

            const fiveDaysAgoISO = new Date(fiveDaysAgoMs).toISOString();
            supabase.from('notifications').delete().lt('timestamp', fiveDaysAgoISO).then(({ error }) => {
                if (error) console.error("Error purging expired notifications from Supabase:", error);
                else console.log(`Auto-purged ${expiredIds.length} notifications older than 5 days.`);
            });
        }
    }

    _isUserMatch(notifUserId, targetUserId) {
        if (!notifUserId || !targetUserId) return false;
        const nId = String(notifUserId).toLowerCase().trim();
        const tId = String(targetUserId).toLowerCase().trim();
        if (nId === tId) return true;

        const u = this.getUser(targetUserId);
        if (u) {
            const uId = u.id ? String(u.id).toLowerCase().trim() : '';
            const uEmail = u.email ? String(u.email).toLowerCase().trim() : '';
            if (uId && nId === uId) return true;
            if (uEmail && nId === uEmail) return true;
            if (uId && uId.length > 5 && (nId.startsWith(uId) || uId.startsWith(nId))) return true;
        }

        if (tId.length > 5 && (nId.startsWith(tId) || tId.startsWith(nId))) return true;
        return false;
    }

    getNotifications(userId) {
        this.cleanupExpiredNotifications();
        if (!userId) return [];
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        return (this.getData().notifications || []).filter(n => 
            this._isUserMatch(n.userId, userId) && (!n.companyId || !activeCompanyId || n.companyId === activeCompanyId)
        );
    }

    getUnreadNotificationsCount(userId) {
        return this.getNotifications(userId).filter(n => !n.read).length;
    }

    createNotification(userId, message) {
        const data = this.getData();
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id') || (data.companies && data.companies[0]?.id) || 'COMP-101';
        const newId = `NT-${Math.floor(100000 + Math.random() * 900000)}`;
        const newNotif = {
            id: newId,
            companyId: activeCompanyId,
            userId,
            message,
            timestamp: new Date().toISOString(),
            read: false
        };
        if (!data.notifications) data.notifications = [];
        data.notifications.push(newNotif);
        this.saveData(data);

        supabase.from('notifications').upsert({
            id: newNotif.id,
            company_id: activeCompanyId,
            user_id: newNotif.userId,
            message: newNotif.message,
            timestamp: newNotif.timestamp
        }).then(({ error }) => {
            if (error) {
                console.error("Error inserting notification to Supabase:", error);
            } else {
                console.log("Notification saved to Supabase:", newNotif.id);
            }
        });
    }

    deleteNotification(notifId) {
        const data = this.getData();
        if (!data.notifications) return;
        data.notifications = data.notifications.filter(n => n.id !== notifId);
        this.saveData(data);

        supabase.from('notifications').delete().eq('id', notifId).then(({ error }) => {
            if (error) console.error("Error deleting notification from Supabase:", error);
        });
    }

    clearAllNotifications(userId) {
        const data = this.getData();
        if (!data.notifications) return;
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        data.notifications = data.notifications.filter(n => {
            const matchesUser = this._isUserMatch(n.userId, userId);
            const matchesCompany = !n.companyId || !activeCompanyId || n.companyId === activeCompanyId;
            return !(matchesUser && matchesCompany);
        });
        this.saveData(data);

        const u = this.getUser(userId);
        const idsToClear = [userId, u?.id, u?.email].filter(Boolean);
        for (const uid of idsToClear) {
            let query = supabase.from('notifications').delete().eq('user_id', uid);
            if (activeCompanyId) {
                query = query.eq('company_id', activeCompanyId);
            }
            query.then(({ error }) => {
                if (error) console.error("Error clearing notifications from Supabase:", error);
            });
        }
    }

    markNotificationsAsRead(userId) {
        const data = this.getData();
        const activeCompanyId = localStorage.getItem('clock_plus_session_company_id');
        if (data.notifications) {
            data.notifications.forEach(n => {
                if (this._isUserMatch(n.userId, userId) && (!n.companyId || !activeCompanyId || n.companyId === activeCompanyId)) {
                    n.read = true;
                }
            });
            this.saveData(data);
        }

        // Send update if read column exists
        let query = supabase.from('notifications').update({ read: true }).eq('user_id', userId);
        if (activeCompanyId) {
            query = query.eq('company_id', activeCompanyId);
        }
        query.then(({ error }) => {
            // Silently handled if read column is omitted in schema
        });
    }
}

export const db = new Database();
export default db;
