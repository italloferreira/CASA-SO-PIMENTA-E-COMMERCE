export function protectRoute() {
  const token = localStorage.getItem('csp_admin_token');
  if (!token) {
    window.location.href = '/site/pages/admin/login/index.html';
    return null;
  }
  const user = JSON.parse(localStorage.getItem('csp_admin_user') || '{}');
  const headerName = document.getElementById('headerUserName');
  const sidebarName = document.getElementById('sidebarUserName');
  const headerAvatar = document.getElementById('headerAvatar');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const nome = user.name || 'Admin';
  if (headerName) headerName.textContent = nome;
  if (sidebarName) sidebarName.textContent = nome;
  if (headerAvatar) headerAvatar.textContent = nome.charAt(0).toUpperCase();
  if (sidebarAvatar) sidebarAvatar.textContent = nome.charAt(0).toUpperCase();
  return token;
}

export function showToast(message, type) {
  if (!type) type = 'success';
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () { toast.classList.add('toast-visible'); }, 10);
  setTimeout(function () {
    toast.classList.remove('toast-visible');
    setTimeout(function () { toast.remove(); }, 300);
  }, 3500);
}
