(function (global) {
	/**
	 * オーバーレイメニュー初期化
	 * @param {{profile?: {id?:string,name?:string,email?:string}}} [opts]
	 * @returns {{openMenu:Function, closeMenu:Function}|undefined}
	 */
	function initOverlayMenu(opts = {}) {
		const btnMenu  = document.getElementById('btnMenu');
		const overlay  = document.getElementById('overlay');
		const sheet    = document.getElementById('menuSheet');

		if (!btnMenu || !overlay || !sheet) return;

		function openMenu() {
			overlay.setAttribute('aria-hidden', 'false');
			btnMenu.setAttribute('aria-expanded', 'true');
			setTimeout(() => sheet.querySelector('button.menuitem')?.focus(), 0);
		   }
		    
		   function closeMenu() {
			overlay.setAttribute('aria-hidden', 'true');
			btnMenu.setAttribute('aria-expanded', 'false');
			btnMenu.focus();
		   }

		btnMenu.addEventListener('click', openMenu);
		overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') closeMenu();
		});

		// （任意）プロフィールの描画
		const p = opts.profile;
		if (p) {
			const $code  = document.getElementById('empCode');
			const $name  = document.getElementById('empName');
			const $email = document.getElementById('empEmail');
			if ($code)  $code.textContent  = p.id    ?? '';
			if ($name)  $name.textContent  = p.name  ?? '';
			if ($email) $email.textContent = p.email ?? '';
		}

		return { openMenu, closeMenu };
	}

	global.initOverlayMenu = initOverlayMenu;
	
})(window);
