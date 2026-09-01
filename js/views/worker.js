// Clock+ Worker View Controller
import { db } from '../db.js';
import { showToast, formatDateTime, icons } from './shared.js';

export function renderWorkerView(container, workerId) {
    const workerRequests = db.getRequests().filter(r => 
        r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId))
    );

    const completedRequests = workerRequests.filter(r => r.status === 'Completed');
    const activeApprovedRequests = workerRequests.filter(r => r.status === 'Approved');
    const pendingRequests = workerRequests.filter(r => r.status === 'Pending Approval' || r.status === 'Pending Worker Consent');
    
    // Completed hours count as official recorded hours
    const totalRecordedHours = completedRequests.reduce((acc, r) => acc + (Number(r.actualDuration != null ? r.actualDuration : r.duration) || 0), 0);
    const totalPlannedApprovedHours = activeApprovedRequests.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
    const totalAuthorizedHours = totalRecordedHours + totalPlannedApprovedHours;

    const limits = db.getWorkerLimits(workerId);
    const monthlyMax = limits.monthlyMax || 104;
    const remainingHours = Math.max(0, monthlyMax - totalAuthorizedHours);
    const percentage = monthlyMax > 0 ? Math.min(100, Math.round((totalAuthorizedHours / monthlyMax) * 100)) : 0;
    const progressColor = percentage >= 90 ? 'var(--danger)' : (percentage >= 70 ? 'var(--warning)' : 'var(--success)');

    // Available years for filter
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const existingYears = Array.from(new Set(workerRequests.map(r => {
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

    let activeApprovedHtml = '';
    if (activeApprovedRequests.length > 0) {
        activeApprovedHtml = `
            <!-- Active Overtime (Awaiting Work Completion & Closeout) -->
            <div class="card glass-panel" style="margin-bottom: 20px; border-left: 4px solid var(--primary); background: #f0fdf4;">
                <div class="card-header" style="margin-bottom: 12px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.05rem; color: #166534;">
                            ${icons.check} Active Overtime Shifts (Awaiting Closeout)
                        </h2>
                        <p style="font-size: 0.8rem; color: #15803d; margin-top: 2px;">
                            These shifts are approved. When work is finished, submit actual hours to finalize into official records.
                        </p>
                    </div>
                    <span class="badge badge-approved" style="font-size: 0.74rem;">${activeApprovedRequests.length} Active</span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${activeApprovedRequests.map(r => {
                        const proj = db.getProject(r.project);
                        const pName = proj ? proj.name : (r.project || 'Project');
                        return `
                            <div class="mobile-shift-card" style="margin-bottom: 0; background: #ffffff; border: 1px solid #bbf7d0; padding: 12px 14px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
                                    <div>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <strong style="color: var(--primary); font-size: 0.95rem;">${pName}</strong>
                                            <span class="badge badge-approved" style="font-size: 0.68rem;">${r.id}</span>
                                        </div>
                                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                                            Schedule: <strong>${formatDateTime(r.startDate || r.dateStart)}</strong> &rarr; <strong>${formatDateTime(r.endDate || r.dateEnd)}</strong>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="text-align: right;">
                                            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Scheduled</div>
                                            <div style="font-weight: 800; font-size: 1.05rem; color: var(--primary);">${Number(r.duration || 0).toFixed(1)}h</div>
                                        </div>
                                        <button class="btn btn-success btn-sm btn-worker-close-ot" data-id="${r.id}" style="padding: 6px 14px; font-weight: 700; font-size: 0.78rem;">
                                            Close OT &amp; Submit Actuals
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <!-- Overtime Compliance & Limit KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <!-- Monthly Limit Card -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid ${progressColor};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Monthly Limit Used</div>
                    <span class="badge ${percentage >= 90 ? 'badge-rejected' : (percentage >= 70 ? 'badge-pending' : 'badge-approved')}" style="font-size: 0.75rem;">${percentage}%</span>
                </div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin-top: 6px;">
                    ${totalAuthorizedHours.toFixed(1)} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">/ ${monthlyMax}h</span>
                </div>
                <!-- Progress Bar -->
                <div style="background: rgba(226, 232, 240, 0.8); height: 6px; border-radius: 99px; margin-top: 10px; overflow: hidden;">
                    <div style="background: ${progressColor}; width: ${percentage}%; height: 100%; border-radius: 99px;"></div>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
                    <strong>${remainingHours.toFixed(1)}h</strong> remaining this month
                </div>
            </div>

            <!-- Official Closed/Completed Hours -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--success);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Completed OT Records</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--success); margin-top: 6px;">
                    ${totalRecordedHours.toFixed(1)} <span style="font-size: 0.95rem; font-weight: 500; color: var(--text-muted);">hrs</span>
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
                    ${completedRequests.length} closed &amp; recorded shifts
                </div>
            </div>

            <!-- Pending Review Queue -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--warning);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Pending Approval</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b; margin-top: 6px;">
                    ${pendingRequests.length}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
                    Awaiting manager review
                </div>
            </div>

            <!-- Total Requests -->
            <div class="card glass-panel" style="margin-bottom: 0; padding: 20px; border-left: 4px solid var(--primary);">
                <div style="font-size: 0.82rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Total Submissions</div>
                <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-top: 6px;">
                    ${workerRequests.length}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
                    All-time recorded shifts
                </div>
            </div>
        </div>

        ${activeApprovedHtml}

        <!-- Overtime Analytics & Trends Section -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <!-- 1. Daily Trend in 1 Month -->
            <div class="card glass-panel" style="margin-bottom: 0;">
                <div class="card-header" style="margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.05rem;">${icons.dashboard} My Daily Overtime Trend</h2>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Daily hours distribution for selected month
                        </p>
                    </div>
                    <!-- Month & Year Filters -->
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select id="worker-filter-month" class="filter-input" style="height: 32px; padding: 0 8px; font-size: 0.82rem; min-width: 105px;">
                            ${monthNames.map((name, idx) => `<option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${name}</option>`).join('')}
                        </select>
                        <select id="worker-filter-year" class="filter-input" style="height: 32px; padding: 0 8px; font-size: 0.82rem; min-width: 78px;">
                            ${existingYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="worker-canvas-daily-trend"></canvas>
                </div>
            </div>

            <!-- 2. Monthly Multi-Year Trend -->
            <div class="card glass-panel" style="margin-bottom: 0;">
                <div class="card-header" style="margin-bottom: 12px;">
                    <div>
                        <h2 class="card-title" style="font-size: 1.05rem;">${icons.reports} My Monthly Multi-Year Trend</h2>
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
                            Year-over-year monthly overtime comparison
                        </p>
                    </div>
                </div>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="worker-canvas-yearly-trend"></canvas>
                </div>
            </div>
        </div>

        <!-- Personal Overtime Log & History -->
        <div class="card glass-panel" style="margin-bottom: 0;">
            <div class="card-header" style="margin-bottom: 16px;">
                <div>
                    <h2 class="card-title">${icons.history} Personal Overtime Records</h2>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                        Track your overtime shifts. Approved shifts require closing once work is done.
                    </p>
                </div>
            </div>

            <!-- History Filters -->
            <div class="filter-bar" style="padding: 12px; gap: 12px; margin-bottom: 16px;">
                <input type="text" id="filter-search" class="filter-input" placeholder="Search project, deliverables, ID..." style="flex-grow: 1;">
                <select id="filter-status" class="filter-input" style="width: 150px;">
                    <option value="">All Statuses</option>
                    <option value="Completed">Completed (Closed)</option>
                    <option value="Approved">Approved (In Progress)</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Pending Worker Consent">Pending Consent</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </div>

            <!-- Compact Table List -->
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Start Schedule / Actual</th>
                            <th>End Schedule / Actual</th>
                            <th>Claimable Hours</th>
                            <th>Status</th>
                            <th style="text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody id="worker-history-tbody">
                        <!-- Injected dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Elements
    const filterSearch = document.getElementById('filter-search');
    const filterStatus = document.getElementById('filter-status');
    const historyTbody = document.getElementById('worker-history-tbody');
    const monthFilter = document.getElementById('worker-filter-month');
    const yearFilter = document.getElementById('worker-filter-year');

    // Chart Instances
    let dailyChart = null;
    let yearlyChart = null;

    // --- 1. Daily Trend Chart ---
    const updateDailyTrendChart = () => {
        const canvas = document.getElementById('worker-canvas-daily-trend');
        if (!monthFilter || !yearFilter || !canvas || typeof Chart === 'undefined') return;

        const selMonth = parseInt(monthFilter.value, 10);
        const selYear = parseInt(yearFilter.value, 10);

        const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0'));
        const dailyData = new Array(daysInMonth).fill(0);

        const allReqs = db.getRequests().filter(r => 
            r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId))
        );

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
                        ticks: { font: { size: 9 } },
                        grid: { display: false }
                    }
                }
            }
        });
    };

    // --- 2. Yearly Multi-Line Chart ---
    const updateYearlyTrendChart = () => {
        const canvas = document.getElementById('worker-canvas-yearly-trend');
        if (!canvas || typeof Chart === 'undefined') return;

        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const allReqs = db.getRequests().filter(r => 
            r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId))
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
            { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.08)' },
            { border: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
            { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
            { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' }
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

    if (monthFilter) monthFilter.onchange = updateDailyTrendChart;
    if (yearFilter) yearFilter.onchange = updateDailyTrendChart;

    updateDailyTrendChart();
    updateYearlyTrendChart();

    // --- 3. History Log Rendering ---
    const loadHistory = () => {
        const query = filterSearch.value.toLowerCase();
        const statusFilter = filterStatus.value;

        const requests = db.getRequests().filter(r => 
            r.requesterId === workerId || (r.teamMembers && r.teamMembers.includes(workerId))
        );

        const filtered = requests.filter(r => {
            const project = db.getProject(r.project);
            const projectName = (project ? project.name : (r.project || '')).toLowerCase();
            const targetWork = (r.targetWork || r.target_work || '').toLowerCase();
            const statusMatches = statusFilter === '' || r.status === statusFilter;

            const textMatches = projectName.includes(query) || targetWork.includes(query) || (r.id || '').toLowerCase().includes(query);
            return statusMatches && textMatches;
        });

        if (filtered.length === 0) {
            historyTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; color:var(--text-muted); padding:32px;">
                        ${icons.info} No matching overtime records found.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort descending by start date
        filtered.sort((a,b) => new Date(b.startDate || b.dateStart) - new Date(a.startDate || a.dateStart));

        historyTbody.innerHTML = filtered.map(r => {
            let statusBadge = '';
            if (r.status === 'Completed') statusBadge = `<span class="badge badge-approved" style="background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;">${icons.check} Completed</span>`;
            else if (r.status === 'Approved') statusBadge = `<span class="badge badge-pending" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe;">Approved (Active)</span>`;
            else if (r.status === 'Rejected') statusBadge = `<span class="badge badge-rejected">${icons.times} Rejected</span>`;
            else if (r.status === 'Pending Worker Consent') statusBadge = `<span class="badge badge-pending">Consent Required</span>`;
            else statusBadge = `<span class="badge badge-pending">Pending</span>`;

            const project = db.getProject(r.project);
            const projectName = project ? project.name : (r.project || 'Project');

            const sDate = r.status === 'Completed' && r.actualStartDate ? r.actualStartDate : (r.startDate || r.dateStart);
            const eDate = r.status === 'Completed' && r.actualEndDate ? r.actualEndDate : (r.endDate || r.dateEnd);
            const durationDisplay = r.status === 'Completed' && r.actualDuration != null 
                ? `${Number(r.actualDuration).toFixed(1)} hrs <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(actual)</span>`
                : `${Number(r.duration).toFixed(1)} hrs`;

            const isRequester = r.requesterId === workerId;
            const canClose = r.status === 'Approved' && isRequester;

            return `
                <tr class="worker-ot-row" data-id="${r.id}" style="cursor: pointer;">
                    <td>
                        <div style="font-weight: 700; color: var(--text-main); font-size: 0.85rem;">${projectName}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${r.id}</div>
                    </td>
                    <td style="font-size: 0.82rem; color: var(--text-main); white-space: nowrap;">${formatDateTime(sDate)}</td>
                    <td style="font-size: 0.82rem; color: var(--text-main); white-space: nowrap;">${formatDateTime(eDate)}</td>
                    <td style="font-weight: 700; color: var(--primary); font-size: 0.84rem;">${durationDisplay}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right; white-space: nowrap;">
                        ${canClose ? `
                            <button class="btn btn-success btn-sm worker-close-btn" data-id="${r.id}" style="padding: 3px 8px; font-size: 0.72rem; font-weight: 700; margin-right: 4px;">Close OT</button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm worker-view-btn" data-id="${r.id}" style="padding: 3px 8px; font-size: 0.72rem;">View</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Attach click listeners to rows & view buttons
        historyTbody.querySelectorAll('.worker-ot-row').forEach(row => {
            row.onclick = (e) => {
                if (e.target.closest('.worker-close-btn')) {
                    const reqId = e.target.closest('.worker-close-btn').dataset.id;
                    if (reqId && window.openCloseOTModal) {
                        window.openCloseOTModal(reqId, () => renderWorkerView(container, workerId));
                    }
                    return;
                }

                const reqId = row.dataset.id;
                if (reqId && window.openRequestReviewModal) {
                    window.openRequestReviewModal(reqId);
                }
            };
        });
    };

    // Attach listeners for top Active Overtime Close buttons
    container.querySelectorAll('.btn-worker-close-ot').forEach(btn => {
        btn.onclick = () => {
            const reqId = btn.dataset.id;
            if (reqId && window.openCloseOTModal) {
                window.openCloseOTModal(reqId, () => renderWorkerView(container, workerId));
            }
        };
    });

    filterSearch.oninput = loadHistory;
    filterStatus.onchange = loadHistory;

    loadHistory();
}
