import { protectRoute } from './admin-auth.js';

protectRoute();

function initSidebar() {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const headerMenuToggle = document.getElementById('headerMenuToggle');
  const btnLogout = document.getElementById('btnLogout');
  const sidebar = document.getElementById('sidebar');

  /* Active nav item */
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(function (item) {
    if (item.getAttribute('href') === path) {
      item.classList.add('active');
    }
  });

  /* Sidebar collapse toggle */
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-collapsed');
    });
  }

  /* Mobile menu toggle */
  if (headerMenuToggle) {
    headerMenuToggle.addEventListener('click', function () {
      document.body.classList.toggle('sidebar-open');
    });
  }

  /* Create overlay for mobile if not exists */
  if (!document.querySelector('.sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', function () {
      document.body.classList.remove('sidebar-open');
    });
    document.body.appendChild(overlay);
  }

  /* Logout */
  if (btnLogout) {
    btnLogout.addEventListener('click', function () {
      localStorage.removeItem('csp_admin_token');
      localStorage.removeItem('csp_admin_user');
      window.location.href = '/site/pages/login/index.html';
    });
  }

  /* Close sidebar on nav click (mobile) */
  document.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      if (window.innerWidth <= 768) {
        document.body.classList.remove('sidebar-open');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initSidebar);
