// Clock+ Admin View Controller - 4 Dedicated Pages (Dashboard, Request, Report, Settings)
import { db } from '../db.js';
import { showToast, showRequestSubmittedModal, showRequestDecisionModal, formatDateTime, formatDateOnly, icons } from './shared.js';

export function renderAdminView(container, subview = 'dashboard') {
    if (subview === 'request') {
        renderAdminRequest(container);
    } else if (subview === 'report') {
        renderAdminReport(container);
    } else if (subview === 'settings') {
        renderAdminSettings(container);
    } else {
        renderAdminDashboard(container);
    }
}

// =========================================================================
// 1. ADMIN DASHBOARD (Executive Overview & Live Summary)
// =========================================================================
export function renderAdminDashboard(container) {
    const requests = db.getRequests();
    const users = db.getUsers();
    const workers = users.filter(u => u.role === 'worker');
    const currentUser = db.getCurrentUser();
    const currentUserId = currentUser ? currentUser.id : null;
    
    const approvedRequests = requests.filter(r => r.status === 'Approved');
    const pendingRequests = requests.filter(r => r.status === 'Pending Approval' || r.status === 'Pending Worker Consent');
    
    const totalApprovedHours = approvedRequests.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);

    let pendingQueueHtml = `
        <!-- Pending Approvals Queue for Admin -->
        <div class="card glass-panel" style="margin-bottom: 20px; border-left: 4px solid var(--warning);">
            <div class="card-header" style="margin-bottom: 12px;">
                <div>
                    <h2 class="card-title">${icons.hierarchy} Pending Approvals Queue</h2>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                        Review, adjust, approve, or reject overtime requests across your organization.
                    </p>
                </div>
                <span class="badge ${pendingRequests.length > 0 ? 'badge-pending' : 'badge-approved'}">${pendingRequests.length} Pending</span>
            </div>

            ${pendingRequests.length === 0 ? `
                <div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted);">
                    ${icons.check}
                    <div style="margin-top: 8px; font-weight: 500; font-size: 0.88rem;">No pending overtime requests to review. All caught up!</div>
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 12px;" id="admin-pending-list">
                    ${pendingRequests.map(r => {
                        const worker = db.getUser(r.requesterId);
                        const project = db.getProject(r.project);
                        const teamNames = r.teamMembers && r.teamMembers.length > 0
                            ? r.teamMembers.map(tid => db.getUser(tid)?.name || tid).join(', ')
                            : 'None';
                        const specialBadge = r.isSpecialRequest ? `<span class="badge badge-special" style="margin-left: 8px;">Special Request</span>` : '';

                        return `
                            <div class="mobile-shift-card">
                                <div class="mobile-shift-header">
                                    <div>
                                        <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700; color:var(--primary); margin-bottom:2px;">Requested by:</div>
                                        <div style="font-weight:700; font-size:1.02rem; color:var(--text-main);">
                                            ${worker ? worker.name : r.requesterId}
                                            ${specialBadge}
                                        </div>
                                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                                            <strong>${project ? project.name : (r.project || 'Project')}</strong> (${r.id})
                                        </div>
                                    </div>
                                    <div style="font-size: 1.1rem; font-weight:700; color:var(--primary);">${Number(r.duration || 0).toFixed(1)} hrs</div>
                                </div>

                                <div style="font-size:0.84rem; line-height:1.4; color:var(--text-main);">
                                    <div><strong>Regular Progress:</strong> ${r.workProgress || r.work_progress || 'N/A'}</div>
                                    <div style="margin-top:4px;"><strong>Target:</strong> ${r.targetWork || r.target_work || 'N/A'}</div>
                                    ${teamNames !== 'None' ? `<div style="margin-top:4px; font-size:0.78rem; color:var(--text-muted);"><strong>Team:</strong> ${teamNames}</div>` : ''}
                                </div>

                                <div style="font-size:0.78rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:6px; margin-top:4px;">
                                    <div>Schedule: <strong>${formatDateTime(r.startDate)}</strong> to <strong>${formatDateTime(r.endDate)}</strong></div>
                                </div>

                                <div class="mobile-shift-actions">
                                    <button class="btn btn-secondary btn-sm admin-modify-btn" data-id="${r.id}">Review & Adjust</button>
                                    <button class="btn btn-danger btn-sm admin-reject-btn" data-id="${r.id}">Reject</button>
                                    <button class="btn btn-success btn-sm admin-approve-btn" data-id="${r.id}">Approve</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;

    // Current user personal monthly limit calculation
    const myAllRequests = requests.filter(r => 
        r.requesterId === currentUserId || (r.teamMembers && r.teamMembers.includes(currentUserId))
    );
    const myApproved = myAllRequests.filter(r => r.status === 'Approved' || r.status === 'Completed');
    const myApprovedHours = myApproved.reduce((acc, r) => {
        const h = r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration) : Number(r.duration || 0);
        return acc + (isNaN(h) ? 0 : h);
    }, 0);
    const myLimits = currentUserId ? db.getWorkerLimits(currentUserId) : { monthlyMax: 104 };
    const myMonthlyMax = myLimits.monthlyMax || 104;
    const myRemainingHours = Math.max(0, myMonthlyMax - myApprovedHours);
    const myPercentage = myMonthlyMax > 0 ? Math.min(100, Math.round((myApprovedHours / myMonthlyMax) * 100)) : 0;
    const myProgressColor = myPercentage >= 90 ? 'var(--danger)' : (myPercentage >= 70 ? 'var(--warning)' : 'var(--success)');

    // Determine available years from database
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const existingYears = Array.from(new Set(requests.map(r => {
        const dStr = r.startDate || r.overtimeDate || r.dateStart;
        if (!dStr) return null;
        const d = new Date(dStr);
        return !isNaN(d.getTime()) ? d.getFullYear() : null;
    }).filter(Boolean)));
    if (!existingYears.includes(currentYear)) existingYears.push(currentYear);
    existingYears.sort((a,b) => b - a);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    container.innerHTML = `
        <!-- KPI Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <!-- Monthly Limit Used Card (Personal) -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid ${myProgressColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Monthly Limit Used</div>
                    <span class="badge ${myPercentage >= 90 ? 'badge-rejected' : (myPercentage >= 70 ? 'badge-pending' : 'badge-approved')}" style="font-size: 0.75rem;">${myPercentage}%</span>
                </div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-top: 6px;">
                    ${myApprovedHours.toFixed(1)} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">/ ${myMonthlyMax}h</span>
                </div>
                <div style="background: rgba(226, 232, 240, 0.8); height: 6px; border-radius: 99px; margin-top: 10px; overflow: hidden;">
                    <div style="background: ${myProgressColor}; width: ${myPercentage}%; height: 100%; border-radius: 99px;"></div>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
                    <strong>${myRemainingHours.toFixed(1)}h</strong> remaining this month
                </div>
            </div>

            <!-- Approved OT Hours (Org Total) -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--success);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Approved OT Hours</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--success); margin-top: 6px;">${totalApprovedHours.toFixed(1)} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">hrs</span></div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">${approvedRequests.length} approved sessions</div>
            </div>

            <!-- Pending Review Queue -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--warning);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Pending Review Queue</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b; margin-top: 6px;">${pendingRequests.length}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">Awaiting decision</div>
            </div>

            <!-- Active Workforce -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid #8b5cf6;">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Active Workforce</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #8b5cf6; margin-top: 6px;">${users.length}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">${workers.length} employees / workers</div>
            </div>
        </div>

        ${pendingQueueHtml}

        <!-- Overtime Analytics & Trends Section -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px;">
            <!-- 1. Daily Trend in 1 Month -->
            <div class="card glass-panel" style="margin-bottom: 0;">
                <div class="card-header" style="margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.1rem;">${icons.dashboard} Daily Overtime Trend</h2>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Daily hours distribution for selected month
                        </p>
                    </div>
                    <!-- Month & Year Filters -->
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select id="dash-filter-month" class="filter-input" style="height: 34px; padding: 0 8px; font-size: 0.82rem; min-width: 110px;">
                            ${monthNames.map((name, idx) => `<option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${name}</option>`).join('')}
                        </select>
                        <select id="dash-filter-year" class="filter-input" style="height: 34px; padding: 0 8px; font-size: 0.82rem; min-width: 80px;">
                            ${existingYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="canvas-daily-trend"></canvas>
                </div>
            </div>

            <!-- 2. Monthly Multi-Year Trend -->
            <div class="card glass-panel" style="margin-bottom: 0;">
                <div class="card-header" style="margin-bottom: 14px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.1rem;">${icons.reports} Monthly Multi-Year Trend</h2>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Year-over-year monthly overtime comparison
                        </p>
                    </div>
                </div>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="canvas-yearly-trend"></canvas>
                </div>
            </div>
        </div>

        <!-- My Personal Overtime Sessions & Requests -->
        <div class="card glass-panel" style="margin-top: 20px; margin-bottom: 0;">
            <div class="card-header" style="margin-bottom: 12px;">
                <div>
                    <h2 class="card-title">${icons.assignment} My Personal Overtime Sessions & Requests</h2>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                        Overtime shifts requested by you or where you are participating.
                    </p>
                </div>
                <span class="badge badge-info">${myAllRequests.length} Total</span>
            </div>
            ${myAllRequests.length === 0 ? `
                <div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted);">
                    ${icons.info}
                    <div style="margin-top: 8px; font-weight: 500; font-size: 0.86rem;">You have not submitted or been assigned to any overtime sessions yet.</div>
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${myAllRequests.map(r => {
                        const proj = db.getProject(r.project);
                        const pName = proj ? proj.name : (r.project || 'General');
                        let stBadge = `<span class="badge badge-pending">Pending</span>`;
                        if (r.status === 'Completed') stBadge = `<span class="badge badge-approved" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">${icons.check} Completed</span>`;
                        else if (r.status === 'Approved') stBadge = `<span class="badge badge-approved">${icons.check} Approved</span>`;
                        else if (r.status === 'Cancelled') stBadge = `<span class="badge badge-rejected" style="background:#fef2f2; color:#991b1b; border:1px solid #fecaca;">Cancelled (0.0h)</span>`;
                        else if (r.status === 'Rejected') stBadge = `<span class="badge badge-rejected">${icons.times} Rejected</span>`;

                        const isReqUser = r.requesterId === currentUserId || (currentEmail && r.requesterId === currentEmail);
                        const canClose = r.status === 'Approved' && (isReqUser || isAdmin);
                        let durationDisplay = `${Number(r.duration || 0).toFixed(1)} hrs`;
                        if (r.status === 'Completed' && r.actualDuration != null) {
                            durationDisplay = `${Number(r.actualDuration).toFixed(1)} hrs <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(actual)</span>`;
                        } else if (r.status === 'Cancelled') {
                            durationDisplay = `<span style="color:#dc2626;">0.0 hrs</span> <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(cancelled)</span>`;
                        }
                        
                        return `
                            <div class="mobile-shift-card" style="margin-bottom: 0; padding: 10px 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <strong style="color: var(--primary); font-size: 0.88rem;">${r.id} &bull; ${pName}</strong>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        ${canClose ? `<button type="button" class="btn btn-success btn-sm btn-admin-close-ot" data-id="${r.id}" style="padding: 2px 8px; font-size: 0.72rem; font-weight: 700;">Close OT</button>` : ''}
                                        ${stBadge}
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted);">
                                    <span>${formatDateTime(r.status === 'Completed' && r.actualStartDate ? r.actualStartDate : (r.startDate || r.dateStart))}</span>
                                    <strong style="color: var(--text-main); font-size: 0.84rem;">${durationDisplay}</strong>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;

    // Chart Instances
    let dailyChart = null;
    let yearlyChart = null;

    // Render Daily Trend Chart
    const updateDailyTrendChart = () => {
        const monthSelect = document.getElementById('dash-filter-month');
        const yearSelect = document.getElementById('dash-filter-year');
        const canvas = document.getElementById('canvas-daily-trend');
        if (!monthSelect || !yearSelect || !canvas || typeof Chart === 'undefined') return;

        const selMonth = parseInt(monthSelect.value, 10);
        const selYear = parseInt(yearSelect.value, 10);

        const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
        const dailyData = new Array(daysInMonth).fill(0);

        const allReqs = db.getRequests();
        allReqs.forEach(r => {
            const dStr = r.startDate || r.overtimeDate || r.dateStart;
            if (!dStr) return;
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) {
                if (d.getFullYear() === selYear && d.getMonth() === selMonth) {
                    const dayIdx = d.getDate() - 1;
                    if (dayIdx >= 0 && dayIdx < daysInMonth) {
                        dailyData[dayIdx] += Number(r.duration) || 0;
                    }
                }
            }
        });

        if (dailyChart) dailyChart.destroy();

        dailyChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'OT Hours',
                    data: dailyData,
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    hoverBackgroundColor: '#4338ca',
                    borderColor: '#4f46e5',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => `Day ${items[0].label}/${String(selMonth + 1).padStart(2, '0')}/${selYear}`,
                            label: (item) => ` Overtime: ${Number(item.raw).toFixed(1)} hrs`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (v) => v + 'h',
                            font: { size: 10 }
                        },
                        grid: { color: 'rgba(226, 232, 240, 0.6)' }
                    },
                    x: {
                        ticks: { font: { size: 9.5 } },
                        grid: { display: false }
                    }
                }
            }
        });
    };

    // Render Yearly Multi-Line Trend Chart
    const updateYearlyTrendChart = () => {
        const canvas = document.getElementById('canvas-yearly-trend');
        if (!canvas || typeof Chart === 'undefined') return;

        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const allReqs = db.getRequests();

        // Group by year and month
        const yearMap = {};
        const currY = new Date().getFullYear();
        yearMap[currY] = new Array(12).fill(0);

        allReqs.forEach(r => {
            const dStr = r.startDate || r.overtimeDate || r.dateStart;
            if (!dStr) return;
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = d.getMonth();
                if (!yearMap[y]) yearMap[y] = new Array(12).fill(0);
                yearMap[y][m] += Number(r.duration) || 0;
            }
        });

        const colorPalette = [
            { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.08)' }, // Indigo
            { border: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' }, // Emerald
            { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' }, // Amber
            { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' }, // Purple
            { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)' }, // Pink
            { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)' }  // Cyan
        ];

        const sortedYears = Object.keys(yearMap).map(Number).sort((a,b) => a - b);
        const datasets = sortedYears.map((year, idx) => {
            const c = colorPalette[idx % colorPalette.length];
            return {
                label: `Year ${year}`,
                data: yearMap[year],
                borderColor: c.border,
                backgroundColor: c.bg,
                borderWidth: 2.5,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: c.border,
                fill: true
            };
        });

        if (yearlyChart) yearlyChart.destroy();

        yearlyChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: shortMonths,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true,
                            font: { size: 11, weight: '600' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (item) => ` ${item.dataset.label}: ${Number(item.raw).toFixed(1)} hrs`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (v) => v + 'h',
                            font: { size: 10 }
                        },
                        grid: { color: 'rgba(226, 232, 240, 0.6)' }
                    },
                    x: {
                        ticks: { font: { size: 10.5 } },
                        grid: { display: false }
                    }
                }
            }
        });
    };

    // Filter event listeners
    const monthFilter = document.getElementById('dash-filter-month');
    const yearFilter = document.getElementById('dash-filter-year');
    if (monthFilter) monthFilter.onchange = updateDailyTrendChart;
    if (yearFilter) yearFilter.onchange = updateDailyTrendChart;

    updateDailyTrendChart();
    updateYearlyTrendChart();

    // Attach Review / Approval event handlers
    const bindActions = () => {
        container.querySelectorAll('.admin-modify-btn').forEach(btn => {
            btn.onclick = () => {
                const reqId = btn.dataset.id;
                if (window.openRequestReviewModal) {
                    window.openRequestReviewModal(reqId);
                }
            };
        });

        container.querySelectorAll('.admin-reject-btn').forEach(btn => {
            btn.onclick = () => {
                const reqId = btn.dataset.id;
                if (window.openRequestReviewModal) {
                    window.openRequestReviewModal(reqId);
                }
            };
        });

        container.querySelectorAll('.btn-admin-close-ot').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const reqId = btn.dataset.id;
                if (reqId && window.openCloseOTModal) {
                    window.openCloseOTModal(reqId, () => {
                        renderAdminDashboard(container);
                    });
                }
            };
        });

        container.querySelectorAll('.admin-approve-btn').forEach(btn => {
            btn.onclick = () => {
                const reqId = btn.dataset.id;
                try {
                    const req = db.getRequest(reqId);
                    const updated = db.updateRequest(reqId, { status: 'Approved' }, currentUserId, 'Approved request');
                    showToast(`Overtime request ${reqId} approved successfully.`, "success");
                    showRequestDecisionModal(updated || req, 'Approved', () => {
                        renderAdminDashboard(container);
                    });
                } catch (e) {
                    showToast(e.message || "Failed to approve request", "error");
                }
            };
        });
    };

    bindActions();
}

// =========================================================================
// 2. ADMIN REQUEST (Create & Assign Overtime)
// =========================================================================
export function renderAdminRequest(container) {
    const users = db.getUsers();
    const projects = db.getProjects();
    const currentUser = db.getCurrentUser();
    const currentUserId = currentUser ? currentUser.id : null;
    const currentEmail = currentUser ? currentUser.email : null;

    container.innerHTML = `
        <div style="max-width: 860px; margin: 0 auto;">
            <div class="card glass-panel">
                <div class="card-header" style="margin-bottom: 20px;">
                    <div>
                        <h2 class="card-title">${icons.assignment} Schedule & Assign Overtime</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            Fill in the overtime session details below and select participating employees with real-time compliance validation.
                        </p>
                    </div>
                </div>

                <form id="admin-ot-form">
                    <!-- Row 1: Date Start, Proposed Start Time, Date End, Proposed End Time -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 16px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="admin-req-date-start" style="font-weight: 600;">Date Start</label>
                            <input type="date" id="admin-req-date-start" required style="background:#ffffff !important; color:#0f172a !important;">
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                                <label for="admin-req-time-start" style="font-weight: 600; margin-bottom: 0;">Proposed Start Time</label>
                                <span id="start-time-preset-badge" style="font-size: 0.70rem; font-weight: 600; color: var(--primary); background: rgba(99, 102, 241, 0.08); padding: 1px 6px; border-radius: 4px;">Preset</span>
                            </div>
                            <input type="time" id="admin-req-time-start" required style="background:#ffffff !important; color:#0f172a !important;">
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="admin-req-date-end" style="font-weight: 600;">Date End</label>
                            <input type="date" id="admin-req-date-end" required style="background:#ffffff !important; color:#0f172a !important;">
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="admin-req-time-end" style="font-weight: 600;">Proposed End Time</label>
                            <input type="time" id="admin-req-time-end" required style="background:#ffffff !important; color:#0f172a !important;">
                        </div>
                    </div>

                    <!-- Row 2: Project (Text Input) -->
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label for="admin-req-project" style="font-weight: 600;">Project</label>
                        <input type="text" id="admin-req-project" required placeholder="Enter project name or work order reference..." style="background:#ffffff !important; color:#0f172a !important;">
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label for="admin-req-target" style="font-weight: 600;">Target Overtime Deliverables (Expected Output)</label>
                        <textarea id="admin-req-target" required placeholder="Specify exact deliverables expected during this overtime session..." style="background:#ffffff !important; color:#0f172a !important; min-height: 85px;"></textarea>
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label for="admin-req-progress" style="font-weight: 600;">Current Work Progress (Regular Hours Summary)</label>
                        <textarea id="admin-req-progress" required placeholder="Describe task status before overtime session..." style="background:#ffffff !important; color:#0f172a !important; min-height: 85px;"></textarea>
                    </div>

                    <!-- List of Workers (Clean Name Only + Search Bar + Preset Current User) -->
                    <div class="form-group" style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
                            <div>
                                <label style="font-weight: 700; font-size: 0.82rem; margin-bottom: 1px; display: block;">List of Workers</label>
                                <span style="font-size: 0.74rem; color: var(--text-muted);">Select one or more employees for this overtime schedule.</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <input type="text" id="admin-search-workers" placeholder="Search worker..." style="padding: 4px 8px; font-size: 0.76rem; border-radius: 6px; border: 1px solid var(--border-color); background: #ffffff !important; color: #0f172a !important; width: 140px; height: 32px; min-height: 32px;">
                                <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-workers" style="font-size: 0.72rem; padding: 4px 8px; min-height: 32px;">Select All</button>
                                <button type="button" class="btn btn-secondary btn-sm" id="btn-clear-workers" style="font-size: 0.72rem; padding: 4px 8px; min-height: 32px;">Clear</button>
                            </div>
                        </div>

                        <div class="worker-selection-container" id="admin-workers-checklist" style="max-height: 190px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 6px; background: #f8fafc; display: flex; flex-direction: column; gap: 4px;">
                            ${users.map(u => {
                                const isPreset = Boolean(currentUserId && (u.id === currentUserId || (currentEmail && u.email && u.email.toLowerCase() === currentEmail.toLowerCase())));
                                const roleLabel = u.role ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${u.position || u.role})</span>` : '';
                                return `
                                <label class="worker-select-card" data-name="${(u.name || u.email).toLowerCase()}" style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; transition: all 0.15s ease; background: #ffffff;">
                                    <input type="checkbox" class="admin-worker-checkbox" value="${u.id}" ${isPreset ? 'checked' : ''} style="width: 15px; height: 15px; min-height: 15px; cursor: pointer; flex-shrink: 0;">
                                    <span style="font-weight: 600; font-size: 0.82rem; color: var(--text-main); line-height: 1.2;">${u.name || u.email} ${roleLabel}</span>
                                </label>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <div id="admin-compliance-feedback" style="margin-top: 16px;"></div>

                    <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px;">
                        <button type="submit" class="btn btn-primary" id="btn-admin-submit-ot" style="min-width: 220px; font-weight: 600;">
                            Submit & Schedule Overtime
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const dateStartInput = document.getElementById('admin-req-date-start');
    const timeStartInput = document.getElementById('admin-req-time-start');
    const dateEndInput = document.getElementById('admin-req-date-end');
    const timeEndInput = document.getElementById('admin-req-time-end');
    const projectInput = document.getElementById('admin-req-project');
    const targetInput = document.getElementById('admin-req-target');
    const progressInput = document.getElementById('admin-req-progress');
    const complianceContainer = document.getElementById('admin-compliance-feedback');
    const form = document.getElementById('admin-ot-form');
    const submitBtn = document.getElementById('btn-admin-submit-ot');
    const searchInput = document.getElementById('admin-search-workers');

    // Helper: Preset start & end times based on day of week:
    // - Monday-Friday: 5.00pm (17:00)
    // - Saturday: 2.00pm (14:00)
    // - Sunday: 8.00am (08:00)
    const getPresetTimesForDate = (dateStr) => {
        if (!dateStr) return { start: "17:00", end: "19:00", label: "5:00 PM (Mon–Fri)" };
        const parts = dateStr.split('-').map(Number);
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        const dow = dateObj.getDay(); // 0 = Sun, 6 = Sat

        if (dow === 0) {
            return { start: "08:00", end: "10:00", label: "8:00 AM (Sun)" };
        } else if (dow === 6) {
            return { start: "14:00", end: "16:00", label: "2:00 PM (Sat)" };
        } else {
            return { start: "17:00", end: "19:00", label: "5:00 PM (Mon–Fri)" };
        }
    };

    const startTimeBadge = document.getElementById('start-time-preset-badge');

    const applyPresetsForDate = (dateStr) => {
        const preset = getPresetTimesForDate(dateStr);
        timeStartInput.value = preset.start;
        timeEndInput.value = preset.end;
        if (startTimeBadge) {
            startTimeBadge.textContent = `Preset: ${preset.label}`;
            startTimeBadge.style.color = "var(--primary)";
        }
    };

    // Default Dates and Times
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    dateStartInput.value = todayStr;
    dateEndInput.value = todayStr;
    applyPresetsForDate(todayStr);

    // Auto synchronize end date & update presets if start date changes
    const handleDateStartChange = () => {
        if (!dateEndInput.value || dateEndInput.value <= dateStartInput.value) {
            dateEndInput.value = dateStartInput.value;
        }
        applyPresetsForDate(dateStartInput.value);
        checkCompliance();
    };

    dateStartInput.onchange = handleDateStartChange;
    dateStartInput.addEventListener('input', () => {
        if (dateStartInput.value && dateStartInput.value.length === 10) {
            handleDateStartChange();
        }
    });

    // Ensure at least one worker is checked if none was preset
    const workerCheckboxes = document.querySelectorAll('.admin-worker-checkbox');
    const hasAnyChecked = Array.from(workerCheckboxes).some(cb => cb.checked);
    if (!hasAnyChecked && workerCheckboxes.length > 0) {
        workerCheckboxes[0].checked = true;
    }

    // Search filter
    searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('#admin-workers-checklist .worker-select-card').forEach(card => {
            const name = card.dataset.name || '';
            if (name.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    };

    document.getElementById('btn-select-all-workers').onclick = () => {
        workerCheckboxes.forEach(cb => {
            const parentCard = cb.closest('.worker-select-card');
            if (!parentCard || parentCard.style.display !== 'none') {
                cb.checked = true;
            }
        });
        checkCompliance();
    };

    document.getElementById('btn-clear-workers').onclick = () => {
        workerCheckboxes.forEach(cb => cb.checked = false);
        checkCompliance();
    };

    let isOverLimit = false;

    const getFullDateRange = () => {
        const ds = dateStartInput.value;
        const ts = timeStartInput.value ? (timeStartInput.value.length >= 5 ? timeStartInput.value.slice(0, 5) : timeStartInput.value) : '';
        const de = dateEndInput.value;
        const te = timeEndInput.value ? (timeEndInput.value.length >= 5 ? timeEndInput.value.slice(0, 5) : timeEndInput.value) : '';
        if (!ds || !ts || !de || !te) return null;

        const startObj = new Date(`${ds}T${ts}:00`);
        const endObj = new Date(`${de}T${te}:00`);
        if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) return null;

        const duration = (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60);
        return {
            startISO: startObj.toISOString(),
            endISO: endObj.toISOString(),
            duration
        };
    };

    const checkCompliance = () => {
        const selectedWorkerIds = Array.from(document.querySelectorAll('.admin-worker-checkbox:checked')).map(cb => cb.value);
        if (selectedWorkerIds.length === 0) {
            complianceContainer.innerHTML = `<div class="info-alert info-alert-warning"><span style="font-size:0.86rem;">Please select at least one worker from the list.</span></div>`;
            submitBtn.disabled = true;
            return;
        }

        const range = getFullDateRange();
        if (!range || range.duration <= 0) {
            complianceContainer.innerHTML = `<div class="info-alert info-alert-danger"><span style="font-size:0.86rem;">Date End & Time End must be later than Date Start & Time Start.</span></div>`;
            submitBtn.disabled = true;
            return;
        }

        submitBtn.disabled = false;
        const otCalc = db.calculateNetOvertime(range.duration);
        let anyExceeded = false;
        const violatorNames = [];

        for (const wid of selectedWorkerIds) {
            const checkResult = db.checkLimitsForRequest(wid, range.startISO, range.endISO);
            if (!checkResult.allowed) {
                anyExceeded = true;
                const u = db.getUser(wid);
                violatorNames.push(u ? u.name : wid);
            }
        }

        isOverLimit = anyExceeded;

        let breakdownHtml = '';
        if (otCalc.ruleApplied && otCalc.restDeducted > 0) {
            breakdownHtml = `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; flex-wrap: wrap; gap: 14px; font-size: 0.82rem;">
                    <span>Gross Time: <strong>${otCalc.grossHours.toFixed(1)} hrs</strong></span>
                    <span>Rest Deduction: <strong style="color: #ef4444;">-${otCalc.restDeducted.toFixed(1)} hrs</strong> (${otCalc.breakCount} rest break${otCalc.breakCount > 1 ? 's' : ''})</span>
                    <span>Net Claimable OT: <strong style="color: var(--primary);">${otCalc.netHours.toFixed(1)} hrs</strong></span>
                </div>
            `;
        }

        if (isOverLimit) {
            complianceContainer.innerHTML = `
                <div class="info-alert info-alert-warning">
                    <span style="font-size: 0.88rem;"><strong>Limit Warning:</strong> Overtime limit (104 hrs/mo) will be exceeded for: <strong>${violatorNames.join(', ')}</strong> (${otCalc.netHours.toFixed(1)}h claimable). Will be submitted as a Special Request requiring digital consent.</span>
                    ${breakdownHtml}
                </div>
            `;
        } else {
            complianceContainer.innerHTML = `
                <div class="info-alert info-alert-success">
                    ${icons.check} <span>Session is within standard compliance limits (<strong>${otCalc.netHours.toFixed(1)} claimable hours</strong> for ${selectedWorkerIds.length} employee${selectedWorkerIds.length > 1 ? 's' : ''}).</span>
                    ${breakdownHtml}
                </div>
            `;
        }
    };

    dateEndInput.onchange = checkCompliance;
    timeStartInput.oninput = () => {
        const preset = getPresetTimesForDate(dateStartInput.value);
        if (startTimeBadge) {
            if (timeStartInput.value === preset.start) {
                startTimeBadge.textContent = `Preset: ${preset.label}`;
                startTimeBadge.style.color = "var(--primary)";
            } else {
                startTimeBadge.textContent = `Custom (${preset.start} preset)`;
                startTimeBadge.style.color = "var(--text-muted)";
            }
        }
        checkCompliance();
    };
    timeStartInput.onchange = checkCompliance;
    timeEndInput.onchange = checkCompliance;
    workerCheckboxes.forEach(cb => cb.onchange = checkCompliance);
    checkCompliance();

    form.onsubmit = (e) => {
        e.preventDefault();
        const selectedWorkerIds = Array.from(document.querySelectorAll('.admin-worker-checkbox:checked')).map(cb => cb.value);
        if (selectedWorkerIds.length === 0) {
            showToast("Please select at least one worker.", "error");
            return;
        }

        const range = getFullDateRange();
        if (!range || range.duration <= 0) {
            showToast("Please specify a valid start and finish time.", "error");
            return;
        }

        const otCalc = db.calculateNetOvertime(range.duration);
        const projectId = projectInput.value.trim();
        const workProgress = progressInput.value.trim();
        const targetWork = targetInput.value.trim();
        const dateStart = dateStartInput.value;
        const dateEnd = dateEndInput.value;
        const timeStart = timeStartInput.value;
        const timeEnd = timeEndInput.value;

        const currentUser = db.getCurrentUser();
        const isAdmin = currentUser && currentUser.role === 'admin';
        const primaryWorkerId = (currentUser && selectedWorkerIds.includes(currentUser.id)) ? currentUser.id : selectedWorkerIds[0];
        const teamMembers = selectedWorkerIds.filter(id => id !== primaryWorkerId);
        const approverId = db.getApproverForWorker(primaryWorkerId);

        // Approval Routing:
        // 1. If Admin themselves schedules and has no higher approver -> 'Approved'
        // 2. If requester exceeds compliance cap -> 'Pending Worker Consent'
        // 3. If requester has an assigned approver in hierarchy (e.g. Superior assigned to Admin) -> 'Pending Approval'
        // 4. If no approver mapped -> 'Approved'
        let initialStatus = 'Pending Approval';
        if (isAdmin && (!approverId || approverId === currentUser.id)) {
            initialStatus = 'Approved';
        } else if (isOverLimit) {
            initialStatus = 'Pending Worker Consent';
        } else if (approverId && approverId !== (currentUser ? currentUser.id : null)) {
            initialStatus = 'Pending Approval';
        } else if (!approverId) {
            initialStatus = 'Approved';
        }

        const reqData = {
            requesterId: primaryWorkerId,
            project: projectId,
            workProgress,
            targetWork,
            dateStart,
            dateEnd,
            overtimeDate: dateStart,
            timeStart,
            timeEnd,
            startDate: range.startISO,
            endDate: range.endISO,
            duration: otCalc.netHours,
            grossDuration: otCalc.grossHours,
            restDeduction: otCalc.restDeducted,
            teamMembers,
            status: initialStatus,
            rejectionReason: '',
            isSpecialRequest: isOverLimit,
            workerConsented: !isOverLimit,
            approverId: (initialStatus === 'Approved') ? (currentUser ? currentUser.id : approverId) : (approverId || null),
            type: 'request'
        };

        const createdReq = db.createRequest(reqData);
        if (initialStatus === 'Approved') {
            showToast(`Overtime created and authorized.`, "success");
        } else {
            showToast(`Overtime request submitted for approval.`, "success");
        }

        // Show Full Pop-up Confirmation Dialog
        showRequestSubmittedModal(createdReq);

        form.reset();

        // Reset default dates and preset times
        dateStartInput.value = todayStr;
        dateEndInput.value = todayStr;
        applyPresetsForDate(todayStr);
        if (workerCheckboxes.length > 0) workerCheckboxes[0].checked = true;
        checkCompliance();
    };
}

// =========================================================================
// 3. ADMIN REPORT (Comprehensive Timesheets & CSV / Print Export)
// =========================================================================
export function renderAdminReport(container) {
    const users = db.getUsers();
    const allRequests = db.getRequests();

    let selectedEmployeeId = '';
    let selectedProjectId = '';
    let activeReportTab = 'details';

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${curYear}-${curMonth}-01`;
    const lastDayObj = new Date(curYear, now.getMonth() + 1, 0);
    const lastDay = `${curYear}-${curMonth}-${String(lastDayObj.getDate()).padStart(2, '0')}`;

    container.innerHTML = `
        <div class="card glass-panel" style="margin-bottom: 0;">
            <div class="card-header" style="margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                <div>
                    <h2 class="card-title">${icons.reports} Overtime Timesheets & Compliance Reports</h2>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                        Filter, monitor worker hours, and export overtime timesheets in Excel (.xlsx) or PDF.
                    </p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary btn-sm" id="btn-export-excel" style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Export Excel
                    </button>
                    <button class="btn btn-primary btn-sm" id="btn-export-pdf" style="display: flex; align-items: center; gap: 6px; font-size: 0.78rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        Export PDF
                    </button>
                </div>
            </div>

            <div class="filter-bar" style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 10px; background: #f8fafc; border: 1px solid var(--border-color);">
                <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end;">
                    <div class="filter-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; display: block;">Employee:</label>
                        <div class="searchable-select-container" id="rep-employee-container">
                            <button type="button" class="searchable-select-trigger" id="rep-employee-trigger" style="height: 34px; padding: 0 10px; font-size: 0.8rem;">
                                <span id="rep-employee-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;">All Employees</span>
                                <span style="font-size: 0.65rem; color: var(--text-muted); margin-left: 6px;">▼</span>
                            </button>
                            <div class="searchable-select-popover" id="rep-employee-popover">
                                <input type="text" class="searchable-select-search" id="rep-employee-search" placeholder="Search employee...">
                                <div class="searchable-select-options" id="rep-employee-options"></div>
                            </div>
                        </div>
                    </div>

                    <div class="filter-group" style="margin-bottom: 0;">
                        <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; display: block;">Project:</label>
                        <div class="searchable-select-container" id="rep-project-container">
                            <button type="button" class="searchable-select-trigger" id="rep-project-trigger" style="height: 34px; padding: 0 10px; font-size: 0.8rem;">
                                <span id="rep-project-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;">All Projects</span>
                                <span style="font-size: 0.65rem; color: var(--text-muted); margin-left: 6px;">▼</span>
                            </button>
                            <div class="searchable-select-popover" id="rep-project-popover">
                                <input type="text" class="searchable-select-search" id="rep-project-search" placeholder="Search project...">
                                <div class="searchable-select-options" id="rep-project-options"></div>
                            </div>
                        </div>
                    </div>

                    <div class="filter-group" style="margin-bottom: 0;">
                        <label for="rep-filter-status" style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; display: block;">Status:</label>
                        <select id="rep-filter-status" class="filter-input" style="min-width: 130px; height: 34px; font-size: 0.8rem; padding: 0 8px;">
                            <option value="">All Statuses</option>
                            <option value="Completed">Completed (Closed)</option>
                            <option value="Approved">Approved (Active)</option>
                            <option value="Cancelled">Cancelled (0.0h)</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Pending Worker Consent">Pending Consent</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    <div class="filter-group" style="margin-bottom: 0;">
                        <label for="rep-filter-date-from" style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; display: block;">Period From:</label>
                        <input type="date" id="rep-filter-date-from" value="${firstDay}" class="filter-input" style="height: 34px; font-size: 0.8rem; padding: 0 6px;">
                    </div>

                    <div class="filter-group" style="margin-bottom: 0;">
                        <label for="rep-filter-date-to" style="font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; display: block;">Period To:</label>
                        <input type="date" id="rep-filter-date-to" value="${lastDay}" class="filter-input" style="height: 34px; font-size: 0.8rem; padding: 0 6px;">
                    </div>

                    <div class="filter-group" style="margin-bottom: 0;">
                        <button type="button" class="btn btn-secondary btn-sm" id="rep-btn-reset-filters" style="height: 34px; padding: 0 12px; font-size: 0.76rem;">Reset</button>
                    </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 8px;">
                    <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; margin-right: 2px;">Quick Periods:</span>
                    <button type="button" class="btn btn-secondary btn-sm rep-preset-btn" data-preset="this-month" style="font-size: 0.72rem; padding: 2px 8px; min-height: 24px; border-radius: 4px;">This Month</button>
                    <button type="button" class="btn btn-secondary btn-sm rep-preset-btn" data-preset="1-10" style="font-size: 0.72rem; padding: 2px 8px; min-height: 24px; border-radius: 4px;">1st - 10th</button>
                    <button type="button" class="btn btn-secondary btn-sm rep-preset-btn" data-preset="1-15" style="font-size: 0.72rem; padding: 2px 8px; min-height: 24px; border-radius: 4px;">1st - 15th</button>
                    <button type="button" class="btn btn-secondary btn-sm rep-preset-btn" data-preset="16-end" style="font-size: 0.72rem; padding: 2px 8px; min-height: 24px; border-radius: 4px;">16th - End</button>
                    <button type="button" class="btn btn-secondary btn-sm rep-preset-btn" data-preset="last-month" style="font-size: 0.72rem; padding: 2px 8px; min-height: 24px; border-radius: 4px;">Last Month</button>
                    <button type="button" class="btn btn-secondary btn-sm rep-preset-btn" data-preset="all" style="font-size: 0.72rem; padding: 2px 8px; min-height: 24px; border-radius: 4px;">All Dates</button>
                </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 14px; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                <button type="button" class="btn btn-sm btn-primary" id="btn-rep-tab-details" style="font-size: 0.78rem; display: flex; align-items: center; gap: 6px;">
                    ${icons.reports} Detailed Shift Log
                </button>
                <button type="button" class="btn btn-sm btn-secondary" id="btn-rep-tab-workers" style="font-size: 0.78rem; display: flex; align-items: center; gap: 6px;">
                    ${icons.users} Worker Hours Monitoring
                </button>
            </div>

            <div id="report-summary-stats" style="margin-top: 6px; margin-bottom: 12px; font-size: 0.82rem; color: var(--text-muted); font-weight: 500;"></div>

            <div id="rep-details-view" class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 110px;">OT ID</th>
                            <th>Requestor</th>
                            <th>Project</th>
                            <th>Start Date & Time</th>
                            <th>End Date & Time</th>
                            <th>Total Hours</th>
                            <th>Status</th>
                            <th style="text-align: right; width: 100px;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="report-rows">
                    </tbody>
                </table>
            </div>

            <div id="rep-workers-view" style="display: none;">
                <div id="report-workers-container" style="display: flex; flex-direction: column; gap: 10px;">
                </div>
            </div>
        </div>
    `;

    const empTrigger = document.getElementById('rep-employee-trigger');
    const empPopover = document.getElementById('rep-employee-popover');
    const empSearchInput = document.getElementById('rep-employee-search');
    const empOptionsContainer = document.getElementById('rep-employee-options');
    const empLabel = document.getElementById('rep-employee-label');

    const projTrigger = document.getElementById('rep-project-trigger');
    const projPopover = document.getElementById('rep-project-popover');
    const projSearchInput = document.getElementById('rep-project-search');
    const projOptionsContainer = document.getElementById('rep-project-options');
    const projLabel = document.getElementById('rep-project-label');

    const filterStatus = document.getElementById('rep-filter-status');
    const filterDateFrom = document.getElementById('rep-filter-date-from');
    const filterDateTo = document.getElementById('rep-filter-date-to');
    const btnResetFilters = document.getElementById('rep-btn-reset-filters');
    const reportRows = document.getElementById('report-rows');
    const reportWorkersContainer = document.getElementById('report-workers-container');
    const summaryStats = document.getElementById('report-summary-stats');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnExportPDF = document.getElementById('btn-export-pdf');

    const tabBtnDetails = document.getElementById('btn-rep-tab-details');
    const tabBtnWorkers = document.getElementById('btn-rep-tab-workers');
    const repDetailsView = document.getElementById('rep-details-view');
    const repWorkersView = document.getElementById('rep-workers-view');

    let currentFiltered = [];

    const setReportTab = (tab) => {
        activeReportTab = tab;
        if (tab === 'details') {
            tabBtnDetails.className = 'btn btn-sm btn-primary';
            tabBtnWorkers.className = 'btn btn-sm btn-secondary';
            repDetailsView.style.display = 'block';
            repWorkersView.style.display = 'none';
        } else {
            tabBtnDetails.className = 'btn btn-sm btn-secondary';
            tabBtnWorkers.className = 'btn btn-sm btn-primary';
            repDetailsView.style.display = 'none';
            repWorkersView.style.display = 'block';
        }
    };

    tabBtnDetails.onclick = () => setReportTab('details');
    tabBtnWorkers.onclick = () => setReportTab('workers');

    document.querySelectorAll('.rep-preset-btn').forEach(btn => {
        btn.onclick = () => {
            const preset = btn.dataset.preset;
            const pNow = new Date();
            const y = pNow.getFullYear();
            const m = pNow.getMonth();

            if (preset === 'this-month') {
                filterDateFrom.value = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                const endDay = new Date(y, m + 1, 0).getDate();
                filterDateTo.value = `${y}-${String(m + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
            } else if (preset === '1-10') {
                filterDateFrom.value = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                filterDateTo.value = `${y}-${String(m + 1).padStart(2, '0')}-10`;
            } else if (preset === '1-15') {
                filterDateFrom.value = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                filterDateTo.value = `${y}-${String(m + 1).padStart(2, '0')}-15`;
            } else if (preset === '16-end') {
                filterDateFrom.value = `${y}-${String(m + 1).padStart(2, '0')}-16`;
                const endDay = new Date(y, m + 1, 0).getDate();
                filterDateTo.value = `${y}-${String(m + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
            } else if (preset === 'last-month') {
                const prevMonth = new Date(y, m - 1, 1);
                const py = prevMonth.getFullYear();
                const pm = prevMonth.getMonth();
                filterDateFrom.value = `${py}-${String(pm + 1).padStart(2, '0')}-01`;
                const pEndDay = new Date(py, pm + 1, 0).getDate();
                filterDateTo.value = `${py}-${String(pm + 1).padStart(2, '0')}-${String(pEndDay).padStart(2, '0')}`;
            } else if (preset === 'all') {
                filterDateFrom.value = '';
                filterDateTo.value = '';
            }
            loadReport();
        };
    });

    const renderEmployeeOptions = (searchTerm = '') => {
        const term = searchTerm.toLowerCase().trim();
        const currentUsers = db.getUsers();
        const filteredUsers = currentUsers.filter(u => 
            !term || u.name.toLowerCase().includes(term) || (u.email && u.email.toLowerCase().includes(term))
        );

        let html = `
            <div class="searchable-select-option ${selectedEmployeeId === '' ? 'selected' : ''}" data-value="">
                All Employees
            </div>
        `;

        filteredUsers.forEach(u => {
            html += `
                <div class="searchable-select-option ${selectedEmployeeId === u.id ? 'selected' : ''}" data-value="${u.id}">
                    <div style="font-weight: 600;">${u.name}</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${u.position || 'Staff'}</div>
                </div>
            `;
        });

        empOptionsContainer.innerHTML = html;

        empOptionsContainer.querySelectorAll('.searchable-select-option').forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                selectedEmployeeId = opt.dataset.value;
                if (!selectedEmployeeId) {
                    empLabel.innerText = 'All Employees';
                } else {
                    const u = db.getUser(selectedEmployeeId);
                    empLabel.innerText = u ? u.name : selectedEmployeeId;
                }
                empPopover.classList.remove('active');
                empTrigger.classList.remove('active');
                loadReport();
            };
        });
    };

    empTrigger.onclick = (e) => {
        e.stopPropagation();
        const isActive = empPopover.classList.contains('active');
        projPopover.classList.remove('active');
        projTrigger.classList.remove('active');
        
        empPopover.classList.toggle('active', !isActive);
        empTrigger.classList.toggle('active', !isActive);
        if (!isActive) {
            empSearchInput.value = '';
            renderEmployeeOptions('');
            setTimeout(() => empSearchInput.focus(), 50);
        }
    };

    empSearchInput.oninput = () => {
        renderEmployeeOptions(empSearchInput.value);
    };

    const renderProjectOptions = (searchTerm = '') => {
        const term = searchTerm.toLowerCase().trim();
        const currentProjects = db.getProjects();
        const filteredProjects = currentProjects.filter(p => !term || p.name.toLowerCase().includes(term));

        let html = `
            <div class="searchable-select-option ${selectedProjectId === '' ? 'selected' : ''}" data-value="">
                All Projects
            </div>
        `;

        filteredProjects.forEach(p => {
            html += `
                <div class="searchable-select-option ${selectedProjectId === p.id ? 'selected' : ''}" data-value="${p.id}">
                    <div style="font-weight: 600;">${p.name}</div>
                </div>
            `;
        });

        projOptionsContainer.innerHTML = html;

        projOptionsContainer.querySelectorAll('.searchable-select-option').forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                selectedProjectId = opt.dataset.value;
                const p = db.getProject(selectedProjectId);
                projLabel.innerText = p ? p.name : 'All Projects';
                projPopover.classList.remove('active');
                projTrigger.classList.remove('active');
                loadReport();
            };
        });
    };

    projTrigger.onclick = (e) => {
        e.stopPropagation();
        const isActive = projPopover.classList.contains('active');
        empPopover.classList.remove('active');
        empTrigger.classList.remove('active');

        projPopover.classList.toggle('active', !isActive);
        projTrigger.classList.toggle('active', !isActive);
        if (!isActive) {
            projSearchInput.value = '';
            renderProjectOptions('');
            setTimeout(() => projSearchInput.focus(), 50);
        }
    };

    projSearchInput.oninput = () => {
        renderProjectOptions(projSearchInput.value);
    };

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#rep-employee-container')) {
            empPopover.classList.remove('active');
            empTrigger.classList.remove('active');
        }
        if (!e.target.closest('#rep-project-container')) {
            projPopover.classList.remove('active');
            projTrigger.classList.remove('active');
        }
    });

    const loadReport = () => {
        const status = filterStatus.value;
        const fromDateStr = filterDateFrom.value;
        const toDateStr = filterDateTo.value;

        const allReqs = db.getRequests();

        currentFiltered = allReqs.filter(r => {
            const projectObj = db.getProject(r.project);
            const pName = projectObj ? projectObj.name : (r.project || '');

            if (selectedEmployeeId && r.requesterId !== selectedEmployeeId && (!r.teamMembers || !r.teamMembers.includes(selectedEmployeeId))) {
                return false;
            }

            if (selectedProjectId && r.project !== selectedProjectId) {
                return false;
            }

            if (status && r.status !== status) {
                return false;
            }

            const rStart = r.startDate || r.overtimeDate || r.dateStart;
            if (rStart) {
                const rDateOnly = rStart.slice(0, 10);
                if (fromDateStr && rDateOnly < fromDateStr) return false;
                if (toDateStr && rDateOnly > toDateStr) return false;
            }

            return true;
        });

        currentFiltered.sort((a,b) => new Date(b.startDate || b.dateStart) - new Date(a.startDate || a.dateStart));

        const totalHours = currentFiltered.reduce((acc, r) => {
            const h = r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration) : Number(r.duration || 0);
            return acc + (isNaN(h) ? 0 : h);
        }, 0);
        const completedHours = currentFiltered.filter(r => r.status === 'Completed').reduce((acc, r) => acc + (Number(r.actualDuration != null ? r.actualDuration : r.duration) || 0), 0);
        const approvedHours = currentFiltered.filter(r => r.status === 'Approved').reduce((acc, r) => acc + (Number(r.duration) || 0), 0);

        const participatingWorkerIds = new Set();
        currentFiltered.forEach(r => {
            if (r.requesterId) participatingWorkerIds.add(r.requesterId);
            if (r.teamMembers && Array.isArray(r.teamMembers)) {
                r.teamMembers.forEach(tid => participatingWorkerIds.add(tid));
            }
        });

        tabBtnWorkers.innerHTML = `${icons.users} Worker Hours Monitoring (${participatingWorkerIds.size})`;

        const periodLabel = (fromDateStr || toDateStr) 
            ? ` | Period: <strong>${fromDateStr || 'Start'}</strong> to <strong>${toDateStr || 'Latest'}</strong>`
            : '';

        summaryStats.innerHTML = `Showing <strong>${currentFiltered.length}</strong> records across <strong>${participatingWorkerIds.size}</strong> workers | Period Overtime: <strong>${totalHours.toFixed(1)}h</strong> (Completed: <strong style="color:var(--success);">${completedHours.toFixed(1)}h</strong>, Active: <strong style="color:var(--primary);">${approvedHours.toFixed(1)}h</strong>)${periodLabel}`;

        if (currentFiltered.length === 0) {
            reportRows.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 32px; color: var(--text-muted);">
                        ${icons.info} No overtime records match your filters for this period.
                    </td>
                </tr>
            `;
        } else {
            reportRows.innerHTML = currentFiltered.map(r => {
                const requester = db.getUser(r.requesterId);
                const project = db.getProject(r.project);
                const projectName = project ? project.name : (r.project || 'Project');

                const allWorkerIds = Array.from(new Set([r.requesterId, ...(r.teamMembers || [])]));
                const workersList = allWorkerIds.map(id => db.getUser(id) || { id, name: id, position: 'Staff', email: '' });

                let statusBadge = '';
                if (r.status === 'Completed') statusBadge = `<span class="badge badge-approved" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">${icons.check} Completed</span>`;
                else if (r.status === 'Approved') statusBadge = `<span class="badge badge-pending" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe;">Approved (Active)</span>`;
                else if (r.status === 'Cancelled') statusBadge = `<span class="badge badge-rejected" style="background:#fef2f2; color:#991b1b; border:1px solid #fecaca;">Cancelled (0.0h)</span>`;
                else if (r.status === 'Rejected') statusBadge = `<span class="badge badge-rejected">${icons.times} Rejected</span>`;
                else if (r.status === 'Pending Worker Consent') statusBadge = `<span class="badge badge-pending">Consent Required</span>`;
                else statusBadge = `<span class="badge badge-pending">Pending</span>`;

                const startDisplay = formatDateTime(r.status === 'Completed' && r.actualStartDate ? r.actualStartDate : (r.startDate || r.dateStart));
                const endDisplay = formatDateTime(r.status === 'Completed' && r.actualEndDate ? r.actualEndDate : (r.endDate || r.dateEnd || r.startDate));
                const durVal = r.status === 'Cancelled' ? 0 : (r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration) : Number(r.duration || 0));

                return `
                    <tr class="rep-main-row" data-id="${r.id}" style="cursor: pointer;">
                        <td>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span class="rep-chevron" id="chevron-${r.id}" style="font-size: 0.72rem; color: var(--primary); transition: transform 0.2s; display: inline-block;">▶</span>
                                <strong style="color: var(--text-main); font-size: 0.8rem;">${r.id}</strong>
                            </div>
                        </td>
                        <td>
                            <div style="font-weight: 600; color: var(--text-main); font-size: 0.82rem;">${requester ? requester.name : r.requesterId}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted);">${requester ? requester.position : 'Staff'}</div>
                        </td>
                        <td style="font-weight: 500;">${projectName}</td>
                        <td style="font-size: 0.78rem; color: var(--text-main); white-space: nowrap;">${startDisplay}</td>
                        <td style="font-size: 0.78rem; color: var(--text-main); white-space: nowrap;">${endDisplay}</td>
                        <td style="font-weight: 700; color: var(--primary); font-size: 0.84rem;">
                            ${durVal.toFixed(1)} hrs
                            ${r.status === 'Completed' ? `<span style="font-size:0.68rem; color:var(--text-muted); font-weight:normal; display:block;">(actual)</span>` : (r.status === 'Cancelled' ? `<span style="font-size:0.68rem; color:#dc2626; font-weight:normal; display:block;">(cancelled)</span>` : '')}
                        </td>
                        <td>${statusBadge}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            ${r.status === 'Approved' ? `
                                <button class="btn btn-success btn-sm rep-close-ot-btn" data-id="${r.id}" style="padding: 2px 7px; font-size: 0.72rem; font-weight: 700; margin-right: 4px;">Close OT</button>
                            ` : ''}
                            <button class="btn btn-secondary btn-sm rep-view-details-btn" data-id="${r.id}" style="padding: 3px 8px; font-size: 0.72rem;">View Details</button>
                        </td>
                    </tr>
                    <tr class="rep-sub-row" id="subrow-${r.id}" style="display: none; background: #f8fafc;">
                        <td colspan="8" style="padding: 10px 14px; border-bottom: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
                                <div style="flex: 1; min-width: 260px;">
                                    <div style="font-size: 0.74rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 4px;">
                                        Participating Workers (${workersList.length})
                                    </div>
                                    <div style="display: flex; flex-direction: column; gap: 3px;">
                                        ${workersList.map((w, idx) => {
                                            const isPrimary = w.id === r.requesterId;
                                            return `
                                                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-main);">
                                                    <span style="color: var(--text-muted); font-size: 0.74rem; width: 14px;">${idx + 1}.</span>
                                                    <strong>${w.name}</strong>
                                                    <span style="color: var(--text-muted); font-size: 0.74rem;">(${w.position || 'Staff'}${isPrimary ? ' • Lead' : ''})</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>

                                    ${r.status === 'Completed' ? `
                                        <div style="margin-top: 10px; padding: 8px 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; font-size: 0.78rem;">
                                            <div style="font-weight: 700; color: #065f46; margin-bottom: 2px;">Actual Overtime Timesheet (Closed):</div>
                                            <div style="color: #047857;">
                                                Actual Range: <strong>${formatDateTime(r.actualStartDate || r.startDate)}</strong> &rarr; <strong>${formatDateTime(r.actualEndDate || r.endDate)}</strong>
                                                &bull; Gross: <strong>${Number(r.actualGrossDuration || r.grossDuration || r.duration || 0).toFixed(1)}h</strong>
                                                ${Number(r.actualRestDeduction || 0) > 0 ? `&bull; Rest Break: <strong>-${Number(r.actualRestDeduction).toFixed(1)}h</strong>` : ''}
                                                &bull; Net Claimable: <strong>${Number(r.actualDuration || r.duration || 0).toFixed(1)}h</strong>
                                            </div>
                                            ${r.closingRemarks ? `
                                                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #a7f3d0; color: #065f46;">
                                                    <strong>Closing Remarks:</strong> "${r.closingRemarks}"
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}

                                    ${r.status === 'Cancelled' ? `
                                        <div style="margin-top: 10px; padding: 8px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; font-size: 0.78rem;">
                                            <div style="font-weight: 700; color: #991b1b; margin-bottom: 2px;">Overtime Cancelled (Work Did Not Proceed):</div>
                                            <div style="color: #7f1d1d;">
                                                Recorded Claimable OT: <strong>0.0 hrs</strong>
                                            </div>
                                            ${r.closingRemarks ? `
                                                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #fca5a5; color: #991b1b;">
                                                    <strong>Cancellation Remarks:</strong> "${r.closingRemarks}"
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}

                                    ${r.targetWork || r.target_work ? `
                                        <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-muted);">
                                            <strong>Target Deliverables:</strong> ${r.targetWork || r.target_work}
                                        </div>
                                    ` : ''}
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    ${r.status === 'Approved' ? `
                                        <button class="btn btn-success btn-sm rep-subrow-close-btn" data-id="${r.id}" style="padding: 4px 10px; font-size: 0.74rem; font-weight: 700;">
                                            Close OT Shift
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-primary btn-sm rep-modal-btn" data-id="${r.id}" style="padding: 4px 10px; font-size: 0.74rem;">
                                        Open Full Request
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        reportRows.querySelectorAll('.rep-main-row').forEach(row => {
            row.onclick = (e) => {
                if (e.target.closest('.rep-view-details-btn')) {
                    const reqId = row.dataset.id;
                    if (reqId && window.openRequestReviewModal) {
                        window.openRequestReviewModal(reqId);
                    }
                    return;
                }
                if (e.target.closest('.rep-close-ot-btn')) {
                    const reqId = e.target.closest('.rep-close-ot-btn').dataset.id;
                    if (reqId && window.openCloseOTModal) {
                        window.openCloseOTModal(reqId, () => loadReport());
                    }
                    return;
                }
                const reqId = row.dataset.id;
                const subRow = document.getElementById(`subrow-${reqId}`);
                const chevron = document.getElementById(`chevron-${reqId}`);
                if (subRow) {
                    const isHidden = subRow.style.display === 'none';
                    subRow.style.display = isHidden ? 'table-row' : 'none';
                    if (chevron) chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            };
        });

        reportRows.querySelectorAll('.rep-modal-btn, .rep-view-details-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const reqId = btn.dataset.id;
                if (reqId && window.openRequestReviewModal) {
                    window.openRequestReviewModal(reqId);
                }
            };
        });

        reportRows.querySelectorAll('.rep-subrow-close-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const reqId = btn.dataset.id;
                if (reqId && window.openCloseOTModal) {
                    window.openCloseOTModal(reqId, () => loadReport());
                }
            };
        });

        if (participatingWorkerIds.size === 0) {
            reportWorkersContainer.innerHTML = `
                <div class="empty-state" style="padding: 32px; text-align: center; color: var(--text-muted); background: #ffffff; border-radius: 8px; border: 1px solid var(--border-color);">
                    ${icons.info}
                    <div style="margin-top: 8px; font-weight: 500; font-size: 0.88rem;">No worker overtime sessions match the selected period.</div>
                </div>
            `;
        } else {
            const workerCardsHtml = Array.from(participatingWorkerIds).map(workerId => {
                const worker = db.getUser(workerId) || { id: workerId, name: workerId, position: 'Worker', email: '' };
                const workerLimits = db.getWorkerLimits(workerId) || { monthlyMax: 104 };
                const monthlyMax = workerLimits.monthlyMax || 104;

                const workerShifts = currentFiltered.filter(r => 
                    r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId))
                );

                const workerPeriodHours = workerShifts.reduce((acc, r) => {
                    const h = r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration) : Number(r.duration || 0);
                    return acc + (isNaN(h) ? 0 : h);
                }, 0);
                
                const workerAllAuthorized = allReqs.filter(r => 
                    (r.status === 'Approved' || r.status === 'Completed') && (r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId)))
                );
                const totalAccruedMonth = workerAllAuthorized.reduce((acc, r) => {
                    const h = r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration) : Number(r.duration || 0);
                    return acc + (isNaN(h) ? 0 : h);
                }, 0);
                const pct = monthlyMax > 0 ? Math.min(100, Math.round((totalAccruedMonth / monthlyMax) * 100)) : 0;
                const progressColor = pct >= 90 ? 'var(--danger)' : (pct >= 70 ? 'var(--warning)' : 'var(--success)');

                return `
                    <div class="card glass-panel" style="margin-bottom: 0; padding: 14px; border: 1px solid var(--border-color); border-radius: 10px; background: #ffffff;">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 38px; height: 38px; border-radius: 50%; background: #e0e7ff; color: var(--primary); font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">
                                    ${(worker.name || 'W').slice(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${worker.name}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-muted);">${worker.position || 'Staff'} &bull; ${worker.email || ''}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                                <div style="text-align: right;">
                                    <div style="font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Period OT Hours</div>
                                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">${workerPeriodHours.toFixed(1)} <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted);">hrs (${workerShifts.length} shifts)</span></div>
                                </div>
                                <div style="min-width: 130px;">
                                    <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); font-weight: 600;">
                                        <span>Monthly Accrual:</span>
                                        <span style="color: ${progressColor}; font-weight: 700;">${totalAccruedMonth.toFixed(1)} / ${monthlyMax}h (${pct}%)</span>
                                    </div>
                                    <div style="background: #e2e8f0; height: 5px; border-radius: 99px; margin-top: 4px; overflow: hidden;">
                                        <div style="background: ${progressColor}; width: ${pct}%; height: 100%; border-radius: 99px;"></div>
                                    </div>
                                </div>
                                <button class="btn btn-secondary btn-sm toggle-worker-shifts-btn" data-wid="${workerId}" style="font-size: 0.74rem; padding: 4px 10px; display: flex; align-items: center; gap: 4px;">
                                    <span id="worker-chevron-${workerId}" style="font-size: 0.7rem; transition: transform 0.2s;">▶</span> Daily Breakdown
                                </button>
                            </div>
                        </div>
                        <div id="worker-shifts-table-${workerId}" style="display: none; margin-top: 12px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">
                                Overtime Sessions in Selected Period (${workerShifts.length})
                            </div>
                            <div class="table-container" style="border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;">
                                <table style="font-size: 0.74rem;">
                                    <thead>
                                        <tr style="background: #f8fafc;">
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Date</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Start</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">End</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Project</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Gross</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Break</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Net</th>
                                            <th style="padding: 4px 8px; font-size: 0.68rem;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${workerShifts.map(ws => {
                                            const pObj = db.getProject(ws.project);
                                            const pName = pObj ? pObj.name : (ws.project || 'Project');
                                            const isDone = ws.status === 'Completed';
                                            const isCancelled = ws.status === 'Cancelled';
                                            const sObj = new Date(isDone && ws.actualStartDate ? ws.actualStartDate : (ws.startDate || ws.dateStart));
                                            const eObj = new Date(isDone && ws.actualEndDate ? ws.actualEndDate : (ws.endDate || ws.dateEnd || ws.startDate));
                                            const dateOnly = formatDateOnly(isDone && ws.actualStartDate ? ws.actualStartDate : (ws.startDate || ws.dateStart));
                                            const sTime = !isNaN(sObj.getTime()) ? sObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : (ws.actualTimeStart || ws.timeStart || '-');
                                            const eTime = !isNaN(eObj.getTime()) ? eObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : (ws.actualTimeEnd || ws.timeEnd || '-');
                                            
                                            const grossH = isCancelled ? 0 : Number(isDone && ws.actualGrossDuration != null ? ws.actualGrossDuration : (ws.grossDuration || ws.duration || 0));
                                            const restH = isCancelled ? 0 : Number(isDone && ws.actualRestDeduction != null ? ws.actualRestDeduction : (ws.restDeduction || 0));
                                            const netH = isCancelled ? 0 : Number(isDone && ws.actualDuration != null ? ws.actualDuration : (ws.duration || 0));

                                            let st = isDone ? '✅ Completed' : (ws.status === 'Approved' ? '⚡ Active' : (ws.status === 'Cancelled' ? '⛔ Cancelled' : (ws.status === 'Rejected' ? '❌ Rejected' : '🕒 Pending')));
                                            return `
                                                <tr>
                                                    <td style="padding: 5px 8px; font-weight: 600;">${dateOnly}</td>
                                                    <td style="padding: 5px 8px;">${sTime}</td>
                                                    <td style="padding: 5px 8px;">${eTime}</td>
                                                    <td style="padding: 5px 8px;">${pName}</td>
                                                    <td style="padding: 5px 8px; color: var(--text-muted);">${grossH.toFixed(1)}h</td>
                                                    <td style="padding: 5px 8px;">-${restH.toFixed(1)}h</td>
                                                    <td style="padding: 5px 8px; font-weight: 700; color: ${isCancelled ? '#dc2626' : 'var(--primary)'};">${netH.toFixed(1)}h</td>
                                                    <td style="padding: 5px 8px;">${st}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            reportWorkersContainer.innerHTML = workerCardsHtml;
            reportWorkersContainer.querySelectorAll('.toggle-worker-shifts-btn').forEach(btn => {
                btn.onclick = () => {
                    const wid = btn.dataset.wid;
                    const tbl = document.getElementById(`worker-shifts-table-${wid}`);
                    const chv = document.getElementById(`worker-chevron-${wid}`);
                    if (tbl) {
                        const isHidden = tbl.style.display === 'none';
                        tbl.style.display = isHidden ? 'block' : 'none';
                        if (chv) chv.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
                    }
                };
            });
        }
    };

    filterStatus.onchange = loadReport;
    filterDateFrom.onchange = loadReport;
    filterDateTo.onchange = loadReport;
    btnResetFilters.onclick = () => {
        selectedEmployeeId = '';
        selectedProjectId = '';
        empLabel.innerText = 'All Employees';
        projLabel.innerText = 'All Projects';
        filterStatus.value = '';
        filterDateFrom.value = '';
        filterDateTo.value = '';
        loadReport();
    };

    renderEmployeeOptions();
    renderProjectOptions();
    loadReport();

    btnExportExcel.onclick = () => {
        if (currentFiltered.length === 0) { showToast("No data.", "error"); return; }
        const data = currentFiltered.map(r => {
            const requester = db.getUser(r.requesterId);
            const isDone = r.status === 'Completed';
            const isCancelled = r.status === 'Cancelled';
            const sDate = isDone && r.actualStartDate ? r.actualStartDate : (r.startDate || r.dateStart);
            const eDate = isDone && r.actualEndDate ? r.actualEndDate : (r.endDate || r.dateEnd || r.startDate);
            const gross = isCancelled ? 0 : Number(isDone && r.actualGrossDuration != null ? r.actualGrossDuration : (r.grossDuration || r.duration || 0));
            const rest = isCancelled ? 0 : Number(isDone && r.actualRestDeduction != null ? r.actualRestDeduction : (r.restDeduction || 0));
            const net = isCancelled ? 0 : Number(isDone && r.actualDuration != null ? r.actualDuration : (r.duration || 0));

            return {
                "OT ID": r.id,
                "Requestor": requester ? requester.name : r.requesterId,
                "Project": db.getProject(r.project)?.name || r.project,
                "Start Date & Time": formatDateTime(sDate),
                "End Date & Time": formatDateTime(eDate),
                "Gross Hours": gross,
                "Rest Deduction": rest,
                "Net Claimable OT Hours": net,
                "Status": r.status,
                "Closing / Cancellation Remarks": r.closingRemarks || ''
            };
        });
        if (window.XLSX) {
            const wb = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(data), "Report");
            window.XLSX.writeFile(wb, `Report_${new Date().getTime()}.xlsx`);
        } else {
            showToast("Excel engine not loaded.", "error");
        }
    };

    btnExportPDF.onclick = () => {
        if (currentFiltered.length === 0) { showToast("No data.", "error"); return; }
        if (window.jspdf && window.jspdf.jsPDF) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'pt', 'a4');
            doc.text("Overtime Report", 40, 40);
            doc.autoTable({
                startY: 60,
                head: [['ID', 'Requestor', 'Project', 'Start', 'End', 'Net Hours', 'Status']],
                body: currentFiltered.map(r => {
                    const dur = r.status === 'Cancelled' ? '0.0' : (r.status === 'Completed' && r.actualDuration != null ? Number(r.actualDuration).toFixed(1) : Number(r.duration || 0).toFixed(1));
                    return [r.id, db.getUser(r.requesterId)?.name || r.requesterId, r.project, formatDateOnly(r.startDate), formatDateOnly(r.endDate), dur, r.status];
                })
            });
            doc.save(`Report_${new Date().getTime()}.pdf`);
        } else {
            window.print();
        }
    };
}

export function renderAdminSettings(container) {
    const currentUser = db.getCurrentUser();
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!isAdmin && currentUser) {
        const displayName = (currentUser.name && currentUser.name !== currentUser.email && currentUser.name !== 'User') ? currentUser.name : '';
        const userEmail = currentUser.email || '';
        const userPosition = currentUser.position || 'Staff';
        const userRoleFormatted = currentUser.role === 'superior' ? 'Superior / Approver' : (currentUser.role === 'worker' ? 'Worker / Employee' : currentUser.role);

        container.innerHTML = `
            <div class="card glass-panel" style="max-width: 620px; margin: 0 auto;">
                <div class="card-header" style="margin-bottom: 20px;">
                    <div>
                        <h2 class="card-title">${icons.settings} Personal Account & Profile Settings</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            Update your personal display name, email address, or update your login password.
                        </p>
                    </div>
                </div>

                <!-- Profile Summary Banner -->
                <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: 12px; margin-bottom: 24px;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #ec4899); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700;">
                        ${(displayName || userEmail || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-main);">${displayName || userEmail}</div>
                        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
                            ${userPosition} • <span style="text-transform: capitalize; color: var(--primary); font-weight: 600;">${userRoleFormatted}</span>
                        </div>
                    </div>
                </div>

                <form id="user-profile-settings-form">
                    <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
                        <!-- Full Name -->
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="profile-name" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">Full Name (Display Name)</label>
                            <input type="text" id="profile-name" value="${displayName}" placeholder="e.g. Mohd Khairul Bin Anuar" style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                        </div>

                        <!-- Email Address -->
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="profile-email" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">Email Address</label>
                            <input type="email" id="profile-email" required value="${userEmail}" placeholder="user@company.com" style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                        </div>

                        <!-- New Password -->
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="profile-password" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">New Password (leave blank to keep current)</label>
                            <input type="password" id="profile-password" placeholder="••••••••" style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                        </div>

                        <!-- Read-only Job Position -->
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">Job Position</label>
                            <input type="text" value="${userPosition}" disabled style="width: 100%; background:#f1f5f9 !important; color:#64748b !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color); cursor: not-allowed;">
                        </div>

                        <!-- Send Password Reset Link Card -->
                        <div style="padding: 12px 14px; background: rgba(99, 102, 241, 0.04); border: 1px solid rgba(99, 102, 241, 0.18); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                </div>
                                <div>
                                    <div style="font-size: 0.86rem; font-weight: 700; color: var(--text-main);">Send Password Reset Email</div>
                                    <div style="font-size: 0.73rem; color: var(--text-muted);">Receive a password recovery email link.</div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-profile-send-reset" style="white-space: nowrap; font-weight: 600; padding: 6px 12px; font-size: 0.8rem;">
                                Send Reset Link
                            </button>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px;">
                        <button type="submit" class="btn btn-primary btn-sm" id="btn-save-profile" style="padding: 10px 22px; font-weight: 600; font-size: 0.9rem;">
                            Save Profile Changes
                        </button>
                    </div>
                </form>
            </div>
        `;

        const form = document.getElementById('user-profile-settings-form');
        const sendResetBtn = document.getElementById('btn-profile-send-reset');

        if (sendResetBtn) {
            sendResetBtn.onclick = async () => {
                const email = document.getElementById('profile-email').value.trim();
                if (!email) {
                    showToast("Valid email address is required.", "error");
                    return;
                }
                sendResetBtn.disabled = true;
                const orig = sendResetBtn.innerText;
                sendResetBtn.innerText = "Sending...";
                try {
                    await db.sendPasswordResetEmail(email);
                    showToast(`Password reset link sent to ${email}`, "success");
                } catch (e) {
                    showToast(e.message || "Failed to send reset email.", "error");
                } finally {
                    sendResetBtn.disabled = false;
                    sendResetBtn.innerText = orig;
                }
            };
        }

        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('btn-save-profile');
                const origText = saveBtn.innerText;
                saveBtn.disabled = true;
                saveBtn.innerText = "Saving...";

                const newName = document.getElementById('profile-name').value.trim();
                const newEmail = document.getElementById('profile-email').value.trim();
                const newPassword = document.getElementById('profile-password').value;

                try {
                    await db.updateUser(currentUser.id, {
                        name: newName || newEmail,
                        email: newEmail
                    });

                    if (newPassword && newPassword.trim() !== '') {
                        await db.resetUserPassword(currentUser.id, newPassword);
                    }

                    showToast("Profile settings updated successfully.", "success");
                    window.dispatchEvent(new Event('clock_plus_db_update'));
                } catch (err) {
                    console.error("Error updating profile:", err);
                    showToast(err.message || "Failed to update profile settings.", "error");
                } finally {
                    saveBtn.disabled = false;
                    saveBtn.innerText = origText;
                }
            };
        }
        return;
    }

    // --- Admin Settings View (Full Console with 3 Tabs) ---
    container.innerHTML = `
        <!-- Unified Modal: Edit User Preferences & Account -->
        <div class="modal-overlay" id="admin-edit-user-modal">
            <div class="modal-box glass-panel" style="max-width: 520px; max-height: 92vh; overflow-y: auto;">
                <div class="modal-drag-handle"></div>
                <div class="modal-header" style="margin-bottom: 20px;">
                    <div>
                        <h3 class="modal-title" style="color: var(--primary); font-size: 1.25rem; font-weight: 700;">User Account & Preferences</h3>
                        <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 3px;" id="edit-user-email-subtitle"></div>
                    </div>
                    <span class="modal-close" onclick="document.getElementById('admin-edit-user-modal').classList.remove('active')">&times;</span>
                </div>
                
                <form id="admin-edit-user-form">
                    <input type="hidden" id="edit-user-id">

                    <!-- Stacked Fields: Full Name, Email, Position, Role -->
                    <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="edit-user-name" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">Full Name (Display Name)</label>
                            <input type="text" id="edit-user-name" placeholder="e.g. Akmal Sanusi" style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="edit-user-email" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">Email Address</label>
                            <input type="email" id="edit-user-email" required placeholder="user@company.com" style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="edit-user-position" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">Job Position</label>
                            <input type="text" id="edit-user-position" required placeholder="Software Engineer" style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label for="edit-user-role" style="font-weight: 600; font-size: 0.86rem; margin-bottom: 6px; display: block; color: var(--text-main);">System Role</label>
                            <select id="edit-user-role" required style="width: 100%; background:#ffffff !important; color:#0f172a !important; padding: 10px 14px; font-size: 0.92rem; border-radius: 8px; border: 1.5px solid var(--border-color);">
                                <option value="worker">Worker / Employee</option>
                                <option value="superior">Superior / Approver</option>
                                <option value="admin">System Admin</option>
                            </select>
                        </div>
                    </div>

                    <!-- Send Password Reset Link Button Card -->
                    <div style="margin-bottom: 20px; padding: 12px 14px; background: rgba(99, 102, 241, 0.04); border: 1px solid rgba(99, 102, 241, 0.18); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(99, 102, 241, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 16px; height: 16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                            </div>
                            <div>
                                <div style="font-size: 0.86rem; font-weight: 700; color: var(--text-main);">Send Password Reset Email</div>
                                <div style="font-size: 0.73rem; color: var(--text-muted);">Sends a password recovery link to the user's email address.</div>
                            </div>
                        </div>
                        <button type="button" class="btn btn-secondary btn-sm" id="btn-modal-send-reset-link" style="white-space: nowrap; font-weight: 600; padding: 6px 12px; font-size: 0.8rem;">
                            Send Reset Link
                        </button>
                    </div>

                    <!-- Allowed Page Access (Neat & Modern Redesign) -->
                    <div style="margin-bottom: 22px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 700; font-size: 0.88rem; color: var(--text-main);">Allowed Page Access</label>
                        <div class="perm-grid">
                            <label class="perm-tile" for="edit-perm-dashboard">
                                <input type="checkbox" id="edit-perm-dashboard" value="dashboard" class="perm-checkbox" style="position: absolute; opacity: 0; pointer-events: none;">
                                <div class="perm-tile-icon">
                                    ${icons.dashboard}
                                </div>
                                <div class="perm-tile-body">
                                    <div class="perm-tile-title">Dashboard</div>
                                    <div class="perm-tile-desc">Analytics & stats</div>
                                </div>
                                <div class="perm-checkbox-custom"></div>
                            </label>

                            <label class="perm-tile" for="edit-perm-request">
                                <input type="checkbox" id="edit-perm-request" value="request" class="perm-checkbox" style="position: absolute; opacity: 0; pointer-events: none;">
                                <div class="perm-tile-icon">
                                    ${icons.assignment}
                                </div>
                                <div class="perm-tile-body">
                                    <div class="perm-tile-title">Request</div>
                                    <div class="perm-tile-desc">Submit & review OT</div>
                                </div>
                                <div class="perm-checkbox-custom"></div>
                            </label>

                            <label class="perm-tile" for="edit-perm-report">
                                <input type="checkbox" id="edit-perm-report" value="report" class="perm-checkbox" style="position: absolute; opacity: 0; pointer-events: none;">
                                <div class="perm-tile-icon">
                                    ${icons.reports}
                                </div>
                                <div class="perm-tile-body">
                                    <div class="perm-tile-title">Report</div>
                                    <div class="perm-tile-desc">Audit & export logs</div>
                                </div>
                                <div class="perm-checkbox-custom"></div>
                            </label>

                            <label class="perm-tile" for="edit-perm-settings">
                                <input type="checkbox" id="edit-perm-settings" value="settings" class="perm-checkbox" style="position: absolute; opacity: 0; pointer-events: none;">
                                <div class="perm-tile-icon">
                                    ${icons.settings}
                                </div>
                                <div class="perm-tile-body">
                                    <div class="perm-tile-title">Settings</div>
                                    <div class="perm-tile-desc">Users & thresholds</div>
                                </div>
                                <div class="perm-checkbox-custom"></div>
                            </label>
                        </div>
                    </div>

                    <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border-color); margin-top: 0;">
                        <button type="button" class="btn btn-danger btn-sm" id="btn-modal-delete-user" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;">
                            ${icons.delete} Delete User
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('admin-edit-user-modal').classList.remove('active')" style="padding: 8px 16px;">Cancel</button>
                            <button type="submit" class="btn btn-primary btn-sm" style="padding: 8px 18px; font-weight: 600;">Save Preferences</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- Settings Tabs Navigation -->
        <div class="settings-tabs-nav">
            <button type="button" class="settings-tab-btn active" data-tab="tab-users">
                ${icons.users} User Accounts & Permissions
            </button>
            <button type="button" class="settings-tab-btn" data-tab="tab-hierarchy">
                ${icons.hierarchy} Approver Hierarchy Mapping
            </button>
            <button type="button" class="settings-tab-btn" data-tab="tab-limits">
                ${icons.limits} Compliance Hour Thresholds
            </button>
        </div>

        <!-- TAB 1: User Accounts Management -->
        <div id="tab-users" class="settings-tab-pane">
            <div class="card glass-panel">
                <div class="card-header" style="margin-bottom: 16px;">
                    <div>
                        <h2 class="card-title">${icons.users} User Accounts & Permissions</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            Click on any user row to customize preferences, view password, send reset links, or change page permissions.
                        </p>
                    </div>
                    <button class="btn btn-primary btn-sm" id="btn-toggle-create-user">
                        ${icons.add} Add New User
                    </button>
                </div>

                <!-- Create User Form (Collapsible) -->
                <div id="create-user-drawer" style="display: none; margin-bottom: 24px; padding: 20px; background: var(--bg-surface-opaque); border: 1px solid var(--border-color); border-radius: var(--btn-radius); box-shadow: var(--shadow-premium);">
                    <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 16px; color: var(--text-main);">Create New User Account</h3>
                    <form id="new-user-form">
                        <div class="form-grid">
                            <div class="form-group">
                                <label for="new-user-name">Full Name (Optional)</label>
                                <input type="text" id="new-user-name" placeholder="e.g. Akmal Sanusi" style="background:#ffffff !important; color:#0f172a !important;">
                            </div>
                            <div class="form-group">
                                <label for="new-user-email">Email Address</label>
                                <input type="email" id="new-user-email" required placeholder="user@company.com" style="background:#ffffff !important; color:#0f172a !important;">
                            </div>
                            <div class="form-group">
                                <label for="new-user-role">System Role</label>
                                <select id="new-user-role" required style="background:#ffffff !important; color:#0f172a !important;">
                                    <option value="worker">Worker / Employee</option>
                                    <option value="superior">Superior / Approver</option>
                                    <option value="admin">System Admin</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="new-user-position">Job Position</label>
                                <input type="text" id="new-user-position" required placeholder="Software Engineer" style="background:#ffffff !important; color:#0f172a !important;">
                            </div>
                            <div class="form-group full-width">
                                <label for="new-user-password">Initial Password</label>
                                <input type="password" id="new-user-password" required placeholder="••••••••" style="background:#ffffff !important; color:#0f172a !important;">
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px;">
                            <button type="button" class="btn btn-secondary btn-sm" id="btn-cancel-create-user">Cancel</button>
                            <button type="submit" class="btn btn-success btn-sm">Create Account</button>
                        </div>
                    </form>
                </div>

                <!-- Users Table -->
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Position</th>
                                <th>Allowed Pages</th>
                            </tr>
                        </thead>
                        <tbody id="settings-users-list">
                            <!-- Injected dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- TAB 2: Multi-Level Approver Hierarchy Mapping -->
        <div id="tab-hierarchy" class="settings-tab-pane" style="display: none;">
            <div class="card glass-panel">
                <div class="card-header" style="margin-bottom: 16px;">
                    <div>
                        <h2 class="card-title">${icons.hierarchy} Multi-Level Approver Hierarchy Mapping</h2>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            Set 1, 2, or 3 levels of review superiors for each employee. Requests flow sequentially through assigned approval tiers.
                        </p>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Worker / Employee</th>
                                <th>Level 1 Approver (Primary)</th>
                                <th>Level 2 Approver (Secondary)</th>
                                <th>Level 3 Approver (Final)</th>
                                <th>Approval Route</th>
                            </tr>
                        </thead>
                        <tbody id="settings-hierarchy-list">
                            <!-- Dynamic Hierarchy Mapping Rows -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- TAB 3: Overtime Limit Thresholds & Rest Deductions -->
        <div id="tab-limits" class="settings-tab-pane" style="display: none;">
            <div class="card glass-panel" style="max-width: 680px;">
                <div class="card-header" style="margin-bottom: 12px;">
                    <h2 class="card-title">${icons.limits} Compliance Hour Thresholds & Rest Deductions</h2>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
                    Configure statutory overtime limits and automated rest/meal break deduction rules for overtime sessions.
                </p>
                <form id="settings-limits-form">
                    <!-- 1. Monthly Overtime Cap -->
                    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; margin-bottom: 18px;">
                        <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 8px; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                            ${icons.limits} Statutory Monthly Overtime Cap
                        </h3>
                        <div class="form-group" style="margin-bottom: 4px;">
                            <label for="limit-monthly" style="font-weight: 600;">Monthly Maximum Overtime (Hours)</label>
                            <input type="number" step="1" id="limit-monthly" required style="background:#ffffff !important; color:#0f172a !important;" placeholder="104">
                            <span style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px; display: block;">
                                Under Malaysia Employment Act 1955, statutory overtime cannot exceed 104 hours in a single month.
                            </span>
                        </div>
                    </div>

                    <!-- 2. Automatic Rest / Break Deduction Rule -->
                    <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 10px; padding: 16px; margin-bottom: 18px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin: 0; display: flex; align-items: center; gap: 8px;">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px;height:18px;color:var(--primary);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Automatic Rest Time Deduction
                            </h3>
                            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                                <input type="checkbox" id="limit-rest-enabled" checked style="width: 16px; height: 16px; cursor: pointer;">
                                <span>Enable Rule</span>
                            </label>
                        </div>
                        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
                            Automatically deduct mandatory rest/break hours when an overtime session reaches or exceeds a specified hour threshold.
                        </p>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label for="limit-rest-threshold" style="font-weight: 600; font-size: 0.84rem;">For every OT Duration (Hours)</label>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <input type="number" step="0.5" min="1" id="limit-rest-threshold" value="5" required style="background:#ffffff !important; color:#0f172a !important;">
                                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">hrs</span>
                                </div>
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label for="limit-rest-deduct" style="font-weight: 600; font-size: 0.84rem;">Deduct Rest Time (Hours)</label>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <input type="number" step="0.1" min="0.1" id="limit-rest-deduct" value="0.5" required style="background:#ffffff !important; color:#0f172a !important;">
                                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">hrs</span>
                                </div>
                            </div>
                        </div>

                        <!-- Live Rule Example Preview -->
                        <div id="rest-rule-live-preview" style="background: rgba(99, 102, 241, 0.07); border: 1px dashed rgba(99, 102, 241, 0.35); border-radius: 8px; padding: 10px 14px; font-size: 0.8rem; color: var(--text-main);">
                            <strong>Active Rule:</strong> Every <strong>5.0 hours</strong> of overtime will deduct <strong>0.5 hours</strong> (30 mins) as rest time.
                            <div style="margin-top: 4px; color: var(--text-muted);">
                                • 5.0 hrs worked &rarr; <strong>4.5 hrs</strong> claimable OT<br>
                                • 10.0 hrs worked &rarr; <strong>9.0 hrs</strong> claimable OT
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end;">
                        <button type="submit" class="btn btn-primary btn-sm" style="padding: 8px 20px; font-weight: 600;">Save Threshold & Rules</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Tab Switching Handling
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.settings-tab-pane').forEach(p => p.style.display = 'none');

            btn.classList.add('active');
            const targetPaneId = btn.dataset.tab;
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) {
                targetPane.style.display = 'block';
            }
        };
    });

    // References
    const usersList = document.getElementById('settings-users-list');
    const hierarchyList = document.getElementById('settings-hierarchy-list');
    const toggleCreateUserBtn = document.getElementById('btn-toggle-create-user');
    const cancelCreateUserBtn = document.getElementById('btn-cancel-create-user');
    const createUserDrawer = document.getElementById('create-user-drawer');
    const newUserForm = document.getElementById('new-user-form');
    const limitsForm = document.getElementById('settings-limits-form');

    // Unified Edit User Modal Elements
    const editUserModal = document.getElementById('admin-edit-user-modal');
    const editUserForm = document.getElementById('admin-edit-user-form');
    const editUserIdInput = document.getElementById('edit-user-id');
    const editUserEmailSubtitle = document.getElementById('edit-user-email-subtitle');
    const editUserNameInput = document.getElementById('edit-user-name');
    const editUserEmailInput = document.getElementById('edit-user-email');
    const editUserRoleSelect = document.getElementById('edit-user-role');
    const editUserPositionInput = document.getElementById('edit-user-position');
    const btnModalSendResetLink = document.getElementById('btn-modal-send-reset-link');
    const btnModalDeleteUser = document.getElementById('btn-modal-delete-user');

    // Toggle create user form
    toggleCreateUserBtn.onclick = () => {
        createUserDrawer.style.display = createUserDrawer.style.display === 'none' ? 'block' : 'none';
    };
    cancelCreateUserBtn.onclick = () => {
        createUserDrawer.style.display = 'none';
    };

    // Render Users Table (Clickable Rows)
    const loadUsers = () => {
        const users = db.getUsers();
        usersList.innerHTML = users.map(u => {
            const allowedPages = db.getUserAllowedPages(u.id);
            const pageTags = allowedPages.map(p => `<span class="badge" style="background: rgba(99,102,241,0.08); color: var(--primary); text-transform: capitalize; margin-right: 4px;">${p}</span>`).join('');
            
            const hasCustomName = u.name && u.name !== u.email && u.name !== 'User';
            const userCellContent = hasCustomName 
                ? `<div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${u.name}</div>
                   <div style="font-size: 0.76rem; color: var(--text-muted);">${u.email}</div>`
                : `<div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${u.email || u.name}</div>`;

            return `
                <tr class="clickable-user-row" data-id="${u.id}" style="cursor: pointer; transition: background 0.15s ease;">
                    <td>${userCellContent}</td>
                    <td><span class="badge" style="text-transform: capitalize;">${u.role}</span></td>
                    <td>${u.position || 'Staff'}</td>
                    <td>${pageTags}</td>
                </tr>
            `;
        }).join('');

        // Attach click listeners to open unified user preferences modal
        document.querySelectorAll('.clickable-user-row').forEach(row => {
            row.onclick = () => {
                const uid = row.dataset.id;
                const u = db.getUser(uid);
                if (!u) return;

                const displayName = (u.name && u.name !== u.email && u.name !== 'User') ? `${u.name} (${u.email})` : (u.email || u.name);
                editUserIdInput.value = uid;
                editUserEmailSubtitle.innerHTML = `<strong>${displayName}</strong>`;
                editUserNameInput.value = (u.name && u.name !== u.email && u.name !== 'User') ? u.name : '';
                editUserEmailInput.value = u.email || '';
                editUserRoleSelect.value = u.role || 'worker';
                editUserPositionInput.value = u.position || '';

                const allowed = db.getUserAllowedPages(uid);
                document.getElementById('edit-perm-dashboard').checked = allowed.includes('dashboard');
                document.getElementById('edit-perm-request').checked = allowed.includes('request');
                document.getElementById('edit-perm-report').checked = allowed.includes('report');
                document.getElementById('edit-perm-settings').checked = allowed.includes('settings');

                editUserModal.classList.add('active');
            };
        });
    };

    // Send Password Reset Email Link Handler
    btnModalSendResetLink.onclick = async () => {
        const email = editUserEmailInput.value.trim();
        if (!email) {
            showToast("Valid email address is required.", "error");
            return;
        }
        btnModalSendResetLink.disabled = true;
        const originalText = btnModalSendResetLink.innerText;
        btnModalSendResetLink.innerText = "Sending...";
        try {
            await db.sendPasswordResetEmail(email);
            showToast(`Password reset link sent to ${email}`, "success");
        } catch (err) {
            console.error("Error sending reset link:", err);
            showToast(err.message || "Failed to send reset link.", "error");
        } finally {
            btnModalSendResetLink.disabled = false;
            btnModalSendResetLink.innerText = originalText;
        }
    };

    // Unified Edit User Form Submission
    editUserForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = editUserForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = "Saving...";

        const uid = editUserIdInput.value;
        const name = editUserNameInput.value.trim();
        const email = editUserEmailInput.value.trim();
        const role = editUserRoleSelect.value;
        const position = editUserPositionInput.value.trim();

        const selectedPages = [];
        if (document.getElementById('edit-perm-dashboard').checked) selectedPages.push('dashboard');
        if (document.getElementById('edit-perm-request').checked) selectedPages.push('request');
        if (document.getElementById('edit-perm-report').checked) selectedPages.push('report');
        if (document.getElementById('edit-perm-settings').checked) selectedPages.push('settings');

        if (selectedPages.length === 0) {
            showToast("User must have at least one allowed page.", "error");
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
            return;
        }

        try {
            // Update fields directly in Supabase and local cache
            await db.updateUser(uid, {
                name: name || email,
                email: email,
                role: role,
                position: position
            });
            await db.updateUserPermissions(uid, selectedPages);

            showToast("User preferences saved successfully.", "success");
            editUserModal.classList.remove('active');
            loadUsers();
            loadHierarchy();
            window.dispatchEvent(new Event('clock_plus_db_update'));
        } catch (err) {
            console.error("Failed to save user preferences:", err);
            showToast(err.message || "Failed to save user preferences.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
        }
    };

    // Delete User from Modal
    btnModalDeleteUser.onclick = () => {
        const uid = editUserIdInput.value;
        const u = db.getUser(uid);
        const displayName = u ? (u.name || u.email) : uid;

        if (confirm(`Are you sure you want to remove user ${displayName}?`)) {
            db.deleteUser(uid);
            showToast("User removed successfully.", "info");
            editUserModal.classList.remove('active');
            loadUsers();
            loadHierarchy();
        }
    };

    // Create User submission
    newUserForm.onsubmit = async (e) => {
        e.preventDefault();
        const submitBtn = newUserForm.querySelector('button[type="submit"]');
        const origText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = "Creating...";

        const email = document.getElementById('new-user-email').value.trim();
        const customName = document.getElementById('new-user-name').value.trim();
        const name = customName || email;
        const role = document.getElementById('new-user-role').value;
        const position = document.getElementById('new-user-position').value.trim();
        const password = document.getElementById('new-user-password').value.trim();

        try {
            await db.createUser({
                name,
                role,
                position,
                email,
                password,
                permissions: role === 'admin' ? ['dashboard', 'request', 'report', 'settings'] : (role === 'superior' ? ['dashboard', 'request', 'report'] : ['dashboard', 'request'])
            });

            showToast(`User account ${name} created in Supabase Authentication & company users.`, "success");
            newUserForm.reset();
            createUserDrawer.style.display = 'none';
            loadUsers();
            loadHierarchy();
        } catch (err) {
            console.error("Failed to create user:", err);
            showToast(err.message || "Failed to create user.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = origText;
        }
    };

    // Load Multi-Level Hierarchy Mapping
    const loadHierarchy = () => {
        const users = db.getUsers();
        const allEmployees = users;

        hierarchyList.innerHTML = allEmployees.map(w => {
            const approvers = db.getApproversForWorker(w.id);
            const eligibleSuperiors = users.filter(s => (s.role === 'superior' || s.role === 'admin') && s.id !== w.id);

            const buildOptions = (selectedId) => eligibleSuperiors.map(s => `
                <option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>
                    ${s.name || s.email} (${s.position || s.role})
                </option>
            `).join('');

            // Build Route Badges
            const routeBadges = [];
            if (approvers.level1) {
                const s1 = db.getUser(approvers.level1);
                routeBadges.push(`<span class="badge" style="background: rgba(99,102,241,0.1); color: var(--primary);">L1: ${s1?.name || s1?.email || 'Approver'}</span>`);
            }
            if (approvers.level2) {
                const s2 = db.getUser(approvers.level2);
                routeBadges.push(`<span class="badge" style="background: rgba(16,185,129,0.1); color: var(--success);">L2: ${s2?.name || s2?.email || 'Approver'}</span>`);
            }
            if (approvers.level3) {
                const s3 = db.getUser(approvers.level3);
                routeBadges.push(`<span class="badge" style="background: rgba(245,158,11,0.1); color: var(--warning);">L3: ${s3?.name || s3?.email || 'Approver'}</span>`);
            }
            const routeDisplay = routeBadges.length > 0 
                ? routeBadges.join('<span style="color: var(--text-muted); font-size: 0.8rem; margin: 0 4px;">&rarr;</span>')
                : '<span style="color: var(--text-muted); font-size: 0.82rem;">No approvers set</span>';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-weight: 700; color: var(--text-main);">${w.name || w.email}</div>
                            <span class="badge" style="font-size: 0.7rem; text-transform: capitalize;">${w.role}</span>
                        </div>
                        <div style="font-size: 0.76rem; color: var(--text-muted);">${w.position || 'Staff'}</div>
                    </td>
                    <td>
                        <select class="hierarchy-select filter-input" data-worker="${w.id}" data-level="1" style="width: 100%; font-size: 0.85rem; padding: 6px 10px;">
                            <option value="">-- No L1 Approver --</option>
                            ${buildOptions(approvers.level1)}
                        </select>
                    </td>
                    <td>
                        <select class="hierarchy-select filter-input" data-worker="${w.id}" data-level="2" style="width: 100%; font-size: 0.85rem; padding: 6px 10px;">
                            <option value="">-- No L2 Approver (Optional) --</option>
                            ${buildOptions(approvers.level2)}
                        </select>
                    </td>
                    <td>
                        <select class="hierarchy-select filter-input" data-worker="${w.id}" data-level="3" style="width: 100%; font-size: 0.85rem; padding: 6px 10px;">
                            <option value="">-- No L3 Approver (Optional) --</option>
                            ${buildOptions(approvers.level3)}
                        </select>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">
                            ${routeDisplay}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.hierarchy-select').forEach(sel => {
            sel.onchange = async () => {
                const wid = sel.dataset.worker;
                const row = sel.closest('tr');
                const l1 = row.querySelector('[data-level="1"]').value;
                const l2 = row.querySelector('[data-level="2"]').value;
                const l3 = row.querySelector('[data-level="3"]').value;

                await db.updateHierarchyMapping(wid, l1, l2, l3);
                const userObj = db.getUser(wid);
                showToast(`Approval chain updated for ${userObj?.name || userObj?.email}`, "success");
                loadHierarchy();
            };
        });
    };

    // Load Limits & Rest Deduction Rules
    const limitsList = db.getLimits() || [];
    const globalLimits = limitsList.find(l => l.scope === 'global') || { monthlyMax: 104 };
    const restRule = db.getRestDeductionRule();

    const inputMonthly = document.getElementById('limit-monthly');
    const inputRestEnabled = document.getElementById('limit-rest-enabled');
    const inputRestThreshold = document.getElementById('limit-rest-threshold');
    const inputRestDeduct = document.getElementById('limit-rest-deduct');
    const restLivePreview = document.getElementById('rest-rule-live-preview');

    if (inputMonthly) inputMonthly.value = globalLimits.monthlyMax || 104;
    if (inputRestEnabled) inputRestEnabled.checked = restRule.enabled !== false;
    if (inputRestThreshold) inputRestThreshold.value = restRule.thresholdHours || 5;
    if (inputRestDeduct) inputRestDeduct.value = restRule.deductHours || 0.5;

    const updateRestLivePreview = () => {
        if (!restLivePreview) return;
        const isEnabled = inputRestEnabled ? inputRestEnabled.checked : true;
        const thresh = Number(inputRestThreshold?.value) || 5;
        const deduct = Number(inputRestDeduct?.value) || 0.5;

        if (!isEnabled) {
            restLivePreview.innerHTML = `
                <div style="color: #64748b;">
                    <strong>Rest Rule Status:</strong> Disabled (No automatic deduction applied; workers claim 100% gross hours).
                </div>
            `;
            return;
        }

        const sample1Deduct = Math.floor(thresh / thresh) * deduct;
        const sample1Net = Math.max(0, thresh - sample1Deduct);
        const sample2Gross = thresh * 2;
        const sample2Deduct = Math.floor(sample2Gross / thresh) * deduct;
        const sample2Net = Math.max(0, sample2Gross - sample2Deduct);

        restLivePreview.innerHTML = `
            <strong>Active Rule:</strong> Every <strong>${thresh.toFixed(1)} hours</strong> of overtime will deduct <strong>${deduct.toFixed(1)} hours</strong> (${Math.round(deduct * 60)} mins) as rest time.
            <div style="margin-top: 4px; color: var(--text-muted);">
                • ${thresh.toFixed(1)} hrs worked &rarr; <strong>${sample1Net.toFixed(1)} hrs</strong> claimable OT (-${sample1Deduct.toFixed(1)}h rest)<br>
                • ${sample2Gross.toFixed(1)} hrs worked &rarr; <strong>${sample2Net.toFixed(1)} hrs</strong> claimable OT (-${sample2Deduct.toFixed(1)}h rest)
            </div>
        `;
    };

    if (inputRestEnabled) inputRestEnabled.onchange = updateRestLivePreview;
    if (inputRestThreshold) inputRestThreshold.oninput = updateRestLivePreview;
    if (inputRestDeduct) inputRestDeduct.oninput = updateRestLivePreview;
    updateRestLivePreview();

    limitsForm.onsubmit = async (e) => {
        e.preventDefault();
        const monthlyMax = Number(inputMonthly ? inputMonthly.value : 104) || 104;
        const restEnabled = inputRestEnabled ? inputRestEnabled.checked : true;
        const restThreshold = Number(inputRestThreshold ? inputRestThreshold.value : 5) || 5;
        const restDeduct = Number(inputRestDeduct ? inputRestDeduct.value : 0.5) || 0.5;

        await db.saveLimit({
            id: 'global-default',
            scope: 'global',
            targetId: null,
            monthlyMax,
            restDeductionEnabled: restEnabled,
            restThresholdHours: restThreshold,
            restDeductHours: restDeduct
        });

        showToast("Compliance threshold and rest deduction rule saved successfully.", "success");
    };

    loadUsers();
    loadHierarchy();
}
