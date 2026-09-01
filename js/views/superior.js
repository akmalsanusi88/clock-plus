// Clock+ Superior/Approver View Controller
import { db } from '../db.js';
import { showToast, formatDateTime, icons } from './shared.js';

export function renderSuperiorView(container, superiorId) {
    const subordinates = db.getSubordinatesForSuperior(superiorId);
    const subordinateIds = subordinates.map(s => s.id);
    // Include superior themselves and subordinates
    const teamMemberIds = Array.from(new Set([superiorId, ...subordinateIds]));

    const teamRequests = db.getRequests().filter(r => 
        teamMemberIds.includes(r.requesterId) || 
        (r.teamMembers && r.teamMembers.some(tid => teamMemberIds.includes(tid)))
    );

    const pendingRequests = db.getRequests().filter(r => r.status === 'Pending Approval');
    const approvedTeamRequests = teamRequests.filter(r => r.status === 'Approved');
    const totalTeamApprovedHours = approvedTeamRequests.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);

    // Current superior personal monthly limit calculation
    const myApproved = teamRequests.filter(r => 
        r.status === 'Approved' && (r.requesterId === superiorId || (r.teamMembers && r.teamMembers.includes(superiorId)))
    );
    const myApprovedHours = myApproved.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
    const myLimits = superiorId ? db.getWorkerLimits(superiorId) : { monthlyMax: 104 };
    const myMonthlyMax = myLimits.monthlyMax || 104;
    const myRemainingHours = Math.max(0, myMonthlyMax - myApprovedHours);
    const myPercentage = myMonthlyMax > 0 ? Math.min(100, Math.round((myApprovedHours / myMonthlyMax) * 100)) : 0;
    const myProgressColor = myPercentage >= 90 ? 'var(--danger)' : (myPercentage >= 70 ? 'var(--warning)' : 'var(--success)');

    // Available years for filter
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const existingYears = Array.from(new Set(teamRequests.map(r => {
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
            <!-- Personal Monthly Limit Card -->
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

            <!-- Team Approved OT -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--success);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Team Approved OT</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--success); margin-top: 6px;">
                    ${totalTeamApprovedHours.toFixed(1)} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">hrs</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">${approvedTeamRequests.length} approved sessions</div>
            </div>

            <!-- Pending Approvals -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--warning);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Pending Approvals</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b; margin-top: 6px;">${pendingRequests.length}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">Awaiting your review</div>
            </div>

            <!-- Team Workforce -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid #8b5cf6;">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Team Workforce</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #8b5cf6; margin-top: 6px;">${subordinates.length}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">Direct subordinates</div>
            </div>
        </div>

        <!-- Pending Approvals Queue -->
        <div class="card glass-panel" style="margin-bottom: 24px;">
            <div class="card-header" style="margin-bottom: 16px;">
                <div>
                    <h2 class="card-title">${icons.hierarchy} Pending Approvals Queue</h2>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                        Review, adjust, approve, or reject overtime requests from your team.
                    </p>
                </div>
                <span class="badge badge-pending" id="pending-count">${pendingRequests.length} Pending</span>
            </div>
            <div id="approvals-queue-list" style="display:flex; flex-direction:column; gap:16px;">
                <!-- Injected dynamically -->
            </div>
        </div>

        <!-- Team Overtime Analytics & Trends Section -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <!-- 1. Daily Trend in 1 Month -->
            <div class="card glass-panel" style="margin-bottom: 0;">
                <div class="card-header" style="margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.05rem;">${icons.dashboard} Team Daily Overtime Trend</h2>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Daily hours distribution for selected month
                        </p>
                    </div>
                    <!-- Member, Month & Year Filters -->
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                        <select id="sup-filter-worker" class="filter-input" style="height: 32px; padding: 0 8px; font-size: 0.82rem; min-width: 120px;">
                            <option value="">All Team Members</option>
                            ${subordinates.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                        <select id="sup-filter-month" class="filter-input" style="height: 32px; padding: 0 8px; font-size: 0.82rem; min-width: 105px;">
                            ${monthNames.map((name, idx) => `<option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${name}</option>`).join('')}
                        </select>
                        <select id="sup-filter-year" class="filter-input" style="height: 32px; padding: 0 8px; font-size: 0.82rem; min-width: 78px;">
                            ${existingYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="sup-canvas-daily-trend"></canvas>
                </div>
            </div>

            <!-- 2. Monthly Multi-Year Trend -->
            <div class="card glass-panel" style="margin-bottom: 0;">
                <div class="card-header" style="margin-bottom: 12px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.05rem;">${icons.reports} Team Monthly Multi-Year Trend</h2>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Year-over-year monthly overtime comparison
                        </p>
                    </div>
                </div>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="sup-canvas-yearly-trend"></canvas>
                </div>
            </div>
        </div>

        <!-- Subordinates Registry & Limit Tracking -->
        <div class="card glass-panel" style="margin-bottom: 0;">
            <div class="card-header" style="margin-bottom: 16px;">
                <div>
                    <h2 class="card-title">${icons.users} Team Overtime Registry & Limit Monitoring</h2>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin-top: 4px;">
                        Track individual subordinate overtime hours against the enterprise 104-hour monthly limit.
                    </p>
                </div>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Worker</th>
                            <th>Position</th>
                            <th>Monthly Used / Limit</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="subordinates-list">
                        <!-- Injected dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Elements
    const queueList = document.getElementById('approvals-queue-list');
    const pendingCountBadge = document.getElementById('pending-count');
    const subordinatesList = document.getElementById('subordinates-list');
    const workerFilter = document.getElementById('sup-filter-worker');
    const monthFilter = document.getElementById('sup-filter-month');
    const yearFilter = document.getElementById('sup-filter-year');

    // Chart Instances
    let dailyChart = null;
    let yearlyChart = null;

    // --- 1. Daily Trend Chart ---
    const updateDailyTrendChart = () => {
        const canvas = document.getElementById('sup-canvas-daily-trend');
        if (!monthFilter || !yearFilter || !canvas || typeof Chart === 'undefined') return;

        const selWorkerId = workerFilter ? workerFilter.value : '';
        const selMonth = parseInt(monthFilter.value, 10);
        const selYear = parseInt(yearFilter.value, 10);

        const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
        const dailyData = new Array(daysInMonth).fill(0);

        const allReqs = db.getRequests().filter(r => {
            if (selWorkerId) {
                return r.requesterId === selWorkerId || (r.teamMembers && r.teamMembers.includes(selWorkerId));
            }
            return teamMemberIds.includes(r.requesterId) || (r.teamMembers && r.teamMembers.some(tid => teamMemberIds.includes(tid)));
        });

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
                    label: 'Team OT Hours',
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
                            label: (item) => ` Team Overtime: ${Number(item.raw).toFixed(1)} hrs`
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
                        ticks: { font: { size: 9 } },
                        grid: { display: false }
                    }
                }
            }
        });
    };

    // --- 2. Yearly Multi-Line Chart ---
    const updateYearlyTrendChart = () => {
        const canvas = document.getElementById('sup-canvas-yearly-trend');
        if (!canvas || typeof Chart === 'undefined') return;

        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const allReqs = db.getRequests().filter(r => 
            teamMemberIds.includes(r.requesterId) || (r.teamMembers && r.teamMembers.some(tid => teamMemberIds.includes(tid)))
        );

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
            { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' }  // Purple
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
                        ticks: { font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    };

    if (workerFilter) workerFilter.onchange = updateDailyTrendChart;
    if (monthFilter) monthFilter.onchange = updateDailyTrendChart;
    if (yearFilter) yearFilter.onchange = updateDailyTrendChart;

    updateDailyTrendChart();
    updateYearlyTrendChart();

    // --- 3. Render Pending Approvals ---
    const loadPendingQueue = () => {
        const requests = db.getRequests().filter(r => r.status === 'Pending Approval');

        pendingCountBadge.innerText = `${requests.length} Pending`;

        if (requests.length === 0) {
            queueList.innerHTML = `
                <div class="empty-state" style="padding: 24px; text-align: center; color: var(--text-muted);">
                    ${icons.check}
                    <div style="margin-top: 8px; font-weight: 500;">No pending overtime requests to review. All caught up!</div>
                </div>
            `;
            return;
        }

        queueList.innerHTML = requests.map(r => {
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
                            <div style="font-weight:700; font-size:1.05rem; color:var(--text-main);">
                                ${worker ? worker.name : r.requesterId}
                                ${specialBadge}
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
                                <strong>${project ? project.name : (r.project || 'Project')}</strong> (${r.id})
                            </div>
                        </div>
                        <div style="font-size: 1.1rem; font-weight:700; color:var(--primary);">${Number(r.duration || 0).toFixed(1)} hrs</div>
                    </div>

                    <div style="font-size:0.86rem; line-height:1.4; color:var(--text-main);">
                        <div><strong>Regular Progress:</strong> ${r.workProgress || r.work_progress || 'N/A'}</div>
                        <div style="margin-top:4px;"><strong>Target:</strong> ${r.targetWork || r.target_work || 'N/A'}</div>
                        ${teamNames !== 'None' ? `<div style="margin-top:4px; font-size:0.8rem; color:var(--text-muted);"><strong>Team:</strong> ${teamNames}</div>` : ''}
                    </div>

                    <div style="font-size:0.8rem; color:var(--text-muted); border-top:1px solid var(--border-color); padding-top:8px; margin-top:4px;">
                        <div>Schedule: <strong>${formatDateTime(r.startDate)}</strong> to <strong>${formatDateTime(r.endDate)}</strong></div>
                    </div>

                    <div class="mobile-shift-actions">
                        <button class="btn btn-secondary btn-sm modify-btn" data-id="${r.id}">Review & Adjust</button>
                        <button class="btn btn-danger btn-sm reject-btn" data-id="${r.id}">Reject</button>
                        <button class="btn btn-success btn-sm approve-btn" data-id="${r.id}">Approve</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach review actions
        document.querySelectorAll('.modify-btn').forEach(btn => {
            btn.onclick = () => {
                const reqId = btn.dataset.id;
                if (window.openRequestReviewModal) window.openRequestReviewModal(reqId);
            };
        });

        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.onclick = () => {
                const reqId = btn.dataset.id;
                db.updateRequest(reqId, { status: 'Approved' }, superiorId, 'Approved request');
                showToast(`Request ${reqId} approved successfully.`, 'success');
                refreshAll();
            };
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.onclick = () => {
                const reqId = btn.dataset.id;
                if (window.openRequestReviewModal) {
                    window.openRequestReviewModal(reqId);
                }
            };
        });
    };

    // --- 4. Render Subordinates List (Teammates OT utilization) ---
    const loadSubordinates = () => {
        const allApprovedRequests = db.getRequests().filter(r => r.status === 'Approved');
        subordinatesList.innerHTML = subordinates.map(s => {
            const workerRequests = allApprovedRequests.filter(r => 
                r.requesterId === s.id || (r.teamMembers && r.teamMembers.includes(s.id))
            );
            const totalHours = workerRequests.reduce((sum, r) => sum + (Number(r.duration) || 0), 0);
            const limits = db.getWorkerLimits(s.id);
            const monthlyMax = limits.monthlyMax || 104;
            
            const monthlyExceeded = totalHours > monthlyMax;
            const percentage = monthlyMax > 0 ? Math.min(100, Math.round((totalHours / monthlyMax) * 100)) : 0;

            let statusLabel = `<span class="badge badge-approved">Normal (${percentage}%)</span>`;
            if (monthlyExceeded) {
                statusLabel = `<span class="badge badge-rejected">Exceeded (${percentage}%)</span>`;
            } else if (totalHours >= monthlyMax * 0.8) {
                statusLabel = `<span class="badge badge-pending">Nearing Limit (${percentage}%)</span>`;
            }

            return `
                <tr>
                    <td><strong style="color: var(--text-main); font-weight: 600;">${s.name}</strong></td>
                    <td>${s.position || 'Staff'}</td>
                    <td class="${monthlyExceeded ? 'accent-danger' : ''}">${totalHours.toFixed(1)} / <strong>${monthlyMax}h</strong></td>
                    <td>${statusLabel}</td>
                </tr>
            `;
        }).join('');
    };

    const refreshAll = () => {
        loadPendingQueue();
        loadSubordinates();
        updateDailyTrendChart();
        updateYearlyTrendChart();
    };

    loadPendingQueue();
    loadSubordinates();
}
