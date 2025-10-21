/* ===== DOM util ===== */
const $ = (s) => document.querySelector(s);
const setMsg = (txt, type = "info") => {
	const el = $("#message");
	el.textContent = txt || "";
	el.dataset.type = type;
};

/* ===== Feature detection ===== */
const hasWebAuthn = () => "PublicKeyCredential" in window;
const hasCredMan = () => "credentials" in navigator;

/* ===== Base64URL helpers for WebAuthn ===== */
const b64uToBuf = (b64u) => {
	const pad = "=".repeat((4 - (b64u.length % 4)) % 4);
	const b64 = (b64u + pad).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(b64);
	const buf = new ArrayBuffer(raw.length);
	const view = new Uint8Array(buf);
	for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
	return buf;
};
const bufToB64u = (buf) => {
	const bytes = new Uint8Array(buf);
	let bin = "";
	for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

/* ===== Validation helpers ===== */
const isFiveDigits = (v) => /^\d{5}$/.test(v);
const isAsciiWithin60 = (v) => /^[\x20-\x7E]{1,60}$/.test(v); // 半角印字+スペース, 1〜60

/* ===== UI init ===== */
window.addEventListener("DOMContentLoaded", async () => {
	// 入力補助（数字のみ/5桁制限）
	const code = $("#employeeCode");
	code.addEventListener("input", () => {
		code.value = code.value.replace(/\D/g, "").slice(0, 5);
	});

	// 以前の社員コードを復元
	const savedId = localStorage.getItem("employeeCode");
	if (savedId) code.value = savedId;

	// パスキー対応可否でボタン制御
	if (hasWebAuthn() && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
		try {
			const uvpa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
			if (uvpa) {
				$("#passkeyBtn").hidden = false;
				$("#passkeyBtn").addEventListener("click", onPasskeyLogin);
			}
		} catch {}
	}

	// Credential Management API（対応ブラウザのみ）
	if (hasCredMan()) {
		// ブラウザ任せの自動入力。パスワードはフロントで保持しない。
		navigator.credentials.get({ password: true, mediation: "optional" }).catch(() => {});
	}

	$("#loginForm").addEventListener("submit", onLoginSubmit);
	$("#registerPasskeyBtn").addEventListener("click", onPasskeyRegister);
});

/* ===== Password login (SAML2.0前提のSP経由) ===== */
async function onLoginSubmit(ev) {
	ev.preventDefault();
	setMsg("");

	const id = $("#employeeCode").value.trim();
	const pw = $("#password").value;
	const remember = $("#remember").checked;

	// クライアント側バリデーション
	if (!isFiveDigits(id)) {
		setMsg("社員コードは半角数字5桁で入力してください。", "error");
		$("#employeeCode").focus();
		return;
	}
	if (!isAsciiWithin60(pw)) {
		setMsg("パスワードは半角で1〜60文字です。", "error");
		$("#password").focus();
		return;
	}

	// ローディング
	const btn = $("#loginBtn");
	btn.disabled = true;
	btn.textContent = "ログイン中…";

	try {
		// SAML2.0を利用したログインをバックエンドで実施する前提。
		// ここでは SP Initiated のエンドポイント `/api/login` を想定し、
		// 認証成功時は Set-Cookie 等でセッション確立し、JSON を返す設計。
		const res = await fetch("/api/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				employeeNumber: id, // 数字（半角、5桁）
				password: pw       // 半角（最大60バイト）
			})
		});

		if (!res.ok) throw new Error("HTTP " + res.status);
		const data = await res.json();

		// 期待レスポンス：
		// {
		//   employeeNumber: "12345",
		//   name: "山田 太郎",
		//   email: "taro.yamada@example.com"
		// }
		if (!data?.employeeNumber) throw new Error("認証情報が不正です");

		// 記憶ポリシー
		if (remember) localStorage.setItem("employeeCode", id);
		else localStorage.removeItem("employeeCode");

		// PasswordCredential（対応ブラウザのみ）に保存依頼
		if (remember && hasCredMan() && "PasswordCredential" in window) {
			try {
				const cred = new PasswordCredential({ id, password: pw, name: data.name || id });
				await navigator.credentials.store(cred);
			} catch {}
		}

		setMsg("ログインしました。");
		// パスキー登録導線（対応端末のみ表示）
		if (!$("#passkeyBtn").hidden) $("#postLogin").hidden = false;

		// 本番ではアプリホームへ遷移
		// location.href = "/home";
	} catch (e) {
		console.error(e);
		setMsg("認証に失敗しました。社員コードとパスワードをご確認ください。", "error");
	} finally {
		btn.disabled = false;
		btn.textContent = "ログイン";
	}
}

/* ===== WebAuthn: Passkey Register ===== */
async function onPasskeyRegister() {
	setMsg("");
	const id = $("#employeeCode").value.trim();

	// ユーザー名なし（Discoverable Credential）でも動かせますが、
	// 社員番号がある場合はサーバ側で user.id と紐付ける想定。
	if (!isFiveDigits(id)) {
		setMsg("パスキー登録には社員コード（5桁）が必要です。", "error");
		$("#employeeCode").focus();
		return;
	}

	const btn = $("#registerPasskeyBtn");
	btn.disabled = true;
	btn.textContent = "パスキー登録中…";

	try {
		// 1) サーバから登録オプション取得
		// 期待：challenge / rp / user / pubKeyCredParams / authenticatorSelection / attestation など
		let options = await (await fetch("/webauthn/register/options", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ employeeNumber: id })
		})).json();

		// base64url → ArrayBuffer へ変換
		options.publicKey.challenge = b64uToBuf(options.publicKey.challenge);
		options.publicKey.user.id = b64uToBuf(options.publicKey.user.id);
		if (options.publicKey.excludeCredentials) {
			options.publicKey.excludeCredentials = options.publicKey.excludeCredentials.map((c) => ({
				...c,
				id: b64uToBuf(c.id)
			}));
		}

		// 2) 端末でキー生成
		const cred = await navigator.credentials.create(options);
		if (!cred) throw new Error("Credential not created");

		// 3) サーバへ検証リクエスト
		const attObj = cred.response.attestationObject;
		const clientDataJSON = cred.response.clientDataJSON;

		const verify = await fetch("/webauthn/register/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				id: cred.id,
				rawId: bufToB64u(cred.rawId),
				type: cred.type,
				response: {
					attestationObject: bufToB64u(attObj),
					clientDataJSON: bufToB64u(clientDataJSON)
				}
			})
		});

		if (!verify.ok) throw new Error("Verify failed: " + verify.status);
		setMsg("パスキーを登録しました。次回からパスキーでログインできます。");
	} catch (e) {
		console.error(e);
		setMsg("パスキー登録に失敗しました。時間をおいてお試しください。", "error");
	} finally {
		btn.disabled = false;
		btn.textContent = "パスキーを登録する";
	}
}

/* ===== WebAuthn: Passkey Login ===== */
async function onPasskeyLogin() {
	setMsg("");
	const btn = $("#passkeyBtn");
	btn.disabled = true;
	btn.textContent = "パスキーで認証中…";

	try {
		const id = $("#employeeCode").value.trim();
		// 1) 認証オプション取得（社員番号あり/なしの両方に対応）
		let options = await (await fetch("/webauthn/authenticate/options", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ employeeNumber: isFiveDigits(id) ? id : undefined })
		})).json();

		options.publicKey.challenge = b64uToBuf(options.publicKey.challenge);
		if (options.publicKey.allowCredentials) {
			options.publicKey.allowCredentials = options.publicKey.allowCredentials.map((c) => ({
				...c,
				id: b64uToBuf(c.id)
			}));
		}

		// 2) 認証
		const assertion = await navigator.credentials.get(options);
		if (!assertion) throw new Error("Assertion not obtained");

		// 3) サーバで検証
		const authRes = await fetch("/webauthn/authenticate/verify", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				id: assertion.id,
				rawId: bufToB64u(assertion.rawId),
				type: assertion.type,
				response: {
					authenticatorData: bufToB64u(assertion.response.authenticatorData),
					clientDataJSON: bufToB64u(assertion.response.clientDataJSON),
					signature: bufToB64u(assertion.response.signature),
					userHandle: assertion.response.userHandle ? bufToB64u(assertion.response.userHandle) : null
				}
			})
		});

		if (!authRes.ok) throw new Error("Verify failed: " + authRes.status);
		setMsg("パスキー認証に成功しました。");
		// location.href = "/home";
	} catch (e) {
		console.error(e);
		setMsg("パスキー認証に失敗しました。通常ログインをお試しください。", "error");
	} finally {
		btn.disabled = false;
		btn.textContent = "パスキーでログイン";
	}
}
