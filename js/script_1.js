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
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMenu();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') {
        closeMenu();
    }
});

// ページネーション
const mainContent = document.getElementById('mainContent');
const notices = Array.from(mainContent.children);
let page = 1;

function showPage(n) {
    if (n === 1) {
        notices.forEach((el, i) => el.style.display = (i < 5) ? 'block' : 'none');
    } else {
        notices.forEach((el, i) => el.style.display = (i === 5) ? 'block' : 'none');
    }
    document.getElementById('prevBtn').disabled = (n === 1);
    document.getElementById('nextBtn').disabled = (n === 2);
    document.getElementById('pageInfo').textContent = n + ' / 2';
    page = n;
}

document.getElementById('prevBtn').addEventListener('click', () => showPage(page - 1));
document.getElementById('nextBtn').addEventListener('click', () => showPage(page + 1));
showPage(1);

// 未読管理
const unreadKey = 'noticeUnread';

function initUnread() {
    const unreadData = localStorage.getItem(unreadKey);
    if (!unreadData) {
        localStorage.setItem(unreadKey, JSON.stringify([0])); // 初期状態は1件目のみ未読
    }
    updateUnread();
}

function updateUnread() {
    const unreadData = JSON.parse(localStorage.getItem(unreadKey) || '[]');
    notices.forEach((a, i) => {
        const item = a.querySelector('.notice-item');
        if (unreadData.includes(i)) item.classList.add('unread');
        else item.classList.remove('unread');
    });
}

notices.forEach((a, i) => {
    a.addEventListener('click', () => {
        const unreadData = JSON.parse(localStorage.getItem(unreadKey) || '[]');
        const idx = unreadData.indexOf(i);
        if (idx !== -1) {
            unreadData.splice(idx, 1); // 未読解除
            localStorage.setItem(unreadKey, JSON.stringify(unreadData));
            updateUnread();
        }
    });
});

initUnread();