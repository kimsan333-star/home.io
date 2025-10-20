const noticeTitle = document.querySelector('.content h2');
const markRead = document.getElementById('markRead');
const markUnread = document.getElementById('markUnread');

markRead.addEventListener('click', () => {
    noticeTitle.style.color = '#28a745';
});

markUnread.addEventListener('click', () => {
    noticeTitle.style.color = '#333';
});

// オーバーレイメニュー
const btnMenu = document.getElementById('btnMenu');
const overlay = document.getElementById('overlay');
const sheet = document.getElementById('menuSheet');

function openMenu() {
    overlay.setAttribute('aria-hidden', 'false');
    btnMenu.setAttribute('aria-expanded', 'true');
    setTimeout(() => sheet.querySelector('.menuitem')?.focus(), 0);
}

function closeMenu() {
    overlay.setAttribute('aria-hidden', 'true');
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.focus();
}

btnMenu.addEventListener('click', openMenu);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') closeMenu(); });
