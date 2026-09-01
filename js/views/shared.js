// Pop-up Confirmation Dialog for Submitted Overtime Request
export function showRequestSubmittedModal(req, onDone) {
    let modal = document.getElementById('ot-submitted-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ot-submitted-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const isApproved = req.status === 'Approved';
    const isPendingConsent = req.status === 'Pending Worker Consent';
    const statusBadge = isApproved 
        ? `<span class="badge badge-approved" style="font-size:0.8rem; padding:4px 10px;">Approved</span>` 
        : (isPendingConsent ? `<span class="badge badge-warning" style="font-size:0.8rem; padding:4px 10px;">Pending Worker Consent</span>` : `<span class="badge badge-pending" style="font-size:0.8rem; padding:4px 10px;">Pending Superior Approval</span>`);

    const dateStartFormatted = req.dateStart || (req.startDate ? req.startDate.slice(0, 10) : '-');
    const dateEndFormatted = req.dateEnd || (req.endDate ? req.endDate.slice(0, 10) : dateStartFormatted);
    const timeStartFormatted = req.timeStart || '-';
    const timeEndFormatted = req.timeEnd || '-';

    const netDuration = Number(req.duration || 0).toFixed(1);
    const grossDuration = Number(req.grossDuration || req.duration || 0).toFixed(1);
    const restDeduction = Number(req.restDeduction || 0).toFixed(1);

    let restBreakdownHtml = '';
    if (Number(restDeduction) > 0) {
        restBreakdownHtml = `
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
                (Gross: ${grossDuration}h &bull; Rest: -${restDeduction}h)
            </div>
        `;
    }

    const membersCount = (req.teamMembers && req.teamMembers.length > 0) ? (req.teamMembers.length + 1) : 1;

    modal.innerHTML = `
        <div class="modal-box glass-panel" style="max-width: 480px; text-align: center; padding: 30px 24px; animation: modalZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
            <!-- Animated Green Success Check Icon -->
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; border: 2px solid #10b981; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 6px 18px rgba(16, 185, 129, 0.25);">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:34px;height:34px;stroke-width:2.5;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
                Overtime Request Submitted!
            </h2>
            <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 20px;">
                ${isApproved ? 'Your overtime shift has been successfully scheduled and authorized.' : 'Your overtime request has been recorded and submitted for approval.'}
            </p>

            <!-- Detailed Summary Card -->
            <div style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 22px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px;">
                    <div>
                        <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">Request ID</span>
                        <span style="font-weight: 800; font-size: 1.05rem; color: var(--primary);">${req.id}</span>
                    </div>
                    <div>${statusBadge}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.84rem; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Project</span>
                        <span style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${req.project || 'General'}</span>
                    </div>
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Claimable Duration</span>
                        <span style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">${netDuration} hrs</span>
                        ${restBreakdownHtml}
                    </div>
                </div>

                <div style="font-size: 0.84rem; margin-bottom: 10px;">
                    <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Schedule Period</span>
                    <span style="font-weight: 600; color: var(--text-main);">
                        ${dateStartFormatted} ${timeStartFormatted} &rarr; ${dateEndFormatted} ${timeEndFormatted}
                    </span>
                </div>

                <div style="font-size: 0.84rem;">
                    <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Employees Assigned</span>
                    <span style="font-weight: 600; color: var(--text-main);">
                        ${membersCount} employee${membersCount > 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button type="button" class="btn btn-primary" id="btn-success-modal-done" style="width: 100%; padding: 10px 18px; font-weight: 600; font-size: 0.92rem;">
                    Done
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    const closeModal = () => {
        modal.classList.remove('active');
        if (onDone) onDone();
    };

    const doneBtn = modal.querySelector('#btn-success-modal-done');
    if (doneBtn) doneBtn.onclick = closeModal;

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// Pop-up Confirmation Dialog for Approved / Rejected Overtime Request
export function showRequestDecisionModal(req, action = 'Approved', onDone) {
    let modal = document.getElementById('ot-decision-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ot-decision-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const isApproved = action === 'Approved' || req.status === 'Approved';
    const isRejected = action === 'Rejected' || req.status === 'Rejected';

    const headerIcon = isApproved ? `
        <div style="width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; border: 2px solid #10b981; color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 6px 18px rgba(16, 185, 129, 0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:34px;height:34px;stroke-width:2.5;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </div>
    ` : `
        <div style="width: 64px; height: 64px; border-radius: 50%; background: #fef2f2; border: 2px solid #ef4444; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 6px 18px rgba(239, 68, 68, 0.25);">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:34px;height:34px;stroke-width:2.5;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </div>
    `;

    const statusBadge = isApproved 
        ? `<span class="badge badge-approved" style="font-size:0.8rem; padding:4px 10px;">Approved</span>` 
        : `<span class="badge badge-danger" style="font-size:0.8rem; padding:4px 10px; background:#fee2e2; color:#b91c1c;">Rejected</span>`;

    const dateStartFormatted = req.dateStart || (req.startDate ? req.startDate.slice(0, 10) : '-');
    const dateEndFormatted = req.dateEnd || (req.endDate ? req.endDate.slice(0, 10) : dateStartFormatted);
    const timeStartFormatted = req.timeStart || '-';
    const timeEndFormatted = req.timeEnd || '-';

    const netDuration = Number(req.duration || 0).toFixed(1);
    const grossDuration = Number(req.grossDuration || req.duration || 0).toFixed(1);
    const restDeduction = Number(req.restDeduction || 0).toFixed(1);

    let restBreakdownHtml = '';
    if (Number(restDeduction) > 0) {
        restBreakdownHtml = `
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
                (Gross: ${grossDuration}h &bull; Rest: -${restDeduction}h)
            </div>
        `;
    }

    const requesterName = req.requesterName || req.workerName || req.requesterId || 'Employee';

    let decisionNoteHtml = '';
    if (isRejected && req.rejectionReason) {
        decisionNoteHtml = `
            <div style="margin-top: 10px; padding: 10px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; font-size: 0.82rem; color: #9f1239;">
                <strong>Rejection Reason:</strong> "${req.rejectionReason}"
            </div>
        `;
    } else if (isApproved && req.approverRemarks) {
        decisionNoteHtml = `
            <div style="margin-top: 10px; padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 0.82rem; color: #166534;">
                <strong>Approver Remarks:</strong> "${req.approverRemarks}"
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="modal-box glass-panel" style="max-width: 480px; text-align: center; padding: 30px 24px; animation: modalZoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
            ${headerIcon}

            <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-bottom: 6px;">
                Overtime Request ${isApproved ? 'Approved!' : 'Rejected'}
            </h2>
            <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 20px;">
                ${isApproved ? `Request ${req.id} has been officially approved and synchronized.` : `Request ${req.id} has been rejected and logged in the system.`}
            </p>

            <!-- Detailed Summary Card -->
            <div style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 22px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 10px;">
                    <div>
                        <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">Request ID</span>
                        <span style="font-weight: 800; font-size: 1.05rem; color: var(--primary);">${req.id}</span>
                    </div>
                    <div>${statusBadge}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.84rem; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Requested By</span>
                        <span style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${requesterName}</span>
                    </div>
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Project</span>
                        <span style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">${req.project || 'General'}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.84rem; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Schedule Period</span>
                        <span style="font-weight: 600; color: var(--text-main);">
                            ${dateStartFormatted} &rarr; ${dateEndFormatted}
                        </span>
                    </div>
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); display: block;">Claimable Duration</span>
                        <span style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">${netDuration} hrs</span>
                        ${restBreakdownHtml}
                    </div>
                </div>

                ${decisionNoteHtml}
            </div>

            <!-- Action Buttons -->
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button type="button" class="btn btn-primary" id="btn-decision-modal-done" style="width: 100%; padding: 10px 18px; font-weight: 600; font-size: 0.92rem;">
                    Done
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    const closeModal = () => {
        modal.classList.remove('active');
        if (onDone) onDone();
    };

    const doneBtn = modal.querySelector('#btn-decision-modal-done');
    if (doneBtn) doneBtn.onclick = closeModal;

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
}

// Render a toast notification
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;color:var(--success);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
    } else if (type === 'error') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;color:var(--danger);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
    } else {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px;height:20px;color:var(--primary);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
    }

    toast.innerHTML = `
        ${icon}
        <div style="font-size: 0.9rem; font-weight: 500;">${message}</div>
    `;

    container.appendChild(toast);

    // Animation trigger
    setTimeout(() => toast.classList.add('show'), 50);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Generate a radial progress circle HTML
export function renderRadialProgress(percentage = 0, accrued = 0, limit = 0, label = '', strokeClass = 'primary') {
    const safePercentage = Number(percentage) || 0;
    const safeAccrued = Number(accrued) || 0;
    const safeLimit = Number(limit) || 0;
    const clampedPercentage = Math.min(100, Math.max(0, safePercentage));
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

    return `
        <div class="radial-card glass-panel">
            <div class="radial-svg-wrapper">
                <svg width="80" height="80">
                    <circle class="radial-bg" cx="40" cy="40" r="${radius}"></circle>
                    <circle class="radial-bar ${strokeClass}" cx="40" cy="40" r="${radius}" 
                            stroke-dasharray="${circumference}" 
                            stroke-dashoffset="${strokeDashoffset}"></circle>
                </svg>
                <div class="radial-percentage">${Math.round(clampedPercentage)}%</div>
            </div>
            <div>
                <div style="font-size:0.85rem; color:var(--text-muted); font-weight:500;">${label} Limit</div>
                <div style="font-size:1.4rem; font-weight:700; margin-top:2px;">
                    ${safeAccrued.toFixed(1)} <span style="font-size:0.9rem; color:var(--text-muted); font-weight:normal;">/ ${safeLimit}h</span>
                </div>
            </div>
        </div>
    `;
}

// Format date into standard DD/MM/YYYY local datetime string
export function formatDateTime(isoString, includeTime = true) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
        const parts = String(isoString).split(/[-T :]/);
        if (parts.length >= 3) {
            return `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${parts[0]}`;
        }
        return isoString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const datePart = `${day}/${month}/${year}`;

    if (!includeTime) return datePart;

    const timePart = date.toLocaleTimeString(undefined, { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
    });
    return `${datePart} ${timePart}`;
}

export function formatDateOnly(isoString) {
    return formatDateTime(isoString, false);
}

// SVG Icons Dictionary
export const icons = {
    dashboard: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>`,
    users: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`,
    hierarchy: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
    limits: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>`,
    history: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
    reports: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    add: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    edit: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`,
    delete: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
    check: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    times: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    assignment: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
    settings: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    info: `<svg width="18" height="18" style="width:18px;height:18px;vertical-align:middle;display:inline-block;flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
};
