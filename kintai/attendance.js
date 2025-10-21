// ===== ユーティリティ =====
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

function pad2(n){ return String(n).padStart(2,'0'); }
function weekdaySymbol(d){ return ['日','月','火','水','木','金','土'][d.getDay()]; }
function toDateStrWithWeekday(d){
	return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())} (${weekdaySymbol(d)})`;
}
function toDateStr(d){ return `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`; }
function fromTextDate(str){
	// 許容: 2025/09/27 または 2025/09/27 (土)
	const m = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:\s*\([^)]+\))?$/.exec((str||'').trim());
	if(!m) return null;
	return new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
}
function hmToMinutes(hhmm){
	const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
	if(!m) return NaN;
	return Number(m[1])*60 + Number(m[2]);
}

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
	initDates();			// 就業日（曜日付き表示、前日/翌日、テキスト↔date同期）
	wireCalendar();			// カスタムカレンダー（yyyy/09 ヘッダー）トグル＆相互排他
	wireTimeOverlays();		// 始業・終業のオーバーレイ（相互排他）
	wireRestModal();		// 休憩入力モーダル（新実装）
	wireFileAttach();		// 添付
	wireActions();			// 一時保存/登録/キャンセル
	wireLateReasonDependency(); // 遅刻早退理由と「その他理由」の連動
});

/* =========================
 * 日付（就業日）
 * ========================= */
function initDates(){
	const today = new Date();
	$('#workDate').value = `${today.getFullYear()}-${pad2(today.getMonth()+1)}-${pad2(today.getDate())}`;
	$('#workDateText').value = toDateStrWithWeekday(today);

	// ネイティブ date → テキスト（曜日付き）※通常は非表示だが同期のため保持
	$('#workDate').addEventListener('change', e=>{
		const d = new Date(e.target.value);
		$('#workDateText').value = toDateStrWithWeekday(d);
	});

	// テキスト → ネイティブ date
	$('#workDateText').addEventListener('blur', e=>{
		const d = fromTextDate(e.target.value);
		if(d){
			$('#workDate').value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
			$('#workDateText').value = toDateStrWithWeekday(d); // 正規化
		}
	});

	// 前日／翌日
	$$('.nav-day').forEach(btn=>{
		btn.addEventListener('click', ()=>{
			const dir = Number(btn.dataset.dir);
			const d = fromTextDate($('#workDateText').value) ?? new Date();
			d.setDate(d.getDate()+dir);
			$('#workDateText').value = toDateStrWithWeekday(d);
			$('#workDate').value = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
		});
	});
}

// カスタムカレンダー（和暦なし、ヘッダー yyyy/09）
const cal = {
	y:null, m:null, // 表示中の年・月（1-12）
	open(refDate){
		const d = refDate || fromTextDate($('#workDateText').value) || new Date();
		this.y = d.getFullYear();
		this.m = d.getMonth()+1;
		this.render();
		$('#calendarOverlay').classList.add('show');
		$('#calendarOverlay').setAttribute('aria-hidden','false');
	},
	close(){
		$('#calendarOverlay').classList.remove('show');
		$('#calendarOverlay').setAttribute('aria-hidden','true');
	},
	render(){
		const title = `${this.y}/${pad2(this.m)}`; // yyyy/09
		$('.cal-title').textContent = title;

		const grid = $('.cal-grid');
		// DOW 7個は固定要素。日セルを一旦削除
		grid.querySelectorAll('.cal-day').forEach(n=>n.remove());

		const first = new Date(this.y, this.m-1, 1);
		const startIdx = first.getDay();
		const daysInMonth = new Date(this.y, this.m, 0).getDate();

		// 先頭の空き（前月ぶん）
		for(let i=0;i<startIdx;i++){
			const ph = document.createElement('div');
			ph.className = 'cal-day disabled';
			grid.appendChild(ph);
		}

		// 日付セル
		const today = new Date();
		const selStr = $('#workDateText').value;
		const sd = selStr ? fromTextDate(selStr) : null;

		for(let d=1; d<=daysInMonth; d++){
			const cell = document.createElement('div');
			cell.className = 'cal-day';
			cell.textContent = d;

			const dateObj = new Date(this.y, this.m-1, d);
			if(sd && sd.getFullYear()===this.y && (sd.getMonth()+1)===this.m && sd.getDate()===d){
				cell.classList.add('selected');
			}
			if(dateObj.toDateString()===today.toDateString()){
				cell.classList.add('today');
			}

			cell.addEventListener('click', ()=>{
				const dObj = new Date(cal.y, cal.m-1, d);
				$('#workDate').value = `${cal.y}-${pad2(cal.m)}-${pad2(d)}`;
				$('#workDateText').value = toDateStrWithWeekday(dObj);
				this.close();
			});
			grid.appendChild(cell);
		}
	}
};

function wireCalendar(){
	const btn = $('#btnCalendar');

	// カレンダーボタン → トグル表示（開く前に時刻オーバーレイは閉じる）
	btn.addEventListener('click', (e)=>{
		e.preventDefault();
		e.stopPropagation();
		closeAllTimeOverlays(); // 先に閉じる（相互排他）
		const ov = $('#calendarOverlay');
		if(ov && ov.classList.contains('show')){
			cal.close();
		}else{
			cal.open(fromTextDate($('#workDateText').value));
		}
	});

	// オーバーレイ内ナビ
	$('.cal-nav.prev').addEventListener('click', ()=>{
		if(--cal.m < 1){ cal.m = 12; cal.y--; }
		cal.render();
	});
	$('.cal-nav.next').addEventListener('click', ()=>{
		if(++cal.m > 12){ cal.m = 1; cal.y++; }
		cal.render();
	});

	// 外側クリック/ESCで閉じる
	document.addEventListener('click', (e)=>{
		const ov = $('#calendarOverlay');
		if(!ov || !ov.classList.contains('show')) return;
		if(ov.contains(e.target) || e.target.closest('#btnCalendar')) return;
		cal.close();
	});
	document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') cal.close(); });
}

/* =========================
 * 時刻オーバーレイ（始業/終業・休憩でも再利用）
 * ========================= */
const HHS = ["00","01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23"];
const MMS = ["00","05","10","15","20","25","30","35","40","45","50","55"];

function closeAllTimeOverlays(except){
	$$('.time-overlay').forEach(ov=>{
		if(except && ov===except) return;
		ov.classList.remove('show');
		ov.setAttribute('aria-hidden','true');
	});
}
function findNearest(h, m){
	let best = {hh:HHS[0], mm:MMS[0], diff:1e9};
	HHS.forEach(H=>{
		MMS.forEach(M=>{
			const diff = Math.abs((Number(H)%24)*60 + Number(M) - (h*60 + m));
			if(diff < best.diff) best = {hh:H, mm:M, diff};
		});
	});
	return best;
}
function scrollIntoCenter(el, container){
	if(!el) return;
	const top = el.offsetTop - container.clientHeight/2 + el.clientHeight/2;
	try{ container.scrollTo({top}); } catch(_){ container.scrollTop = top; }
}

// 単一 time-field に時計オーバーレイを付与する（休憩行でも使う）
function attachTimeOverlay(tf){
	const input = tf.querySelector('input[type="text"]');
	const overlay = tf.querySelector('.time-overlay');
	const hhList = overlay.querySelector('.list.hh');
	const mmList = overlay.querySelector('.list.mm');
	const hhPill = overlay.querySelector('.hh-pill');
	const mmPill = overlay.querySelector('.mm-pill');

	// 選択肢生成（重複生成防止）
	if(!hhList.children.length){ hhList.innerHTML = HHS.map(v=>`<li data-v="${v}">${v}</li>`).join(''); }
	if(!mmList.children.length){ mmList.innerHTML = MMS.map(v=>`<li data-v="${v}">${v}</li>`).join(''); }

	let selH = HHS[0], selM = MMS[0];

	function updateHeaderAndActive(){
		hhPill.textContent = selH;
		mmPill.textContent = selM;
		hhList.querySelectorAll('li').forEach(li=> li.classList.toggle('active', li.dataset.v===selH));
		mmList.querySelectorAll('li').forEach(li=> li.classList.toggle('active', li.dataset.v===selM));
	}
	function openOverlay(){
		// カレンダーは閉じる、他の時刻オーバーレイも閉じる
		cal.close();
		closeAllTimeOverlays(overlay);

		// 初期選択：テキスト優先、なければ現在時刻の最近傍
		const txt = input.value.trim();
		if(/^(\d{2}):(\d{2})$/.test(txt)){
			const [,h,m] = txt.match(/^(\d{2}):(\d{2})$/);
			selH = h; selM = m;
		}else{
			const now = new Date();
			const nearest = findNearest(now.getHours(), now.getMinutes());
			selH = nearest.hh; selM = nearest.mm;
		}
		updateHeaderAndActive();
		overlay.classList.add('show');
		overlay.setAttribute('aria-hidden','false');
		scrollIntoCenter(hhList.querySelector(`li[data-v="${selH}"]`), hhList);
		scrollIntoCenter(mmList.querySelector(`li[data-v="${selM}"]`), mmList);
	}
	function closeOverlay(){
		overlay.classList.remove('show');
		overlay.setAttribute('aria-hidden','true');
	}
	function commit(){
		input.value = `${selH}:${selM}`;
		closeOverlay();
		input.dispatchEvent(new Event('change'));
	}

	tf.querySelector('.clock').addEventListener('click', (e)=>{
		e.stopPropagation();
		const isOpen = overlay.classList.contains('show');
		closeAllTimeOverlays();		// 先に全て閉じる
		if(!isOpen){ openOverlay(); }
	});
	hhList.addEventListener('click', e=>{
		const li = e.target.closest('li'); if(!li) return;
		selH = li.dataset.v; updateHeaderAndActive();
	});
	mmList.addEventListener('click', e=>{
		const li = e.target.closest('li'); if(!li) return;
		selM = li.dataset.v; updateHeaderAndActive(); commit(); // 分選択で確定
	});

	// 手入力 → 内部選択値更新（不正は無視）
	input.addEventListener('blur', ()=>{
		const m = /^(\d{2}):(\d{2})$/.exec(input.value || '');
		if(m){ selH = m[1]; selM = m[2]; }
	});

	// 外側クリック/ESCで閉じる
	document.addEventListener('click', (e)=>{ if(!tf.contains(e.target)) closeOverlay(); });
	document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeOverlay(); });
}

// ページ初期に存在する time-field（始業/終業）へ付与
function wireTimeOverlays(){
	$$('.time-field').forEach(tf=> attachTimeOverlay(tf));
}

/* =========================
 * 休憩時間（新モーダル）
 * ========================= */
const restState = []; // [{start:'HH:MM', end:'HH:MM'}]

function wireRestModal(){
	// 親テキストからモーダルを開く
	$('#restTotal').addEventListener('click', openRestModal);

	$('#btnRestSave').addEventListener('click', ()=>{
		// DOMから状態を読み取り → 合計分を親に反映
		const rows = $$('#restRows .rest-row');
		restState.length = 0;
		rows.forEach(row=>{
			const s = $('.time-field.start input', row).value || '00:00';
			const e = $('.time-field.end input', row).value || '00:00';
			restState.push({start:s,end:e});
		});
		updateRestTotalFromState();
		closeRestModal();
	});

	$('#btnRestCancel').addEventListener('click', closeRestModal);
	$('#btnRestAdd').addEventListener('click', addRestRow);

	// 初期表示：未入力なら1行
	if(restState.length === 0){
		clearRestRows();
		addRestRow(); // 行番号1
	}else{
		clearRestRows();
		restState.forEach(r=> addRestRow(r.start, r.end));
	}
	updateMinusButtons();
}

function openRestModal(){
	// 開くたびに現在の状態を反映
	clearRestRows();
	if(restState.length){
		restState.forEach(r=> addRestRow(r.start, r.end));
	}else{
		addRestRow();
	}
	cal.close(); // 念のためカレンダーを閉じる
	$('#restModal').classList.add('show');
	$('#restModal').setAttribute('aria-hidden','false');
	updateMinusButtons();
}
function closeRestModal(){
	$('#restModal').classList.remove('show');
	$('#restModal').setAttribute('aria-hidden','true');
}

function clearRestRows(){ $('#restRows').innerHTML = ''; renumberRows(); }

function addRestRow(start='00:00', end='00:00'){
	// 最大5行
	const current = $$('#restRows .rest-row').length;
	if(current >= 5) return;

	const wrap = $('#restRows');
	const row = document.createElement('div');
	row.className = 'rest-row';
	row.innerHTML = `
		<div class="rowno"></div>
		<div class="time-field start">
			<input type="text" placeholder="00:00" value="${start}">
			<button class="icon-btn clock" type="button" aria-label="開始時刻を選択">
				<svg width="100%" height="100%" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/>
					<line x1="12" y1="6" x2="12" y2="12" stroke="currentColor"/>
					<line x1="12" y1="12" x2="16.5" y2="14.5" stroke="currentColor"/>
				</svg>
			</button>
			<div class="time-overlay" role="dialog" aria-hidden="true">
				<div class="time-overlay__header">
					<div class="pill hh-pill">00</div>
					<div class="pill mm-pill">00</div>
				</div>
				<div class="time-overlay__lists">
					<ul class="list hh"></ul>
					<ul class="list mm"></ul>
				</div>
			</div>
		</div>
		<div class="time-field end">
			<input type="text" placeholder="00:00" value="${end}">
			<button class="icon-btn clock" type="button" aria-label="終了時刻を選択">
				<svg width="100%" height="100%" viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"/>
					<line x1="12" y1="6" x2="12" y2="12" stroke="currentColor"/>
					<line x1="12" y1="12" x2="16.5" y2="14.5" stroke="currentColor"/>
				</svg>
			</button>
			<div class="time-overlay" role="dialog" aria-hidden="true">
				<div class="time-overlay__header">
					<div class="pill hh-pill">00</div>
					<div class="pill mm-pill">00</div>
				</div>
				<div class="time-overlay__lists">
					<ul class="list hh"></ul>
					<ul class="list mm"></ul>
				</div>
			</div>
		</div>
		<button type="button" class="icon-btn minus" aria-label="この行を削除">－</button>
	`;
	wrap.appendChild(row);

	// 時計ピッカーを付与
	attachTimeOverlay($('.time-field.start', row));
	attachTimeOverlay($('.time-field.end', row));

	// 行削除
	$('.minus', row).addEventListener('click', ()=>{
		row.remove();
		// 全消去防止：0行になったら1行追加
		if($$('#restRows .rest-row').length === 0){
			addRestRow();
		}
		renumberRows();
		updateAddButtonState();
		updateMinusButtons();
	});

	renumberRows();
	updateAddButtonState();
	updateMinusButtons();
}

function renumberRows(){
	const rows = $$('#restRows .rest-row');
	rows.forEach((r,i)=> $('.rowno', r).textContent = `${i+1}.`);
}

function updateAddButtonState(){
	const count = $$('#restRows .rest-row').length;
	const addBtn = $('#btnRestAdd');
	if(addBtn) addBtn.disabled = count >= 5; // 最大5行
	updateMinusButtons();
}

// 1行の時は「−」ボタン非表示
function updateMinusButtons(){
	const rows = $$('#restRows .rest-row');
	rows.forEach((row, idx)=>{
		const btn = $('.minus', row);
		if(!btn) return;
		// 1行目は常に非表示、2行目以降は表示
		btn.style.visibility = (idx === 0) ? 'hidden' : 'visible';
	});
}

function updateRestTotalFromState(){
	let total = 0;
	restState.forEach(({start,end})=>{
		const s = hmToMinutes(start);
		const e = hmToMinutes(end);
		if(!isNaN(s) && !isNaN(e)){
			let diff = e - s;
			if(diff < 0) diff += 24*60; // 日跨ぎガード
			total += diff;
		}
	});
	$('#restTotal').value = String(total);
}

/* =========================
 * 遅刻早退：その他理由の連動
 * ========================= */
function wireLateReasonDependency(){
	const sel = $('#lateReason');
	const other = $('#lateReasonOther');

	function sync(){
		const val = sel.value; // optionにvalue未指定のため表示文字列が入る
		const isOther = (val === 'その他（その他理由を入力）');
		if(isOther){
			other.disabled = false;
			other.required = true; // 「その他」選択時のみ必須
			other.placeholder = '遅刻早退のその他の理由を入力';
		}else{
			other.value = '';
			other.disabled = true;
			other.required = false;
		}
	}

	// 初期反映＆変更時
	sync();
	sel.addEventListener('change', sync);
}

/* =========================
 * 添付・操作ボタン
 * ========================= */
function wireFileAttach(){
	$('#btnAttach').addEventListener('click', ()=> $('#delayFile').click());
	$('#delayFile').addEventListener('change', (e)=>{
		const f = e.target.files?.[0];
		$('#delayFileName').value = f ? f.name : '';
	});
}

function wireActions(){
	$('#btnDraft').addEventListener('click', ()=>{
		$('#alertArea').textContent = '';
		alert('一時保存しました（モック）');
	});
	$('#btnSubmit').addEventListener('click', ()=>{
		// 既存画面の仕様に合わせたバリデーションは別実装予定。ここではモックのみ。
		$('#alertArea').textContent = '始業時刻が入力されていません。';
	});
	$('#btnCancel').addEventListener('click', ()=>{
		location.href = './portal.html';
	});
}
