// 共通ユーティリティ（グローバル公開）
// utils.js
(function (global) {
	/**
	 * YYYY年M月D日（曜）表記
	 * @param {Date} d
	 * @returns {string}
	 */
	function formatDateJP(d) {
		const wjp = ["日","月","火","水","木","金","土"];
		return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 (${wjp[d.getDay()]})`;
	}

	/**
	 * H:MM（ゼロ埋め）表記
	 * @param {Date} d
	 * @returns {string}
	 */
	function formatTime(d) {
		return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
	}

	/**
	 * バッジ（未読件数など）の表示更新
	 * @param {string} badgeId
	 * @param {number} count
	 */
	function updateBadge(badgeId, count) {
		const el = document.getElementById(badgeId);
		if (!el) return;
		const n = Number(count) || 0;

		if (n > 0) {
			el.textContent = n > 99 ? "99+" : String(n);
			el.hidden = false;                 // プロパティ
			el.removeAttribute("hidden");      // 属性も確実に除去
			el.style.display = "";             // 念のため display をリセット
		} else {
			el.hidden = true;
			el.setAttribute("hidden", "");     // 属性も明示的に付与
		}
	}

	// グローバル公開
	global.formatDateJP = formatDateJP;
	global.formatTime = formatTime;
	global.updateBadge = updateBadge;
})(window);
