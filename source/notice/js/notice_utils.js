// 共通ユーティリティ（グローバル公開）
(function (global) {
	function pad2(n){ return String(n).padStart(2,'0'); }

	function formatDateJP(d) {
		const wjp = ["日","月","火","水","木","金","土"];
		return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${wjp[d.getDay()]}）`;
	}
	function formatTime(d) {
		return `${d.getHours()}:${pad2(d.getMinutes())}`;
	}
	function updateBadge(badgeId, count) {
		const el = document.getElementById(badgeId);
		if (!el) return;
		if (count > 0) { el.textContent = count > 99 ? "99+" : String(count); el.hidden = false; }
		else { el.hidden = true; }
	}
	// YYYY/MM/DD
	function ymd(dateStr){
		const d = new Date(dateStr);
		return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
	}
	// ★ YYYY/MM/DD HH:MM （分まで）
	function ymdhm(isoStr){
		const d = new Date(isoStr);
		return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	}

	global.formatDateJP = formatDateJP;
	global.formatTime = formatTime;
	global.updateBadge = updateBadge;
	global.ymd = ymd;
	global.ymdhm = ymdhm;
})(window);
