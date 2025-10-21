document.addEventListener('DOMContentLoaded', function() {
    // 現在の日付を設定
    setCurrentDate();
    
    // ハンバーガーメニューのトグル
    const menuIcon = document.getElementById('menu-icon');
    const menuBox = document.getElementById('menu-box');
    
    menuIcon.addEventListener('click', function() {
        menuBox.style.display = menuBox.style.display === 'block' ? 'none' : 'block';
    });
});

document.getElementById('save-button').addEventListener('click', function() {
    alert('一時保存しました。');
});

document.getElementById('close-button').addEventListener('click', function() {
    window.close(); // 閉じるボタンの機能
});

document.getElementById('attendance-form').addEventListener('submit', function(event) {
    event.preventDefault(); // フォームのデフォルトの送信を防ぐ
    alert('登録申請が完了しました。');
});

// 日付選択ボタンの機能
document.getElementById('date-increment').addEventListener('click', function() {
    changeDate(1);
});

document.getElementById('date-decrement').addEventListener('click', function() {
    changeDate(-1);
});

// 現在の日付を設定する関数
function setCurrentDate() {
    const today = new Date();
    updateDateField(today);
}

// 日付を変更する関数
function changeDate(days) {
    const currentDate = new Date(document.getElementById('date').value.split('(')[0].trim());
    currentDate.setDate(currentDate.getDate() + days);
    updateDateField(currentDate);
}

// 日付フィールドを更新する関数
function updateDateField(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const formattedDate = date.toLocaleDateString('ja-JP', options).replace(/\//g, '/').replace(/(\d{4})\/(\d{2})\/(\d{2})/, '$1/$2/$3');
    const dayOfWeek = date.toLocaleDateString('ja-JP', { weekday: 'short' });
    document.getElementById('date').value = `${formattedDate}(${dayOfWeek})`;
}