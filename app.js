// Den1zz v18 — Favoriler, başarımlar, günlük ödül, arama, istatistik

const ADMIN_EMAIL = 'gizlihesap40444@gmail.com';
const DB = {
  kul: 'den1zz_kullanicilar',
  duyuru: 'den1zz_duyurular',
  girisler: 'den1zz_girisler',
  sorgular: 'den1zz_sorgular',
  basarimlar: 'den1zz_basarimlar',
  gunluk: 'den1zz_gunluk',
};

const RANKS = [
  { min: 1, ad: 'Çaylak' },
  { min: 5, ad: 'Acemi' },
  { min: 10, ad: 'Gezgin' },
  { min: 20, ad: 'Kartal' },
  { min: 35, ad: 'Şampiyon' },
  { min: 50, ad: 'Efsane' },
];

const BASARIMLAR = [
  { id: 'ilk_sorgu', ad: 'İlk Sorgu', acik: 'İlk sorgunu yap', ikon: '🎯' },
  { id: 'on_sorgu', ad: 'On Sorgu', acik: '10 sorgu yap', ikon: '🔥' },
  { id: 'yuz_sorgu', ad: 'Yüz Sorgu', acik: '100 sorgu yap', ikon: '💯' },
  { id: 'ilk_vip', ad: 'VIP Oldun', acik: 'VIP üyelik al', ikon: '👑' },
  { id: 'lvl5', ad: 'Seviye 5', acik: 'Seviye 5\'e ulaş', ikon: '⭐' },
  { id: 'lvl10', ad: 'Seviye 10', acik: 'Seviye 10\'a ulaş', ikon: '🌟' },
  { id: 'lvl25', ad: 'Seviye 25', acik: 'Seviye 25\'e ulaş', ikon: '💎' },
  { id: 'streak7', ad: '7 Gün', acik: '7 gün üst üste gir', ikon: '🔥' },
  { id: 'streak30', ad: '30 Gün', acik: '30 gün üst üste gir', ikon: '🏆' },
  { id: 'profil', ad: 'Kendini Tanıt', acik: 'Bio ekle', ikon: '📝' },
  { id: 'gezgin', ad: 'Gezgin', acik: '10 farklı araç kullan', ikon: '🧭' },
  { id: 'koleksiyoncu', ad: 'Koleksiyoncu', acik: '5 araç favorile', ikon: '📚' },
];

let aktifKullanici = null;
let secilenFoto = null;
let secilenBanner = null;
let aktifArac = null;
let aktifAktiviteFiltre = 'hepsi';
let sonSonuc = null;
let aramaSeciliIndex = 0;
let aramaSonuclari = [];

// ============ STORAGE ============
function dbAl(k, d = null) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
}
function dbYaz(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

async function sha256(m) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(m));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}

// ============ ROL ============
function rolHesapla(u, emailKey = null) {
  if (!u) return 'member';
  const mail = (u.email || emailKey || '').toLowerCase();
  if (mail === ADMIN_EMAIL) return 'admin';
  if (u.vipBitis && Date.now() < u.vipBitis) return 'vip';
  return 'member';
}
function rolEtiket(r) { return { admin: 'ADMIN', vip: 'VIP', member: 'MEMBER' }[r] || 'MEMBER'; }

// ============ RÜTBE ============
function rankHesapla(level) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.min) r = x;
  return r.ad;
}

// ============ XP ============
function xpGerekli(l) { return l * 100; }
function levelHesapla(xp) {
  let level = 1, kalan = xp || 0;
  while (kalan >= xpGerekli(level)) { kalan -= xpGerekli(level); level++; }
  return { level, mevcut: kalan, gerekli: xpGerekli(level) };
}

function xpEkle(email, miktar) {
  const k = dbAl(DB.kul, {});
  if (!k[email]) return null;
  const eski = levelHesapla(k[email].xp || 0).level;
  k[email].xp = (k[email].xp || 0) + miktar;
  dbYaz(DB.kul, k);
  const yeni = levelHesapla(k[email].xp).level;
  if (aktifKullanici && aktifKullanici.email === email) {
    sbXpGuncelle();
    if (yeni > eski) {
      setTimeout(() => toast(`🎉 Seviye atladın! LVL ${yeni}`), 400);
      basariKontrol();
    }
  }
  return yeni > eski ? yeni : null;
}

// ============ SAYI ANİMASYONU ============
function sayiAnimasyon(el, hedef) {
  if (!el) return;
  const basla = parseInt(el.textContent) || 0;
  if (basla === hedef) { el.textContent = hedef; return; }
  const sure = 500;
  const t0 = performance.now();
  function tick(t) {
    const p = Math.min((t - t0) / sure, 1);
    const v = Math.round(basla + (hedef - basla) * p);
    el.textContent = v;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============ TOAST ============
function toast(mesaj) {
  const el = document.createElement('div');
  el.textContent = mesaj;
  el.style.cssText = `
    position:fixed;top:24px;left:50%;transform:translateX(-50%);
    padding:.9rem 1.4rem;border-radius:12px;z-index:9999;
    font-size:.85rem;font-weight:700;font-family:inherit;
    background:#fff;color:#000;box-shadow:0 12px 40px rgba(0,0,0,.6);
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-16px)';
    setTimeout(() => el.remove(), 300);
  }, 2400);
}

// ============ BAŞARIMLAR ============
function basariKontrol() {
  const b = dbAl(DB.basarimlar, {});
  const kulEmail = aktifKullanici?.email;
  if (!kulEmail) return;
  if (!b[kulEmail]) b[kulEmail] = [];

  const k = dbAl(DB.kul, {});
  const u = k[kulEmail];
  if (!u) return;

  const sorgular = dbAl(DB.sorgular, []).filter(s => s.email === kulEmail);
  const { level } = levelHesapla(u.xp || 0);
  const role = rolHesapla(u, kulEmail);

  const yeni = [];
  function ekle(id) { if (!b[kulEmail].includes(id)) { b[kulEmail].push(id); yeni.push(id); } }

  if (sorgular.length >= 1) ekle('ilk_sorgu');
  if (sorgular.length >= 10) ekle('on_sorgu');
  if (sorgular.length >= 100) ekle('yuz_sorgu');
  if (role === 'vip' || role === 'admin') ekle('ilk_vip');
  if (level >= 5) ekle('lvl5');
  if (level >= 10) ekle('lvl10');
  if (level >= 25) ekle('lvl25');
  if ((u.streak || 0) >= 7) ekle('streak7');
  if ((u.streak || 0) >= 30) ekle('streak30');
  if (u.bio) ekle('profil');
  const araclar = new Set(sorgular.map(s => s.arac));
  if (araclar.size >= 10) ekle('gezgin');
  if ((u.favoriler || []).length >= 5) ekle('koleksiyoncu');

  dbYaz(DB.basarimlar, b);
  yeni.forEach(id => {
    const bs = BASARIMLAR.find(x => x.id === id);
    if (bs) setTimeout(() => toast(`🏆 Başarım: ${bs.ad}`), 800);
  });
}

// ============ GÜNLÜK ÖDÜL ============
function gunlukKontrol() {
  const g = dbAl(DB.gunluk, {});
  const e = aktifKullanici?.email;
  if (!e) return;
  if (!g[e]) g[e] = { sonAlim: 0, streak: 0 };
  const bugun = new Date().toDateString();
  const son = g[e].sonAlim ? new Date(g[e].sonAlim).toDateString() : null;
  document.getElementById('gunlukNokta').style.display = (son !== bugun) ? 'block' : 'none';
}

function gunlukAl() {
  const g = dbAl(DB.gunluk, {});
  const e = aktifKullanici.email;
  if (!g[e]) g[e] = { sonAlim: 0, streak: 0 };
  const bugun = new Date().toDateString();
  const son = g[e].sonAlim ? new Date(g[e].sonAlim).toDateString() : null;
  const dun = new Date(Date.now() - 86400000).toDateString();

  if (son === bugun) { toast('Bugünkü ödülünü aldın'); return; }

  if (son === dun) g[e].streak = (g[e].streak || 0) + 1;
  else g[e].streak = 1;
  g[e].sonAlim = Date.now();
  dbYaz(DB.gunluk, g);

  const xp = 50 + (g[e].streak - 1) * 25;
  xpEkle(e, xp);

  const k = dbAl(DB.kul, {});
  if (k[e]) { k[e].streak = g[e].streak; dbYaz(DB.kul, k); }

  document.getElementById('gunlukNokta').style.display = 'none';
  toast(`🎁 Günlük ödül: +${xp} XP (${g[e].streak} gün)`);
  basariKontrol();
  sayfaGuncelle();
}

// ============ AUTH ============
let authMod = 'login';

function authModDegistir(mod) {
  authMod = mod;
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('aktif', b.dataset.mod === mod));
  document.getElementById('girdiKullanici').style.display = mod === 'register' ? 'flex' : 'none';
  document.getElementById('authButon').textContent = mod === 'register' ? 'KAYIT OL' : 'GİRİŞ YAP';
  document.getElementById('altYazi').textContent = mod === 'register' ? 'Hesabın var mı?' : 'Hesabın yok mu?';
  document.getElementById('altLink').textContent = mod === 'register' ? 'Giriş yap' : 'Kayıt ol';
  document.getElementById('authHata').textContent = '';
}

document.querySelectorAll('.auth-tab').forEach(b => b.onclick = () => authModDegistir(b.dataset.mod));
document.getElementById('altLink').onclick = (e) => {
  e.preventDefault();
  authModDegistir(authMod === 'register' ? 'login' : 'register');
};
document.getElementById('gozBtn').onclick = () => {
  const i = document.getElementById('fSifre');
  const ik = document.getElementById('gozIkon');
  if (i.type === 'password') { i.type = 'text'; ik.className = 'fa-solid fa-eye-slash'; }
  else { i.type = 'password'; ik.className = 'fa-solid fa-eye'; }
};

document.getElementById('authForm').onsubmit = async (e) => {
  e.preventDefault();
  const hata = document.getElementById('authHata');
  const btn = document.getElementById('authButon');
  hata.textContent = '';

  const email = document.getElementById('fEmail').value.trim().toLowerCase();
  const sifre = document.getElementById('fSifre').value;
  const kadi = document.getElementById('fKullanici').value.trim();

  if (authMod === 'register') {
    if (!kadi || kadi.length < 3) { hata.textContent = 'Kullanıcı adı en az 3 karakter.'; return; }
    if (!/^[\w.\-+]+@[\w\-]+\.[\w.\-]+$/.test(email)) { hata.textContent = 'Geçersiz e-posta.'; return; }
    if (sifre.length < 6) { hata.textContent = 'Şifre en az 6 karakter.'; return; }

    const k = dbAl(DB.kul, {});
    if (k[email]) { hata.textContent = 'Bu e-posta zaten kayıtlı.'; return; }

    btn.disabled = true; btn.textContent = 'KAYIT EDİLİYOR...';
    k[email] = {
      kadi, email, sifreHash: await sha256(sifre), tarih: Date.now(),
      xp: 0, vipBitis: null, bio: '', pp: null, banner: null,
      favoriler: [], streak: 0,
    };
    dbYaz(DB.kul, k);
    btn.disabled = false; btn.textContent = 'KAYIT OL';
    hata.style.color = '#4ade80';
    hata.textContent = 'Kayıt başarılı!';
    setTimeout(() => girisYap(email), 600);
  } else {
    if (!email || !sifre) { hata.textContent = 'Alanları doldur.'; return; }
    const k = dbAl(DB.kul, {});
    if (!k[email]) { hata.textContent = 'Bu e-posta kayıtlı değil.'; return; }

    btn.disabled = true; btn.textContent = 'GİRİŞ YAPILIYOR...';
    if (k[email].sifreHash !== await sha256(sifre)) {
      btn.disabled = false; btn.textContent = 'GİRİŞ YAP';
      hata.textContent = 'Şifre yanlış.'; return;
    }
    btn.disabled = false; btn.textContent = 'GİRİŞ YAP';
    girisYap(email);
  }
};

function girisYap(email) {
  const k = dbAl(DB.kul, {});
  const u = k[email];
  if (!u) return;
  if (!u.email) { u.email = email; dbYaz(DB.kul, k); }
  if (!u.favoriler) u.favoriler = [];
  aktifKullanici = { email };

  const girisler = dbAl(DB.girisler, []);
  girisler.unshift({ email, kadi: u.kadi, pp: u.pp, rol: rolHesapla(u, email), zaman: Date.now() });
  dbYaz(DB.girisler, girisler.slice(0, 40));

  document.getElementById('authEkran').style.display = 'none';
  document.getElementById('site').style.display = 'block';

  siteGuncelle();
  sayfaDegistir('anasayfa');
  gunlukKontrol();
  toast(`Hoş geldin, ${u.kadi}`);
}

function cikisYap() {
  aktifKullanici = null;
  document.getElementById('site').style.display = 'none';
  document.getElementById('authEkran').style.display = 'flex';
  document.getElementById('authForm').reset();
  document.getElementById('authHata').textContent = '';
  document.getElementById('sidebar').classList.remove('acik');
  document.getElementById('sidebarOverlay').classList.remove('acik');
}
document.getElementById('cikisBtn').onclick = cikisYap;

// ============ SİTE GÜNCELLE ============
function siteGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const rol = rolHesapla(u, aktifKullanici.email);
  const { level } = levelHesapla(u.xp || 0);

  document.getElementById('sbAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('sbAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('sbIsim').textContent = u.kadi;
  document.getElementById('sbRol').textContent = rol === 'admin' ? 'Yönetici' : (rol === 'vip' ? 'VIP Üyelik' : 'Ücretsiz Üyelik');
  document.getElementById('sbRank').textContent = rankHesapla(level);

  document.getElementById('topbarAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('topbarAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('tpIsim').textContent = u.kadi;
  document.getElementById('tpRol').textContent = rolEtiket(rol);

  document.getElementById('welcomeAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('welcomeAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('welcomeIsim').textContent = u.kadi;
  const rz = document.getElementById('welcomeRozet');
  rz.textContent = rolEtiket(rol); rz.dataset.rol = rol;
  document.getElementById('welcomeRank').textContent = rankHesapla(level);
  document.getElementById('streak').querySelector('b').textContent = u.streak || 0;

  document.getElementById('menuAdmin').style.display = rol === 'admin' ? 'flex' : 'none';

  sbXpGuncelle();
  istGuncelle();
  feedGirislerGuncelle();
  feedAktiviteTamGuncelle();
  liderlikTamGuncelle();
  duyuruGuncelle();
  profilSayfaGuncelle();
  adminGuncelle();
  favorilerGuncelle();
  sonKullanimGuncelle();
  basariGridGuncelle();
}

function sayfaGuncelle() { if (aktifKullanici) siteGuncelle(); }

function sbXpGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;
  const { level, mevcut, gerekli } = levelHesapla(u.xp || 0);
  document.getElementById('sbLevel').textContent = level;
  document.getElementById('sbRank').textContent = rankHesapla(level);
  document.getElementById('sbXpYazi').textContent = `${mevcut}/${gerekli}`;
  document.getElementById('sbXpDolgu').style.width = `${(mevcut / gerekli) * 100}%`;
  document.getElementById('istLevel').textContent = `LVL ${level}`;
}

function istGuncelle() {
  const k = dbAl(DB.kul, {});
  sayiAnimasyon(document.getElementById('istKayitli'), Object.keys(k).length);

  const girisler = dbAl(DB.girisler, []);
  const bes = Date.now() - 5 * 60 * 1000;
  const aktifler = new Set(girisler.filter(g => g.zaman > bes).map(g => g.email));
  sayiAnimasyon(document.getElementById('istAktif'), Math.max(1, aktifler.size));
  sayiAnimasyon(document.getElementById('istSorgu'), dbAl(DB.sorgular, []).length);
}

function feedGirislerGuncelle() {
  const ul = document.getElementById('feedGirisler');
  if (!ul) return;
  const girisler = dbAl(DB.girisler, []).slice(0, 15);
  if (!girisler.length) { ul.innerHTML = '<li class="bos-feed">Henüz giriş yok.</li>'; return; }
  ul.innerHTML = '';
  girisler.forEach(g => {
    const li = document.createElement('li');
    const bas = g.kadi[0].toUpperCase();
    const rol = g.rol || 'member';
    li.innerHTML = `
      <div class="feed-avatar">${g.pp ? '' : bas}</div>
      <div class="feed-içerik">
        <b class="isim-${rol}">${g.kadi}</b>
        <span class="rozet" data-rol="${rol}" style="font-size:.55rem;padding:.15rem .4rem;">${rolEtiket(rol)}</span>
      </div>
      <span class="feed-saat">${saatFormat(g.zaman)}</span>
    `;
    const av = li.querySelector('.feed-avatar');
    if (g.pp) av.style.backgroundImage = `url(${g.pp})`;
    av.onclick = () => profilGoster(g.email);
    ul.appendChild(li);
  });
}

function feedAktiviteTamGuncelle() {
  const ul = document.getElementById('feedAktiviteTam');
  if (!ul) return;
  let sorgular = dbAl(DB.sorgular, []);
  const k = dbAl(DB.kul, {});

  if (aktifAktiviteFiltre !== 'hepsi') {
    sorgular = sorgular.filter(s => {
      const r = k[s.email] ? rolHesapla(k[s.email], s.email) : 'member';
      return r === aktifAktiviteFiltre;
    });
  }

  if (!sorgular.length) { ul.innerHTML = '<li class="bos-feed">Bu filtrede sonuç yok.</li>'; return; }
  ul.innerHTML = '';
  sorgular.forEach(s => {
    const li = document.createElement('li');
    const bas = s.kadi[0].toUpperCase();
    const sRol = k[s.email] ? rolHesapla(k[s.email], s.email) : 'member';
    li.innerHTML = `
      <div class="feed-avatar">${s.pp ? '' : bas}</div>
      <div class="feed-içerik">
        <b class="isim-${sRol}">${s.kadi}</b>
        <span>"${s.arac}" sorgusu yaptı</span>
      </div>
      <span class="feed-xp">+${s.xp} XP</span>
      <span class="feed-saat">${saatFormat(s.zaman)}</span>
    `;
    const av = li.querySelector('.feed-avatar');
    if (s.pp) av.style.backgroundImage = `url(${s.pp})`;
    av.onclick = () => profilGoster(s.email);
    ul.appendChild(li);
  });
}

document.querySelectorAll('.af-btn').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.af-btn').forEach(x => x.classList.remove('aktif'));
    b.classList.add('aktif');
    aktifAktiviteFiltre = b.dataset.filtre;
    feedAktiviteTamGuncelle();
  };
});

function liderlikTamGuncelle() {
  const ul = document.getElementById('liderlikTam');
  if (!ul) return;
  const k = dbAl(DB.kul, {});
  const liste = Object.values(k)
    .map(u => ({ ...u, level: levelHesapla(u.xp || 0).level, xp: u.xp || 0 }))
    .sort((a, b) => b.xp - a.xp);

  if (!liste.length) { ul.innerHTML = '<li class="bos-feed">Henüz kimse yok.</li>'; return; }
  ul.innerHTML = '';
  liste.forEach((u, i) => {
    const li = document.createElement('li');
    const rol = rolHesapla(u, u.email);
    li.innerHTML = `
      <span class="lr-sira">${i + 1}</span>
      <span class="lr-isim isim-${rol}">${u.kadi}</span>
      <span class="lr-level">${rankHesapla(u.level)} · LVL ${u.level}</span>
      <span class="lr-xp">${u.xp} XP</span>
    `;
    ul.appendChild(li);
  });
}

function duyuruGuncelle() {
  const ul = document.getElementById('duyuruListe');
  if (!ul) return;
  const d = dbAl(DB.duyuru, []);
  if (!d.length) { ul.innerHTML = '<li class="bos-feed">Henüz duyuru yok.</li>'; return; }
  ul.innerHTML = '';
  d.forEach(x => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="duyuru-ikon"><i class="fa-solid fa-bullhorn"></i></div>
      <div style="flex:1;min-width:0;">
        <div class="duyuru-baslik">${x.baslik}</div>
        ${x.icerik ? `<div class="duyuru-icerik">${x.icerik}</div>` : ''}
        <div class="duyuru-tarih">${tarihFormat(x.zaman)}</div>
      </div>
    `;
    ul.appendChild(li);
  });
}

function saatFormat(t) { return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
function tarihFormat(t) { return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

// ============ FAVORİLER ============
function favorilerGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const fav = u.favoriler || [];
  const grup = document.getElementById('favoriGrup');
  const liste = document.getElementById('favoriListe');
  if (!fav.length) { grup.style.display = 'none'; return; }
  grup.style.display = 'block';
  liste.innerHTML = '';
  fav.forEach(id => {
    const t = TOOLS[id];
    if (!t) return;
    const btn = document.createElement('button');
    btn.className = 'menu-kategori';
    btn.innerHTML = `<i class="${t.ikon && t.ikon.includes('fa') ? t.ikon : 'fa-solid fa-star'}"></i><span>${t.ad}</span>`;
    btn.onclick = () => { aracAc(id); kapatMobil(); };
    liste.appendChild(btn);
  });
}

// ============ SON KULLANILANLAR ============
function sonKullanimGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const son = u.sonAraclar || [];
  const grup = document.getElementById('sonGrup');
  const liste = document.getElementById('sonListe');
  if (!son.length) { grup.style.display = 'none'; return; }
  grup.style.display = 'block';
  liste.innerHTML = '';
  son.slice(0, 5).forEach(id => {
    const t = TOOLS[id];
    if (!t) return;
    const btn = document.createElement('button');
    btn.className = 'menu-kategori';
    btn.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i><span>${t.ad}</span>`;
    btn.onclick = () => { aracAc(id); kapatMobil(); };
    liste.appendChild(btn);
  });
}

function sonEkle(id) {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u.sonAraclar) u.sonAraclar = [];
  u.sonAraclar = [id, ...u.sonAraclar.filter(x => x !== id)].slice(0, 10);
  dbYaz(DB.kul, k);
  sonKullanimGuncelle();
}

// ============ BAŞARI GRID ============
function basariGridGuncelle() {
  const grid = document.getElementById('basariGrid');
  const gridModal = document.getElementById('basariGridModal');
  const b = dbAl(DB.basarimlar, {});
  const kazanilan = b[aktifKullanici.email] || [];

  function olustur() {
    let html = '';
    BASARIMLAR.forEach(x => {
      const kilitli = !kazanilan.includes(x.id);
      html += `
        <div class="basari-kart ${kilitli ? 'kilitli' : ''}">
          <div class="basari-ikon">${x.ikon}</div>
          <div class="basari-ad">${x.ad}</div>
          <div class="basari-acik">${x.acik}</div>
        </div>
      `;
    });
    return html;
  }

  if (grid) grid.innerHTML = olustur();
  if (gridModal) gridModal.innerHTML = olustur();
}

// ============ SIDEBAR ============
const sidebar = document.getElementById('sidebar');
const sbOverlay = document.getElementById('sidebarOverlay');
const site = document.getElementById('site');

document.getElementById('menuBtn').onclick = () => {
  const mobil = window.innerWidth < 900;
  if (mobil) {
    sidebar.classList.toggle('acik');
    sbOverlay.classList.toggle('acik');
  } else {
    const g = sidebar.classList.toggle('gizli');
    site.classList.toggle('sb-gizli', g);
  }
};

function kapatMobil() {
  if (window.innerWidth < 900) {
    sidebar.classList.remove('acik');
    sbOverlay.classList.remove('acik');
  }
}
sbOverlay.onclick = kapatMobil;

// ============ SAYFA GEÇİŞ ============
document.querySelectorAll('.menu-item').forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.sayfa) { sayfaDegistir(btn.dataset.sayfa); kapatMobil(); }
  };
});

document.querySelectorAll('.mn-item').forEach(btn => {
  btn.onclick = () => {
    const s = btn.dataset.sayfa;
    if (s === 'araclar') { aracKategoriGoster(); }
    else sayfaDegistir(s);
    document.querySelectorAll('.mn-item').forEach(x => x.classList.remove('aktif'));
    btn.classList.add('aktif');
  };
});

function sayfaDegistir(ad) {
  document.querySelectorAll('.sayfa').forEach(s => s.classList.remove('aktif'));
  const hedef = document.getElementById('sayfa-' + ad);
  if (hedef) hedef.classList.add('aktif');

  document.querySelectorAll('.menu-item').forEach(b => {
    b.classList.toggle('aktif', b.dataset.sayfa === ad);
  });

  if (ad === 'profil') profilSayfaGuncelle();
  if (ad === 'admin') adminGuncelle();
  if (ad === 'aktivite') feedAktiviteTamGuncelle();
  if (ad === 'basari') basariGridGuncelle();
}

function aracKategoriGoster() {
  // İlk kategoriye git
  const ilk = Object.entries(TOOLS)[0];
  if (ilk) aracAc(ilk[0]);
}

// ============ KATEGORİ ============
document.querySelectorAll('.menu-kategori').forEach(btn => {
  btn.onclick = () => {
    const kat = btn.dataset.kategori;
    if (!kat) return;
    const araclar = Object.entries(TOOLS).filter(([_, t]) => t.kategori === kat);
    if (!araclar.length) { toast('Bu kategoride araç yok.'); return; }
    aracAc(araclar[0][0]);
    kapatMobil();
  };
});

// ============ ARAÇ ============
function aracAc(id) {
  const t = TOOLS[id];
  if (!t) return;
  aktifArac = id;

  document.querySelectorAll('.sayfa').forEach(s => s.classList.remove('aktif'));
  document.getElementById('sayfa-arac').classList.add('aktif');

  document.getElementById('aracIkon').textContent = t.ikon || '🔧';
  document.getElementById('aracBaslik').textContent = t.ad;
  document.getElementById('aracAciklama').textContent = t.aciklama || '';

  const girdiler = document.getElementById('aracGirdiler');
  girdiler.innerHTML = '';
  (t.girdiler || []).forEach(g => {
    const div = document.createElement('div');
    div.className = 'arac-girdi';
    let inp;
    if (g.tip === 'textarea') {
      inp = `<textarea id="a_${g.ad}" placeholder="${g.placeholder || ''}">${g.varsayilan || ''}</textarea>`;
    } else {
      inp = `<input type="${g.tip || 'text'}" id="a_${g.ad}" placeholder="${g.placeholder || ''}" value="${g.varsayilan || ''}">`;
    }
    div.innerHTML = `<label>${g.etiket || g.ad}</label>${inp}`;
    girdiler.appendChild(div);
  });

  // Favori kontrol
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const fav = u.favoriler || [];
  const fb = document.getElementById('favBtn');
  if (fav.includes(id)) fb.classList.add('aktif');
  else fb.classList.remove('aktif');

  document.getElementById('aracSonucKart').style.display = 'none';
  document.getElementById('aracSonuc').innerHTML = '';
  sonSonuc = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('aracGeri').onclick = () => sayfaDegistir('anasayfa');

// Favori toggle
document.getElementById('favBtn').onclick = () => {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u.favoriler) u.favoriler = [];
  const i = u.favoriler.indexOf(aktifArac);
  if (i >= 0) { u.favoriler.splice(i, 1); toast('Favoriden çıkarıldı'); }
  else { u.favoriler.push(aktifArac); toast('Favorilere eklendi'); }
  dbYaz(DB.kul, k);

  const fb = document.getElementById('favBtn');
  if (u.favoriler.includes(aktifArac)) fb.classList.add('aktif');
  else fb.classList.remove('aktif');

  favorilerGuncelle();
  basariKontrol();
};

// Araç çalıştır
document.getElementById('aracCalistir').onclick = async () => {
  const t = TOOLS[aktifArac];
  if (!t) return;
  const p = {};
  (t.girdiler || []).forEach(g => {
    const el = document.getElementById('a_' + g.ad);
    if (el) p[g.ad] = el.value;
  });

  const btn = document.getElementById('aracCalistir');
  const kart = document.getElementById('aracSonucKart');
  const sonuc = document.getElementById('aracSonuc');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SORGULANIYOR...';
  kart.style.display = 'block';
  sonuc.innerHTML = '<div class="skeleton" style="height:100px;"></div>';

  try {
    const s = await t.calistir(p);
    sonSonuc = s;
    sonuc.innerHTML = sonucGoster(s);

    if (!s || !s.hata) {
      const xp = Math.floor(Math.random() * 11) + 10;
      xpEkle(aktifKullanici.email, xp);

      const k = dbAl(DB.kul, {});
      const u = k[aktifKullanici.email];
      const sorgular = dbAl(DB.sorgular, []);
      sorgular.unshift({
        email: aktifKullanici.email, kadi: u.kadi, pp: u.pp,
        arac: t.ad, xp, zaman: Date.now(),
      });
      dbYaz(DB.sorgular, sorgular.slice(0, 40));

      sonEkle(aktifArac);
      feedAktiviteTamGuncelle();
      istGuncelle();
      profilGecmisGuncelle();
      toast(`+${xp} XP kazandın`);
      basariKontrol();
    }
  } catch (e) {
    sonuc.innerHTML = `<div class="sonuc-hata">Hata: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> ÇALIŞTIR';
  }
};

// Sonuç kopyala
document.getElementById('sonucKopyala').onclick = () => {
  if (!sonSonuc) return;
  const metin = typeof sonSonuc === 'object' ? JSON.stringify(sonSonuc, null, 2) : String(sonSonuc);
  navigator.clipboard.writeText(metin).then(() => toast('Sonuç kopyalandı'));
};

// Sonuç indir
document.getElementById('sonucIndir').onclick = () => {
  if (!sonSonuc) return;
  const blob = new Blob([JSON.stringify(sonSonuc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `den1zz-${aktifArac}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('İndirildi');
};

function sonucGoster(s) {
  if (!s) return '<div class="bos-feed">Boş sonuç.</div>';
  if (typeof s === 'string') return `<div class="sonuc-item"><div class="sonuc-val">${s}</div></div>`;
  if (s.hata) return `<div class="sonuc-hata">${s.hata}</div>`;

  if (typeof s === 'object' && !Array.isArray(s)) {
    let html = '<div class="sonuc-grid">';
    for (const [k, v] of Object.entries(s)) {
      const val = typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v);
      html += `
        <div class="sonuc-item">
          <div class="sonuc-key">${k}</div>
          <div class="sonuc-val">${val.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }
  return `<div class="sonuc-item"><div class="sonuc-val">${JSON.stringify(s)}</div></div>`;
}

// ============ PROFİL SAYFA ============
function profilSayfaGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;
  const rol = rolHesapla(u, aktifKullanici.email);
  const { level } = levelHesapla(u.xp || 0);

  const banner = document.getElementById('profilBanner');
  banner.style.background = u.banner ? `url(${u.banner}) center/cover` : 'linear-gradient(135deg, #2a2a2a, #0a0a0a)';

  const av = document.getElementById('profilAvatar');
  av.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  av.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  document.getElementById('profilIsim').textContent = u.kadi;
  const r = document.getElementById('profilRozet');
  r.textContent = rolEtiket(rol); r.dataset.rol = rol;
  document.getElementById('profilRank').textContent = rankHesapla(level);

  document.getElementById('profilMail').textContent = u.email === ADMIN_EMAIL ? '●●●●●●●● (gizli)' : u.email;
  document.getElementById('profilBio').textContent = u.bio || 'Henüz bio eklenmemiş.';
  document.getElementById('profilLevel').textContent = level;
  document.getElementById('profilXp').textContent = u.xp || 0;
  document.getElementById('profilTarih').textContent = u.tarih ? new Date(u.tarih).toLocaleDateString('tr-TR') : '—';

  profilGecmisGuncelle();
  kisiselIstGuncelle();
}

function kisiselIstGuncelle() {
  const e = aktifKullanici.email;
  const sorgular = dbAl(DB.sorgular, []).filter(s => s.email === e);
  sayiAnimasyon(document.getElementById('kiToplam'), sorgular.length);

  const sayac = {};
  sorgular.forEach(s => { sayac[s.arac] = (sayac[s.arac] || 0) + 1; });
  const enCok = Object.entries(sayac).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('kiEnCok').textContent = enCok ? enCok[0].slice(0, 20) : '—';

  const bugun = new Date().toDateString();
  const bugunSayi = sorgular.filter(s => new Date(s.zaman).toDateString() === bugun).length;
  sayiAnimasyon(document.getElementById('kiBugun'), bugunSayi);

  const b = dbAl(DB.basarimlar, {});
  sayiAnimasyon(document.getElementById('kiRozet'), (b[e] || []).length);
}

function profilGecmisGuncelle() {
  const ul = document.getElementById('profilGecmis');
  if (!ul) return;
  const sorgular = dbAl(DB.sorgular, []).filter(s => s.email === aktifKullanici.email).slice(0, 10);
  if (!sorgular.length) { ul.innerHTML = '<li class="bos-feed">Henüz sorgu yapmadın.</li>'; return; }
  ul.innerHTML = '';
  sorgular.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="feed-avatar"><i class="fa-solid fa-bolt"></i></div>
      <div class="feed-içerik"><b>${s.arac}</b></div>
      <span class="feed-xp">+${s.xp} XP</span>
      <span class="feed-saat">${saatFormat(s.zaman)}</span>
    `;
    ul.appendChild(li);
  });
}

// ============ PROFİL GÖR ============
function profilGoster(email) {
  const k = dbAl(DB.kul, {});
  const u = k[email];
  if (!u) return;
  const rol = rolHesapla(u, email);
  const { level } = levelHesapla(u.xp || 0);

  const banner = document.getElementById('pmBanner');
  banner.style.background = u.banner ? `url(${u.banner}) center/cover` : 'linear-gradient(135deg, #2a2a2a, #0a0a0a)';

  const av = document.getElementById('pmAvatar');
  av.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  av.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  document.getElementById('pmIsim').textContent = u.kadi;
  const r = document.getElementById('pmRozet');
  r.textContent = rolEtiket(rol); r.dataset.rol = rol;

  document.getElementById('pmMail').textContent = email === ADMIN_EMAIL ? '●●●●●●●● (gizli)' : email;
  document.getElementById('pmBio').textContent = u.bio || 'Bio yok.';
  document.getElementById('pmLevel').textContent = level;
  document.getElementById('pmXp').textContent = u.xp || 0;

  document.getElementById('profilArka').classList.add('acik');
  document.getElementById('profilModal').classList.add('acik');
}

document.getElementById('pmKapat').onclick = () => {
  document.getElementById('profilArka').classList.remove('acik');
  document.getElementById('profilModal').classList.remove('acik');
};
document.getElementById('profilArka').onclick = () => document.getElementById('pmKapat').click();

// ============ PROFİL DÜZENLE ============
document.getElementById('profilDuzenleBtn').onclick = () => profilDuzenleAc();

function profilDuzenleAc() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;
  secilenFoto = null; secilenBanner = null;

  const av = document.getElementById('modalAvatar');
  av.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  av.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  const bn = document.getElementById('modalBanner');
  bn.style.backgroundImage = u.banner ? `url(${u.banner})` : '';

  document.getElementById('modalIsim').value = u.kadi;
  document.getElementById('modalBio').value = u.bio || '';
  document.getElementById('modalMail').value = '';
  document.getElementById('modalSifre').value = '';
  document.getElementById('modalMesaj').textContent = '';

  document.getElementById('modalArka').classList.add('acik');
  document.getElementById('modal').classList.add('acik');
}

document.getElementById('modalKapat').onclick = () => {
  document.getElementById('modalArka').classList.remove('acik');
  document.getElementById('modal').classList.remove('acik');
};
document.getElementById('modalArka').onclick = () => document.getElementById('modalKapat').click();

document.getElementById('fotoInput').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    secilenFoto = ev.target.result;
    const av = document.getElementById('modalAvatar');
    av.textContent = ''; av.style.backgroundImage = `url(${secilenFoto})`;
  };
  r.readAsDataURL(f);
};

document.getElementById('bannerInput').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    secilenBanner = ev.target.result;
    document.getElementById('modalBanner').style.backgroundImage = `url(${secilenBanner})`;
  };
  r.readAsDataURL(f);
};

document.getElementById('modalKaydet').onclick = async () => {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;

  const mesaj = document.getElementById('modalMesaj');
  const yeniIsim = document.getElementById('modalIsim').value.trim();
  const yeniBio = document.getElementById('modalBio').value.trim();
  const yeniMail = document.getElementById('modalMail').value.trim().toLowerCase();
  const sifreOnay = document.getElementById('modalSifre').value;

  mesaj.style.color = ''; mesaj.textContent = '';

  if (secilenFoto) u.pp = secilenFoto;
  if (secilenBanner) u.banner = secilenBanner;
  if (yeniIsim && yeniIsim.length >= 3) u.kadi = yeniIsim;
  u.bio = yeniBio;

  if (yeniMail && yeniMail !== aktifKullanici.email) {
    if (!sifreOnay) { mesaj.style.color = '#f87171'; mesaj.textContent = 'E-posta için şifre gerekli.'; return; }
    if (await sha256(sifreOnay) !== u.sifreHash) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Şifre yanlış.'; return; }
    if (!/^[\w.\-+]+@[\w\-]+\.[\w.\-]+$/.test(yeniMail)) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Geçersiz e-posta.'; return; }
    if (k[yeniMail]) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Bu e-posta kullanılıyor.'; return; }
    k[yeniMail] = u;
    delete k[aktifKullanici.email];
    aktifKullanici.email = yeniMail;
  }

  dbYaz(DB.kul, k);
  mesaj.style.color = '#4ade80';
  mesaj.textContent = 'Profil güncellendi!';
  toast('Profil güncellendi');
  basariKontrol();
  setTimeout(() => {
    document.getElementById('modalKapat').click();
    siteGuncelle();
  }, 800);
};

// ============ ADMIN ============
function adminGuncelle() {
  const k = dbAl(DB.kul, {});
  sayiAnimasyon(document.getElementById('apUye'), Object.keys(k).length);
  let vip = 0;
  Object.values(k).forEach(u => { if (rolHesapla(u, u.email) === 'vip') vip++; });
  sayiAnimasyon(document.getElementById('apVip'), vip);
  sayiAnimasyon(document.getElementById('apSorgu'), dbAl(DB.sorgular, []).length);
  adminListeGuncelle();
}

document.getElementById('vipVerBtn').onclick = () => {
  const nick = document.getElementById('vipNick').value.trim().replace(/^@/, '');
  const sure = parseInt(document.getElementById('vipSure').value);
  const msg = document.getElementById('vipMesaj');
  msg.style.color = '';

  if (!nick) { msg.style.color = '#f87171'; msg.textContent = 'Kullanıcı adı gir.'; return; }

  const k = dbAl(DB.kul, {});
  const u = Object.values(k).find(x => x.kadi.toLowerCase() === nick.toLowerCase());
  if (!u) { msg.style.color = '#f87171'; msg.textContent = 'Kullanıcı bulunamadı.'; return; }

  u.vipBitis = Date.now() + sure * 24 * 60 * 60 * 1000;
  dbYaz(DB.kul, k);
  msg.style.color = '#4ade80';
  msg.textContent = `✓ ${u.kadi} → ${sure} gün VIP`;
  document.getElementById('vipNick').value = '';
  adminGuncelle();
  toast(`${u.kadi} VIP yapıldı`);
};

document.getElementById('duyuruEkleBtn').onclick = () => {
  const baslik = document.getElementById('duyuruBaslik').value.trim();
  const icerik = document.getElementById('duyuruIcerik').value.trim();
  const msg = document.getElementById('duyuruMesaj');
  msg.style.color = '';

  if (!baslik) { msg.style.color = '#f87171'; msg.textContent = 'Başlık gir.'; return; }

  const d = dbAl(DB.duyuru, []);
  d.unshift({ id: Date.now(), baslik, icerik, zaman: Date.now() });
  dbYaz(DB.duyuru, d);
  msg.style.color = '#4ade80';
  msg.textContent = '✓ Duyuru yayınlandı';
  document.getElementById('duyuruBaslik').value = '';
  document.getElementById('duyuruIcerik').value = '';
  duyuruGuncelle();
  toast('Duyuru yayınlandı');
};

document.getElementById('adminArama').addEventListener('input', adminListeGuncelle);

function adminListeGuncelle() {
  const ul = document.getElementById('adminListe');
  const k = dbAl(DB.kul, {});
  const q = (document.getElementById('adminArama').value || '').toLowerCase();
  ul.innerHTML = '';
  Object.entries(k).forEach(([email, u]) => {
    if (q && !u.kadi.toLowerCase().includes(q) && !email.includes(q)) return;
    const rol = rolHesapla(u, email);
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="admin-avatar">${u.pp ? '' : u.kadi[0].toUpperCase()}</div>
      <span class="admin-isim isim-${rol}">${u.kadi}</span>
      <span class="rozet" data-rol="${rol}" style="font-size:.55rem;padding:.15rem .4rem;">${rolEtiket(rol)}</span>
    `;
    const av = li.querySelector('.admin-avatar');
    if (u.pp) av.style.backgroundImage = `url(${u.pp})`;
    ul.appendChild(li);
  });
  if (!ul.children.length) ul.innerHTML = '<li class="bos-feed">Kullanıcı yok.</li>';
}

// ============ ARAMA MODAL ============
const aramaModal = document.getElementById('aramaModal');
const aramaArka = document.getElementById('aramaArka');
const aramaInput = document.getElementById('aramaInput');
const aramaSonuc = document.getElementById('aramaSonuc');

function aramaAc() {
  aramaModal.classList.add('acik');
  aramaArka.classList.add('acik');
  aramaInput.value = '';
  aramaSonuc.innerHTML = '';
  aramaSonuclari = [];
  aramaSeciliIndex = 0;
  setTimeout(() => aramaInput.focus(), 100);
  aramaYap('');
}

function aramaKapat() {
  aramaModal.classList.remove('acik');
  aramaArka.classList.remove('acik');
}

document.getElementById('aramaAcBtn').onclick = aramaAc;
aramaArka.onclick = aramaKapat;

aramaInput.oninput = () => aramaYap(aramaInput.value);

function aramaYap(q) {
  q = q.toLowerCase().trim();
  aramaSonuclari = Object.entries(TOOLS)
    .filter(([_, t]) => !q || t.ad.toLowerCase().includes(q) || (t.kategori || '').toLowerCase().includes(q))
    .slice(0, 12)
    .map(([id, t]) => ({ id, ...t }));
  aramaSeciliIndex = 0;
  aramaGoster();
}

function aramaGoster() {
  if (!aramaSonuclari.length) {
    aramaSonuc.innerHTML = '<div class="arama-bos">Sonuç bulunamadı</div>';
    return;
  }
  aramaSonuc.innerHTML = '';
  aramaSonuclari.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'arama-item' + (i === aramaSeciliIndex ? ' secili' : '');
    div.innerHTML = `
      <div class="arama-item-ikon">${t.ikon || '🔧'}</div>
      <div class="arama-item-bilgi">
        <div class="arama-item-ad">${t.ad}</div>
        <div class="arama-item-kat">${t.kategori || ''}</div>
      </div>
    `;
    div.onclick = () => { aracAc(t.id); aramaKapat(); };
    aramaSonuc.appendChild(div);
  });
}

aramaInput.onkeydown = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    aramaSeciliIndex = Math.min(aramaSeciliIndex + 1, aramaSonuclari.length - 1);
    aramaGoster();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    aramaSeciliIndex = Math.max(aramaSeciliIndex - 1, 0);
    aramaGoster();
  } else if (e.key === 'Enter') {
    const t = aramaSonuclari[aramaSeciliIndex];
    if (t) { aracAc(t.id); aramaKapat(); }
  } else if (e.key === 'Escape') {
    aramaKapat();
  }
};

// ============ GÜNLÜK MODAL ============
document.getElementById('gunlukBtn').onclick = () => {
  const g = dbAl(DB.gunluk, {});
  const e = aktifKullanici.email;
  const bilgi = g[e] || { sonAlim: 0, streak: 0 };
  const bugun = new Date().toDateString();
  const son = bilgi.sonAlim ? new Date(bilgi.sonAlim).toDateString() : null;
  const alindi = son === bugun;

  const sonrakiStreak = (son === new Date(Date.now() - 86400000).toDateString() ? bilgi.streak + 1 : 1);
  const odul = 50 + (sonrakiStreak - 1) * 25;

  document.getElementById('gunlukIcerik').innerHTML = `
    <div class="gunluk-seri">🔥 ${bilgi.streak || 0}</div>
    <div class="gunluk-yazi">${alindi ? 'Bugünkü ödülünü aldın. Yarın yine gel!' : `Bugünkü ödülün: <b style="color:#fff">+${odul} XP</b>`}</div>
    <button class="gunluk-buton" id="gunlukAlBtn" ${alindi ? 'disabled' : ''}>${alindi ? 'YARIN GEL' : 'ÖDÜLÜ AL'}</button>
  `;

  document.getElementById('gunlukArka').classList.add('acik');
  document.getElementById('gunlukModal').classList.add('acik');

  const btn = document.getElementById('gunlukAlBtn');
  if (btn && !alindi) {
    btn.onclick = () => { gunlukAl(); document.getElementById('gunlukKapat').click(); };
  }
};

document.getElementById('gunlukKapat').onclick = () => {
  document.getElementById('gunlukArka').classList.remove('acik');
  document.getElementById('gunlukModal').classList.remove('acik');
};
document.getElementById('gunlukArka').onclick = () => document.getElementById('gunlukKapat').click();

// ============ BAŞARI MODAL ============
document.getElementById('basariBtn').onclick = () => {
  basariGridGuncelle();
  document.getElementById('basariArka').classList.add('acik');
  document.getElementById('basariModal').classList.add('acik');
};
document.getElementById('basariKapat').onclick = () => {
  document.getElementById('basariArka').classList.remove('acik');
  document.getElementById('basariModal').classList.remove('acik');
};
document.getElementById('basariArka').onclick = () => document.getElementById('basariKapat').click();

// ============ YUKARI ÇIK ============
const yukari = document.getElementById('yukari');
window.addEventListener('scroll', () => {
  if (window.scrollY > 400) yukari.classList.add('acik');
  else yukari.classList.remove('acik');
});
yukari.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

// ============ KISAYOLLAR ============
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    aramaAc();
  }
  if (e.key === 'Escape') {
    aramaKapat();
  }
  // Sayı kısayolları (input odaklı değilse)
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  const sayfaKisayol = { '1': 'anasayfa', '2': 'liderlik', '3': 'duyurular', '4': 'aktivite', '5': 'profil' };
  if (sayfaKisayol[e.key]) sayfaDegistir(sayfaKisayol[e.key]);
});

// ============ STORAGE EVENT ============
window.addEventListener('storage', (e) => {
  if (!aktifKullanici) return;
  if ([DB.kul, DB.duyuru, DB.girisler, DB.sorgular, DB.basarimlar].includes(e.key)) {
    siteGuncelle();
  }
});

// ============ BAŞLAT ============
(function baslat() {
  authModDegistir('login');
})();
