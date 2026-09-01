import { db } from './db.js';
import { renderAdminView, renderAdminRequest, renderAdminReport } from './views/admin.js';
import { renderWorkerView } from './views/worker.js';
import { renderSuperiorView } from './views/superior.js';
import { showToast, showRequestDecisionModal, openCloseOTModal, formatDateTime, icons } from './views/shared.js';

// Application State
const state = {
    currentUser: null,
    currentCompany: null,
    currentView: 'dashboard' // dashboard, admin, superior, worker
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    window.db = db;
    window.openRequestReviewModal = openRequestReviewModal;
    window.openCloseOTModal = openCloseOTModal;
    initNotificationSystem();
    initResponsiveNav();
    initLoginScreen(); // Bind submit event immediately on page load

    // If an active session exists in localStorage, immediately remain in app stage
    const existingUserId = localStorage.getItem('clock_plus_session_user_id');
    if (existingUserId) {
        setStage('app');
    }

    const trySessionRestore = async () => {
        const user = db.getCurrentUser() || await db.getActiveSessionUser();

        if (user) {
            let savedCompany = localStorage.getItem('clock_plus_session_company');
            let savedCompanyId = localStorage.getItem('clock_plus_session_company_id');
            if (!savedCompany || !savedCompanyId) {
                const userCompanies = db.getUserCompanies(user.id);
                if (userCompanies && userCompanies.length > 0) {
                    savedCompany = userCompanies[0].name;
                    savedCompanyId = userCompanies[0].id;
                    localStorage.setItem('clock_plus_session_company', savedCompany);
                    localStorage.setItem('clock_plus_session_company_id', savedCompanyId);
                }
            }

            const savedView = localStorage.getItem('clock_plus_last_view');
            if (savedView) {
                state.currentView = savedView;
            }

            state.currentUser = user;
            state.currentCompany = savedCompany || 'Testing';
            switchUser(user.id);
            setStage('app');
            return true;
        }

        // Only show login screen if no session exists
        setStage('auth');
        return false;
    };

    const restored = await trySessionRestore();

    window.addEventListener('clock_plus_db_update', () => {
        renderCompanies();
        if (!state.currentUser && !restored && !localStorage.getItem('clock_plus_session_user_id')) {
            setStage('auth');
        }
    });
});

// Stage Manager
function setStage(stage) {
    document.body.className = `stage-${stage}`;
}

// Initialize Login Screen Form Submission
function initLoginScreen() {
    const form = document.getElementById('login-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            if (!usernameInput || !passwordInput) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            const loginBtn = form.querySelector('button[type="submit"]');
            const originalText = loginBtn.innerText;
            loginBtn.disabled = true;
            loginBtn.innerText = "Signing in...";

            try {
                const user = await db.signIn(username, password);
                state.currentUser = user;
                localStorage.setItem('clock_plus_session_user_id', user.id);
                renderCompanies();
                setStage('company');
                showToast(`Signed in as ${user.name}`, "success");
            } catch (err) {
                console.error("Login failed:", err);
                showToast(err.message || "Invalid email or password.", "error");
            } finally {
                loginBtn.disabled = false;
                loginBtn.innerText = originalText;
            }
        };
    }
}

// Render Company Selection Screen
function renderCompanies() {
    const container = document.getElementById('company-grid-container');
    if (!container) return;

    if (!state.currentUser) return;

    const companies = db.getUserCompanies(state.currentUser.id);
    if (!companies || companies.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 24px;">
                You do not have access to any companies. Please contact the administrator.
            </div>
        `;
        return;
    }

    container.innerHTML = companies.map(c => `
        <div class="company-option glass-panel" data-id="${c.id}" data-name="${c.name}">
            <div class="company-icon">${c.icon || '🏢'}</div>
            <div class="company-name">${c.name}</div>
            <div class="company-industry">${c.industry || 'Enterprise'}</div>
        </div>
    `).join('');

    document.querySelectorAll('.company-option').forEach(opt => {
        opt.onclick = () => {
            const companyId = opt.dataset.id;
            const companyName = opt.dataset.name;
            state.currentCompany = companyName;
            localStorage.setItem('clock_plus_session_company', companyName);
            localStorage.setItem('clock_plus_session_company_id', companyId);
            switchUser(state.currentUser.id);
            setStage('app');
            showToast(`Connected to ${companyName} workspace.`, 'success');
        };
    });

    const backBtn = document.getElementById('company-back-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            localStorage.removeItem('clock_plus_session_user_id');
            state.currentUser = null;
            setStage('auth');
        };
    }
}

// Logout controller
function logout() {
    localStorage.removeItem('clock_plus_session_user_id');
    localStorage.removeItem('clock_plus_session_user_email');
    localStorage.removeItem('clock_plus_session_company');
    localStorage.removeItem('clock_plus_session_company_id');
    localStorage.removeItem('clock_plus_last_view');
    state.currentUser = null;
    state.currentCompany = null;
    try {
        supabase.auth.signOut().then();
    } catch (e) {}
    setStage('auth');
    showToast("Signed out successfully.", "info");
}

// Switch Active Authenticated User
function switchUser(userId) {
    const user = db.getUser(userId);
    if (!user) return;

    state.currentUser = user;
    localStorage.setItem('clock_plus_session_user_id', user.id);
    localStorage.setItem('clock_plus_session_user_email', user.email || '');

    // Update Header Company Badge
    const headerCompanyBadge = document.getElementById('header-company-badge');
    if (headerCompanyBadge) {
        if (state.currentCompany) {
            headerCompanyBadge.innerText = state.currentCompany;
            headerCompanyBadge.style.display = 'inline-block';
        } else {
            headerCompanyBadge.style.display = 'none';
        }
    }

    // Update Header User Profile Pill on Top-Right
    const initials = (user.name || user.email || 'User').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const rolePositionText = `${user.role === 'superior' ? 'Superior' : (user.role === 'admin' ? 'Admin' : 'Worker')} (${user.position || 'Staff'})`;

    const headerAvatar = document.getElementById('header-avatar');
    const headerUserName = document.getElementById('header-user-name');
    const headerUserRole = document.getElementById('header-user-role');
    if (headerAvatar) headerAvatar.innerText = initials;
    if (headerUserName) headerUserName.innerText = user.name || user.email || 'User';
    if (headerUserRole) headerUserRole.innerText = rolePositionText;

    // Render Navigation based on User Role
    renderNavigation(user);

    // Refresh Notifications
    updateNotificationsUI();
}

// 2. Render Navigation Menu Items Based on Role
function renderNavigation(user) {
    const bottomNav = document.getElementById('mobile-bottom-nav');
    const bubbleMenuItems = document.getElementById('bubble-menu-items');
    
    let bubbleNavHtml = '';
    let bottomNavHtml = '';
    
    if (user.role === 'admin') {
        const allowed = db.getUserAllowedPages(user.id);
        if (!state.currentView || !state.currentView.startsWith('admin-')) {
            state.currentView = allowed.includes('dashboard') ? 'admin-dashboard' : `admin-${allowed[0] || 'dashboard'}`;
        }

        if (allowed.includes('dashboard')) {
            const act = state.currentView === 'admin-dashboard' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="admin-dashboard">${icons.dashboard}<span>Dashboard</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="admin-dashboard">${icons.dashboard}<span>Dashboard</span></a>`;
        }
        if (allowed.includes('request')) {
            const act = state.currentView === 'admin-request' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="admin-request">${icons.assignment}<span>Request</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="admin-request">${icons.assignment}<span>Request</span></a>`;
        }
        if (allowed.includes('report')) {
            const act = state.currentView === 'admin-report' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="admin-report">${icons.reports}<span>Report</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="admin-report">${icons.reports}<span>Report</span></a>`;
        }
        if (allowed.includes('settings')) {
            const act = state.currentView === 'admin-settings' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="admin-settings">${icons.settings}<span>Settings</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="admin-settings">${icons.settings}<span>Settings</span></a>`;
        }

        bottomNavHtml += `
            <a class="bottom-nav-item" data-action="logout">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Log Out</span>
            </a>
        `;
    } else if (user.role === 'superior') {
        const allowed = db.getUserAllowedPages(user.id);
        if (!state.currentView || (!state.currentView.startsWith('superior-') && state.currentView !== 'superior')) {
            state.currentView = allowed.includes('dashboard') ? 'superior-dashboard' : `superior-${allowed[0] || 'dashboard'}`;
        }

        if (allowed.includes('dashboard')) {
            const act = (state.currentView === 'superior-dashboard' || state.currentView === 'superior') ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="superior-dashboard">${icons.dashboard}<span>Approvals & Console</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="superior-dashboard">${icons.dashboard}<span>Approvals</span></a>`;
        }
        if (allowed.includes('request')) {
            const act = state.currentView === 'superior-request' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="superior-request">${icons.assignment}<span>Request OT</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="superior-request">${icons.assignment}<span>Request OT</span></a>`;
        }
        if (allowed.includes('report')) {
            const act = state.currentView === 'superior-report' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="superior-report">${icons.reports}<span>Report</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="superior-report">${icons.reports}<span>Report</span></a>`;
        }
        if (allowed.includes('settings')) {
            const act = state.currentView === 'superior-settings' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="superior-settings">${icons.settings}<span>Settings</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="superior-settings">${icons.settings}<span>Settings</span></a>`;
        }

        bottomNavHtml += `
            <a class="bottom-nav-item" data-action="logout">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Log Out</span>
            </a>
        `;
    } else {
        const allowed = db.getUserAllowedPages(user.id);
        if (!state.currentView || (!state.currentView.startsWith('worker-') && state.currentView !== 'worker')) {
            state.currentView = allowed.includes('dashboard') ? 'worker-dashboard' : `worker-${allowed[0] || 'dashboard'}`;
        }

        if (allowed.includes('dashboard')) {
            const act = (state.currentView === 'worker-dashboard' || state.currentView === 'worker') ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="worker-dashboard">${icons.dashboard}<span>Employee Dashboard</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="worker-dashboard">${icons.dashboard}<span>Dashboard</span></a>`;
        }
        if (allowed.includes('request')) {
            const act = state.currentView === 'worker-request' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="worker-request">${icons.assignment}<span>Request OT</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="worker-request">${icons.assignment}<span>Request OT</span></a>`;
        }
        if (allowed.includes('report')) {
            const act = state.currentView === 'worker-report' ? 'active' : '';
            bubbleNavHtml += `<a class="bubble-menu-item ${act}" data-view="worker-report">${icons.reports}<span>Report</span></a>`;
            bottomNavHtml += `<a class="bottom-nav-item ${act}" data-view="worker-report">${icons.reports}<span>Report</span></a>`;
        }

        bottomNavHtml += `
            <a class="bottom-nav-item" data-action="logout">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Log Out</span>
            </a>
        `;
    }

    // Add Switch Company workspace link
    bubbleNavHtml += `
        <a class="bubble-menu-item" id="bubble-switch-company-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <span>Switch Company</span>
        </a>
    `;

    if (bubbleMenuItems) bubbleMenuItems.innerHTML = bubbleNavHtml;
    if (bottomNav) bottomNav.innerHTML = bottomNavHtml;

    // Attach click triggers to bubble menu items
    if (bubbleMenuItems) {
        bubbleMenuItems.querySelectorAll('.bubble-menu-item[data-view]').forEach(item => {
            item.onclick = (e) => {
                bubbleMenuItems.querySelectorAll('.bubble-menu-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const targetView = item.dataset.view;
                state.currentView = targetView;

                // Sync bottom nav if exists
                if (bottomNav) {
                    bottomNav.querySelectorAll('.bottom-nav-item').forEach(b => {
                        b.classList.toggle('active', b.dataset.view === targetView);
                    });
                }

                renderActiveView();
                closeBubbleMenu();
            };
        });

        const switchCoBtn = document.getElementById('bubble-switch-company-btn');
        if (switchCoBtn) {
            switchCoBtn.onclick = () => {
                closeBubbleMenu();
                setAppStage('company');
            };
        }
    }

    // Attach click triggers to mobile bottom nav items
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.onclick = (e) => {
            if (item.dataset.action === 'logout') {
                logout();
                return;
            }
            if (item.dataset.action === 'request-ot') {
                const reqBtn = document.getElementById('open-request-modal-btn');
                if (reqBtn) reqBtn.click();
                return;
            }
            if (item.dataset.view) {
                document.querySelectorAll('.bottom-nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                state.currentView = item.dataset.view;

                // Sync bubble nav
                if (bubbleMenuItems) {
                    bubbleMenuItems.querySelectorAll('.bubble-menu-item').forEach(b => {
                        b.classList.toggle('active', b.dataset.view === state.currentView);
                    });
                }

                renderActiveView();
            }
        };
    });

    // Initial render of the active view
    renderActiveView();
}

// Bubble Menu Popover Controller (Anchored under left Menu button)
function closeBubbleMenu() {
    const bubblePopover = document.getElementById('nav-bubble-popover');
    const bubbleToggle = document.getElementById('nav-bubble-toggle');
    if (bubblePopover) bubblePopover.classList.remove('active');
    if (bubbleToggle) bubbleToggle.classList.remove('active');
}

function toggleBubbleMenu(e) {
    if (e) e.stopPropagation();
    const bubblePopover = document.getElementById('nav-bubble-popover');
    const bubbleToggle = document.getElementById('nav-bubble-toggle');
    if (!bubblePopover) return;

    const isActive = bubblePopover.classList.contains('active');
    if (isActive) {
        closeBubbleMenu();
    } else {
        bubblePopover.classList.add('active');
        if (bubbleToggle) bubbleToggle.classList.add('active');
    }
}

const bubbleToggle = document.getElementById('nav-bubble-toggle');
const bubblePopover = document.getElementById('nav-bubble-popover');
const bubbleLogoutBtn = document.getElementById('bubble-logout-btn');

if (bubbleToggle) bubbleToggle.onclick = toggleBubbleMenu;

if (bubblePopover) {
    document.addEventListener('click', (e) => {
        const isClickInside = bubblePopover.contains(e.target) || 
                              (bubbleToggle && bubbleToggle.contains(e.target));
        if (!isClickInside) {
            closeBubbleMenu();
        }
    });
}

if (bubbleLogoutBtn) {
    bubbleLogoutBtn.onclick = () => {
        closeBubbleMenu();
        logout();
    };
}

// 3. Render the active view into the workspace
function renderActiveView() {
    const container = document.getElementById('view-container');
    const pageTitle = document.getElementById('page-title');
    const user = state.currentUser;

    if (!container || !user) return;

    if (state.currentView) {
        localStorage.setItem('clock_plus_last_view', state.currentView);
    }

    if (state.currentView.startsWith('admin-') || state.currentView === 'admin') {
        let subview = 'dashboard';
        if (state.currentView === 'admin-request' || state.currentView === 'request') subview = 'request';
        else if (state.currentView === 'admin-report' || state.currentView === 'report') subview = 'report';
        else if (state.currentView === 'admin-settings' || state.currentView === 'settings') subview = 'settings';

        if (pageTitle) {
            if (subview === 'request') pageTitle.innerText = "Schedule & Assign Overtime";
            else if (subview === 'report') pageTitle.innerText = "Overtime Timesheets & Compliance Reports";
            else if (subview === 'settings') pageTitle.innerText = "Settings & User Account Administration";
            else pageTitle.innerText = "Enterprise Overtime Dashboard";
        }
        renderAdminView(container, subview);
    } else if (state.currentView.startsWith('superior-') || state.currentView === 'superior') {
        let subview = 'dashboard';
        if (state.currentView === 'superior-request') subview = 'request';
        else if (state.currentView === 'superior-report') subview = 'report';
        else if (state.currentView === 'superior-settings') subview = 'settings';

        if (pageTitle) {
            if (subview === 'request') pageTitle.innerText = "Schedule & Request Overtime";
            else if (subview === 'report') pageTitle.innerText = "Overtime Timesheets & Compliance Reports";
            else if (subview === 'settings') pageTitle.innerText = "Personal Account & Profile Settings";
            else pageTitle.innerText = "Overtime Approval & Team Assign";
        }

        if (subview === 'request') {
            renderAdminRequest(container);
        } else if (subview === 'report') {
            renderAdminReport(container);
        } else if (subview === 'settings') {
            renderAdminView(container, 'settings');
        } else {
            renderSuperiorView(container, user.id);
        }
    } else if (state.currentView.startsWith('worker-') || state.currentView === 'worker') {
        let subview = 'dashboard';
        if (state.currentView === 'worker-request') subview = 'request';
        else if (state.currentView === 'worker-report') subview = 'report';
        else if (state.currentView === 'worker-settings') subview = 'settings';

        if (pageTitle) {
            if (subview === 'request') pageTitle.innerText = "Submit Overtime Request";
            else if (subview === 'report') pageTitle.innerText = "Overtime Timesheets & Compliance Reports";
            else if (subview === 'settings') pageTitle.innerText = "Personal Account & Profile Settings";
            else pageTitle.innerText = "Employee Overtime Dashboard";
        }

        if (subview === 'request') {
            renderAdminRequest(container);
        } else if (subview === 'report') {
            renderAdminReport(container);
        } else if (subview === 'settings') {
            renderAdminView(container, 'settings');
        } else {
            renderWorkerView(container, user.id);
        }
    }
}

// 4. Notification Bubble Popover Controls
function initNotificationSystem() {
    const bell = document.getElementById('notif-bell');
    const popover = document.getElementById('notifications-popover');
    const btnMarkAllRead = document.getElementById('btn-mark-all-read');
    const btnClearAll = document.getElementById('btn-clear-all-notifs');

    if (bell && popover) {
        bell.onclick = (e) => {
            e.stopPropagation();
            const isActive = popover.classList.contains('active');
            if (isActive) {
                popover.classList.remove('active');
            } else {
                popover.classList.add('active');
                if (state.currentUser) {
                    db.markNotificationsAsRead(state.currentUser.id);
                    updateNotificationsUI();
                }
            }
        };

        // Close on click outside popover
        document.addEventListener('click', (e) => {
            if (!popover.contains(e.target) && !bell.contains(e.target)) {
                popover.classList.remove('active');
            }
        });
    }

    if (btnMarkAllRead) {
        btnMarkAllRead.onclick = (e) => {
            e.stopPropagation();
            if (state.currentUser) {
                db.markNotificationsAsRead(state.currentUser.id);
                updateNotificationsUI();
                showToast("All notifications marked as read.", "success");
            }
        };
    }

    if (btnClearAll) {
        btnClearAll.onclick = (e) => {
            e.stopPropagation();
            if (state.currentUser) {
                db.clearAllNotifications(state.currentUser.id);
                updateNotificationsUI();
                showToast("All notifications deleted.", "info");
            }
        };
    }

    // Listen for database changes to update notifications live
    window.addEventListener('clock_plus_db_update', () => {
        updateNotificationsUI();
    });
}

// Update Notifications Bell and Popover List
function updateNotificationsUI() {
    if (!state.currentUser) return;
    
    const unreadCount = db.getUnreadNotificationsCount(state.currentUser.id);
    const badge = document.getElementById('notif-badge');
    const popoverBadge = document.getElementById('notif-popover-unread-count');

    if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = 'flex';
        if (popoverBadge) {
            popoverBadge.innerText = `${unreadCount} Unread`;
            popoverBadge.style.display = 'inline-block';
        }
    } else {
        badge.style.display = 'none';
        if (popoverBadge) popoverBadge.style.display = 'none';
    }

    const notifList = document.getElementById('drawer-notifications-list');
    if (!notifList) return;

    const allNotifications = db.getNotifications(state.currentUser.id);

    if (allNotifications.length === 0) {
        notifList.innerHTML = `
            <div class="empty-state" style="padding: 24px 10px; text-align: center; color: var(--text-muted);">
                ${icons.info}
                <div style="font-size: 0.85rem; margin-top: 6px;">You have no notifications.</div>
            </div>
        `;
        return;
    }

    // Sort descending by timestamp
    allNotifications.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

    notifList.innerHTML = allNotifications.map(n => {
        // Extract request ID if present
        const match = n.message.match(/OT-\d+/);
        const reqId = match ? match[0] : null;

        return `
            <div class="notif-item ${n.read ? '' : 'unread'}" data-req-id="${reqId || ''}" data-notif-id="${n.id}" style="position: relative; padding-right: 32px;">
                <!-- Individual Delete Button -->
                <button class="notif-item-delete-btn" data-id="${n.id}" title="Delete this notification" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 2px 6px; font-size: 1.1rem; line-height: 1; border-radius: 4px; transition: color 0.15s, background 0.15s;">
                    &times;
                </button>
                <div class="notif-text" style="font-size: 0.84rem; line-height: 1.45; color: var(--text-main);">${n.message}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
                    <div class="notif-time" style="font-size: 0.75rem; color: var(--text-muted);">${new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • ${new Date(n.timestamp).toLocaleDateString()}</div>
                    ${reqId ? `<span style="font-size:0.75rem; font-weight:700; color:var(--primary); cursor: pointer;">Review &rarr;</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Attach individual delete button listeners
    notifList.querySelectorAll('.notif-item-delete-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const notifId = btn.dataset.id;
            if (notifId) {
                db.deleteNotification(notifId);
                updateNotificationsUI();
                showToast("Notification deleted.", "info");
            }
        };
    });

    // Attach click listener to notification items for reviewing request
    notifList.querySelectorAll('.notif-item').forEach(item => {
        item.onclick = (e) => {
            if (e.target.closest('.notif-item-delete-btn')) return;
            const reqId = item.dataset.reqId;
            const popover = document.getElementById('notifications-popover');
            if (popover) popover.classList.remove('active');

            if (reqId) {
                openRequestReviewModal(reqId);
            }
        };
    });
}

// 5. Interactive Request Review, Schedule Adjustment & Decision Modal
export function openRequestReviewModal(requestId) {
    const req = db.getRequest(requestId);
    const modal = document.getElementById('review-ot-modal');
    const modalTitle = document.getElementById('rev-modal-title');
    const modalSubtitle = document.getElementById('rev-modal-subtitle');
    const modalBody = document.getElementById('rev-modal-body');

    if (!req || !modal || !modalBody) {
        showToast(`Request ${requestId} could not be found.`, "error");
        return;
    }

    const currentUser = state.currentUser;
    const requester = db.getUser(req.requesterId);
    const approver = db.getUser(req.approverId);
    const project = db.getProject(req.project);
    const projectName = project ? project.name : (req.project || 'General Project');
    const isApproverOrAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superior' || req.approverId === currentUser.id);

    modalTitle.innerHTML = `Overtime Request: <strong>${req.id}</strong>`;
    modalSubtitle.innerText = `Submitted on ${formatDateTime(req.startDate || req.dateStart)}`;

    let statusBadge = '';
    if (req.status === 'Approved') statusBadge = `<span class="badge badge-approved">${icons.check} Approved</span>`;
    else if (req.status === 'Rejected') statusBadge = `<span class="badge badge-rejected">${icons.times} Rejected</span>`;
    else if (req.status === 'Pending Worker Consent') statusBadge = `<span class="badge badge-pending">Consent Required</span>`;
    else statusBadge = `<span class="badge badge-pending">Pending Approval</span>`;

    const teamNames = (req.teamMembers && req.teamMembers.length > 0)
        ? req.teamMembers.map(tid => db.getUser(tid)?.name || tid).join(', ')
        : 'None';

    const cleanTime = (t) => {
        if (!t) return '18:00';
        const str = String(t).trim();
        return str.length >= 5 ? str.slice(0, 5) : str;
    };

    // Format dates for inputs
    const defaultDateStart = req.dateStart || (req.startDate ? req.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const defaultDateEnd = req.dateEnd || (req.endDate ? req.endDate.slice(0, 10) : defaultDateStart);
    const defaultTimeStart = cleanTime(req.timeStart || (req.startDate ? new Date(req.startDate).toTimeString().slice(0, 5) : '18:00'));
    const defaultTimeEnd = cleanTime(req.timeEnd || (req.endDate ? new Date(req.endDate).toTimeString().slice(0, 5) : '20:00'));

    let contentHtml = `
        <!-- Request Summary Card -->
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 12px; padding: 14px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                <div>
                    <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; font-weight:700; color:var(--primary); margin-bottom:2px;">Requested by:</div>
                    <div style="font-weight:700; font-size:1.05rem; color:var(--text-main);">${requester ? requester.name : req.requesterId}</div>
                    <div style="font-size:0.82rem; color:var(--text-muted);">${requester ? requester.position : 'Staff'} • ${requester ? requester.email : ''}</div>
                </div>
                <div>${statusBadge}</div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; font-size:0.85rem; border-top:1px solid var(--border-color); padding-top:10px;">
                <div><strong>Project:</strong> ${projectName}</div>
                <div><strong>Duration:</strong> <span style="font-weight:700; color:var(--primary);">${Number(req.duration).toFixed(1)} hrs</span></div>
                ${approver ? `<div><strong>Assigned Approver:</strong> ${approver.name}</div>` : ''}
                <div style="grid-column: 1 / -1;"><strong>Target Deliverables:</strong> ${req.targetWork || 'N/A'}</div>
                ${req.workProgress ? `<div style="grid-column: 1 / -1;"><strong>Work Progress:</strong> ${req.workProgress}</div>` : ''}
                ${teamNames !== 'None' ? `<div style="grid-column: 1 / -1;"><strong>Collaborating Workers:</strong> ${teamNames}</div>` : ''}
            </div>
        </div>
    `;

    // Display existing approver remarks or rejection notes
    if (req.approverRemarks) {
        contentHtml += `
            <div style="background: rgba(99, 102, 241, 0.06); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; padding: 12px 14px; font-size: 0.88rem; color: var(--text-main);">
                <strong style="color: var(--primary);">${icons.info} Approver Remarks & Instructions:</strong>
                <div style="margin-top: 4px;">${req.approverRemarks}</div>
            </div>
        `;
    }
    if (req.status === 'Rejected' && req.rejectionReason) {
        contentHtml += `
            <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 10px; padding: 12px 14px; font-size: 0.88rem; color: #dc2626;">
                <strong>${icons.times} Rejection Reason:</strong>
                <div style="margin-top: 4px;">${req.rejectionReason}</div>
            </div>
        `;
    }

    if (req.status === 'Completed') {
        contentHtml += `
            <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 14px; font-size: 0.88rem; color: #065f46;">
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    ${icons.check} Actual Work Completion Summary (Closed Shift)
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem; margin-bottom: 8px;">
                    <div>Actual Start: <strong>${formatDateTime(req.actualStartDate || req.startDate)}</strong></div>
                    <div>Actual End: <strong>${formatDateTime(req.actualEndDate || req.endDate)}</strong></div>
                    <div>Gross Working Time: <strong>${Number(req.actualGrossDuration || req.grossDuration || req.duration).toFixed(1)} hrs</strong></div>
                    <div>Rest Break Deducted: <strong>-${Number(req.actualRestDeduction || 0).toFixed(1)} hrs</strong></div>
                </div>
                <div style="background: #ffffff; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600;">Final Claimable Overtime:</span>
                    <span style="font-weight: 800; font-size: 1.1rem; color: #059669;">${Number(req.actualDuration || req.duration).toFixed(1)} hrs</span>
                </div>
                ${req.closingRemarks ? `
                    <div style="margin-top: 8px; font-size: 0.82rem;">
                        <strong>Completion Remarks:</strong> "${req.closingRemarks}"
                    </div>
                ` : ''}
            </div>
        `;
    }

    if (isApproverOrAdmin && req.status === 'Pending Approval') {
        contentHtml += `
            <!-- Approver Controls: Adjust Schedule -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 14px;">
                <label style="font-weight: 700; font-size: 0.92rem; color: var(--text-main); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <span style="display:inline-flex; width:18px; height:18px; color:var(--primary);">${icons.assignment}</span> Adjust Proposed Overtime Schedule (Optional)
                </label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 10px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="rev-date-start" style="font-size: 0.78rem; font-weight: 600;">Date Start</label>
                        <input type="date" id="rev-date-start" value="${defaultDateStart}" style="padding: 6px 10px; font-size: 0.85rem; background:#fff !important; color:#0f172a !important;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="rev-time-start" style="font-size: 0.78rem; font-weight: 600;">Time Start</label>
                        <input type="time" id="rev-time-start" value="${defaultTimeStart}" style="padding: 6px 10px; font-size: 0.85rem; background:#fff !important; color:#0f172a !important;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="rev-date-end" style="font-size: 0.78rem; font-weight: 600;">Date End</label>
                        <input type="date" id="rev-date-end" value="${defaultDateEnd}" style="padding: 6px 10px; font-size: 0.85rem; background:#fff !important; color:#0f172a !important;">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label for="rev-time-end" style="font-size: 0.78rem; font-weight: 600;">Time End</label>
                        <input type="time" id="rev-time-end" value="${defaultTimeEnd}" style="padding: 6px 10px; font-size: 0.85rem; background:#fff !important; color:#0f172a !important;">
                    </div>
                </div>
                <div id="rev-compliance-indicator"></div>
            </div>

            <!-- Approver Remarks / Notes for Requester -->
            <div class="form-group" style="margin-bottom: 0;">
                <label for="rev-approver-remarks" style="font-weight: 700; font-size: 0.92rem; color: var(--text-main);">
                    Approver Remarks & Instructions (Notes for Worker)
                </label>
                <textarea id="rev-approver-remarks" placeholder="Add approval remarks or instructions for the worker..." style="min-height: 70px; background:#fff !important; color:#0f172a !important;">${req.approverRemarks || ''}</textarea>
            </div>

            <!-- Rejection Reason Input (Visible if rejecting) -->
            <div class="form-group" id="rev-reject-container" style="display: none; margin-bottom: 0; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 12px;">
                <label for="rev-rejection-reason" style="font-weight: 700; font-size: 0.88rem; color: #dc2626;">
                    Mandatory Reason for Rejection
                </label>
                <textarea id="rev-rejection-reason" placeholder="Please specify why this overtime request is being rejected..." style="min-height: 60px; background:#fff !important; color:#0f172a !important; margin-top: 4px;"></textarea>
            </div>

            <!-- Action Buttons -->
            <div class="modal-footer" style="margin-top: 14px; gap: 10px;">
                <button type="button" class="btn btn-secondary" onclick="document.getElementById('review-ot-modal').classList.remove('active')">Cancel</button>
                <button type="button" class="btn btn-danger" id="rev-btn-reject">Reject Request</button>
                <button type="button" class="btn btn-success" id="rev-btn-approve">Approve Request</button>
            </div>
        `;
    } else {
        const canClose = req.status === 'Approved' && (req.requesterId === currentUser?.id || isApproverOrAdmin);
        contentHtml += `
            <div class="modal-footer" style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px;">
                ${canClose ? `<button type="button" class="btn btn-success" id="rev-btn-close-ot" style="font-weight:700;">Close OT &amp; Submit Actuals</button>` : ''}
                <button type="button" class="btn btn-primary" onclick="document.getElementById('review-ot-modal').classList.remove('active')">Close</button>
            </div>
        `;
    }

    modalBody.innerHTML = contentHtml;
    modal.classList.add('active');

    const btnCloseOt = document.getElementById('rev-btn-close-ot');
    if (btnCloseOt) {
        btnCloseOt.onclick = () => {
            modal.classList.remove('active');
            if (window.openCloseOTModal) {
                window.openCloseOTModal(req.id, () => {
                    renderActiveView();
                });
            }
        };
    }

    // Attach event handlers if approver controls are active
    if (isApproverOrAdmin && req.status === 'Pending Approval') {
        const dsInput = document.getElementById('rev-date-start');
        const tsInput = document.getElementById('rev-time-start');
        const deInput = document.getElementById('rev-date-end');
        const teInput = document.getElementById('rev-time-end');
        const compIndicator = document.getElementById('rev-compliance-indicator');
        const remarksInput = document.getElementById('rev-approver-remarks');
        const rejectContainer = document.getElementById('rev-reject-container');
        const rejectReasonInput = document.getElementById('rev-rejection-reason');
        const btnApprove = document.getElementById('rev-btn-approve');
        const btnReject = document.getElementById('rev-btn-reject');

        const getRevRange = () => {
            const ds = dsInput.value;
            const ts = cleanTime(tsInput.value);
            const de = deInput.value;
            const te = cleanTime(teInput.value);
            if (!ds || !ts || !de || !te) return null;
            const startObj = new Date(`${ds}T${ts}:00`);
            const endObj = new Date(`${de}T${te}:00`);
            if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) return null;
            const duration = (endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60);
            return { startISO: startObj.toISOString(), endISO: endObj.toISOString(), duration, ds, de, ts, te };
        };

        const checkRevCompliance = () => {
            const range = getRevRange();
            if (!range || range.duration <= 0) {
                compIndicator.innerHTML = `<div class="info-alert info-alert-danger" style="margin-bottom:0; font-size:0.8rem;">Finish date/time must be later than start date/time.</div>`;
                btnApprove.disabled = true;
                return;
            }
            btnApprove.disabled = false;
            const otCalc = db.calculateNetOvertime(range.duration);
            let restNote = '';
            if (otCalc.ruleApplied && otCalc.restDeducted > 0) {
                restNote = ` <span style="color:var(--text-muted); font-size:0.76rem;">(Gross: ${otCalc.grossHours.toFixed(1)}h, Rest: -${otCalc.restDeducted.toFixed(1)}h)</span>`;
            }
            compIndicator.innerHTML = `<div class="info-alert info-alert-success" style="margin-bottom:0; font-size:0.8rem;">Schedule valid: <strong>${otCalc.netHours.toFixed(1)} claimable hours</strong>${restNote}.</div>`;
        };

        dsInput.onchange = () => {
            if (!deInput.value || deInput.value <= dsInput.value) deInput.value = dsInput.value;
            checkRevCompliance();
        };
        tsInput.onchange = checkRevCompliance;
        deInput.onchange = checkRevCompliance;
        teInput.onchange = checkRevCompliance;
        checkRevCompliance();

        // Approve Action
        btnApprove.onclick = () => {
            const range = getRevRange();
            if (!range || range.duration <= 0) {
                showToast("Please specify a valid schedule before approving.", "error");
                return;
            }
            const otCalc = db.calculateNetOvertime(range.duration);
            const remarks = remarksInput.value.trim();
            const updated = db.updateRequest(req.id, {
                startDate: range.startISO,
                endDate: range.endISO,
                dateStart: range.ds,
                dateEnd: range.de,
                timeStart: range.ts,
                timeEnd: range.te,
                duration: otCalc.netHours,
                grossDuration: otCalc.grossHours,
                restDeduction: otCalc.restDeducted,
                approverRemarks: remarks,
                status: 'Approved'
            }, currentUser.id, 'Approved request');

            modal.classList.remove('active');
            showToast(`Request ${req.id} has been Approved with remarks.`, "success");
            showRequestDecisionModal(updated || req, 'Approved', () => {
                renderActiveView();
            });
        };

        // Reject Action
        let isRejectExpanded = false;
        btnReject.onclick = () => {
            if (!isRejectExpanded) {
                isRejectExpanded = true;
                rejectContainer.style.display = 'block';
                rejectReasonInput.focus();
                btnReject.innerText = "Confirm Rejection";
                return;
            }
            const reason = rejectReasonInput.value.trim();
            if (!reason) {
                showToast("Please provide a reason for rejecting the request.", "error");
                rejectReasonInput.focus();
                return;
            }
            const updated = db.updateRequest(req.id, {
                status: 'Rejected',
                rejectionReason: reason
            }, currentUser.id, `Rejected request. Reason: ${reason}`);

            modal.classList.remove('active');
            showToast(`Request ${req.id} rejected.`, "info");
            showRequestDecisionModal(updated || req, 'Rejected', () => {
                renderActiveView();
            });
        };
    }
}
window.openRequestReviewModal = openRequestReviewModal;

// 6. Responsive navigation helper
function initResponsiveNav() {
    const toggle = document.getElementById('menu-toggle-btn');
    const sidebar = document.getElementById('sidebar');

    if (toggle && sidebar) {
        toggle.onclick = (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        };

        // Click outside sidebar closes it on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900) {
                if (!sidebar.contains(e.target) && e.target !== toggle) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
}
