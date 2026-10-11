// Den1zz v17 — Canlı aktivite ayrı sayfa, isim renkleri

const ADMIN_EMAIL = 'gizlihesap40444@gmail.com';
const DB = {
  kul: 'den1zz_kullanicilar',
  duyuru: 'den1zz_duyurular',
  girisler: 'den1zz_girisler',
  sorgular: 'den1zz_sorgular',
};

let aktifKullanici = null;
let secilenFoto = null;
let secilenBanner = null;
let aktifArac = null;

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
    if (yeni > eski) setTimeout(() => toast(`🎉 Seviye atladın! LVL ${yeni}`), 400);
  }
  return yeni > eski ? yeni : null;
}

// ============ TOAST ============
function toast(mesaj) {
  const el = document.createElement('div');
  el.textContent = mesaj;
  el.style.cssText = `
    position:fixed;top:24px;left:50%;transform:translateX(-50%);
    padding:.9rem 1.4rem;border-radius:12px;z-index:9999;
    font-size:.85rem;font-weight:700;font-family:inherit;
    background:#fff;color:#000;
    box-shadow:0 12px 40px rgba(0,0,0,.6);
    animation:toastIn .3s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-16px)';
    setTimeout(() => el.remove(), 300);
  }, 2400);
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
      kadi, email,
      sifreHash: await sha256(sifre),
      tarih: Date.now(),
      xp: 0, vipBitis: null, bio: '', pp: null, banner: null,
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
  aktifKullanici = { email };

  const girisler = dbAl(DB.girisler, []);
  girisler.unshift({
    email, kadi: u.kadi, pp: u.pp,
    rol: rolHesapla(u, email),
    zaman: Date.now(),
  });
  dbYaz(DB.girisler, girisler.slice(0, 40));

  document.getElementById('authEkran').style.display = 'none';
  document.getElementById('site').style.display = 'block';

  siteGuncelle();
  sayfaDegistir('anasayfa');
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

  document.getElementById('sbAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('sbAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('sbIsim').textContent = u.kadi;
  document.getElementById('sbRol').textContent = rol === 'admin' ? 'Yönetici' : (rol === 'vip' ? 'VIP Üyelik' : 'Ücretsiz Üyelik');

  document.getElementById('topbarAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('topbarAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('tpIsim').textContent = u.kadi;
  document.getElementById('tpRol').textContent = rolEtiket(rol);

  document.getElementById('welcomeAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('welcomeAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('welcomeIsim').textContent = u.kadi;
  const rozet = document.getElementById('welcomeRozet');
  rozet.textContent = rolEtiket(rol);
  rozet.dataset.rol = rol;

  document.getElementById('menuAdmin').style.display = rol === 'admin' ? 'flex' : 'none';

  sbXpGuncelle();
  istGuncelle();
  feedGirislerGuncelle();
  feedAktiviteTamGuncelle();
  liderlikTamGuncelle();
  duyuruGuncelle();
  profilSayfaGuncelle();
  adminGuncelle();
}

function sbXpGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;
  const { level, mevcut, gerekli } = levelHesapla(u.xp || 0);
  document.getElementById('sbLevel').textContent = level;
  document.getElementById('sbXpYazi').textContent = `${mevcut}/${gerekli}`;
  document.getElementById('sbXpDolgu').style.width = `${(mevcut / gerekli) * 100}%`;
  document.getElementById('istLevel').textContent = `LVL ${level}`;
}

function istGuncelle() {
  const k = dbAl(DB.kul, {});
  document.getElementById('istKayitli').textContent = Object.keys(k).length;

  const girisler = dbAl(DB.girisler, []);
  const bes = Date.now() - 5 * 60 * 1000;
  const aktifler = new Set(girisler.filter(g => g.zaman > bes).map(g => g.email));
  document.getElementById('istAktif').textContent = Math.max(1, aktifler.size);
  document.getElementById('istSorgu').textContent = dbAl(DB.sorgular, []).length;
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
  const sorgular = dbAl(DB.sorgular, []);
  if (!sorgular.length) { ul.innerHTML = '<li class="bos-feed">Henüz sorgu yapılmadı.</li>'; return; }
  const k = dbAl(DB.kul, {});
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
      <span class="lr-level">LVL ${u.level}</span>
      <span class="lr-xp">${u.xp} XP</span>
    `;
    ul.appendChild(li);
  });
}

function duyuruGuncelle() {
  const ul = document.getElementById('duyuruListe');
  if (!ul) return;
  const duyurular = dbAl(DB.duyuru, []);
  if (!duyurular.length) { ul.innerHTML = '<li class="bos-feed">Henüz duyuru yok.</li>'; return; }
  ul.innerHTML = '';
  duyurular.forEach(d => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="duyuru-ikon"><i class="fa-solid fa-bullhorn"></i></div>
      <div style="flex:1;min-width:0;">
        <div class="duyuru-baslik">${d.baslik}</div>
        ${d.icerik ? `<div class="duyuru-icerik">${d.icerik}</div>` : ''}
        <div class="duyuru-tarih">${tarihFormat(d.zaman)}</div>
      </div>
    `;
    ul.appendChild(li);
  });
}

function saatFormat(t) { return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
function tarihFormat(t) { return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

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

// ============ SAYFA ============
document.querySelectorAll('.menu-item').forEach(btn => {
  btn.onclick = () => {
    if (btn.dataset.sayfa) {
      sayfaDegistir(btn.dataset.sayfa);
      kapatMobil();
    }
  };
});

document.querySelectorAll('.panel-link').forEach(b => {
  b.onclick = () => sayfaDegistir(b.dataset.git);
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
}

// ============ KATEGORİ ============
document.querySelectorAll('.menu-kategori').forEach(btn => {
  btn.onclick = () => {
    const kat = btn.dataset.kategori;
    const araclar = Object.entries(TOOLS).filter(([_, t]) => t.kategori === kat);
    if (!araclar.length) { toast('Bu kategoride araç yok.'); return; }
    const [ilkId] = araclar[0];
    aracAc(ilkId);
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

  document.getElementById('aracSonucKart').style.display = 'none';
  document.getElementById('aracSonuc').innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('aracGeri').onclick = () => sayfaDegistir('anasayfa');

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
  sonuc.innerHTML = '<div class="bos-feed">İşleniyor...</div>';

  try {
    const s = await t.calistir(p);
    sonuc.innerHTML = sonucGoster(s);
    if (!s || !s.hata) {
      const xp = Math.floor(Math.random() * 11) + 10;
      xpEkle(aktifKullanici.email, xp);

      const k = dbAl(DB.kul, {});
      const u = k[aktifKullanici.email];
      const sorgular = dbAl(DB.sorgular, []);
      sorgular.unshift({
        email: aktifKullanici.email,
        kadi: u.kadi, pp: u.pp,
        arac: t.ad, xp, zaman: Date.now(),
      });
      dbYaz(DB.sorgular, sorgular.slice(0, 40));

      feedAktiviteTamGuncelle();
      istGuncelle();
      toast(`+${xp} XP kazandın`);
    }
  } catch (e) {
    sonuc.innerHTML = `<div class="sonuc-hata">Hata: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> ÇALIŞTIR';
  }
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
  r.textContent = rolEtiket(rol);
  r.dataset.rol = rol;

  document.getElementById('profilMail').textContent = u.email === ADMIN_EMAIL ? '●●●●●●●● (gizli)' : u.email;
  document.getElementById('profilBio').textContent = u.bio || 'Henüz bio eklenmemiş.';
  document.getElementById('profilLevel').textContent = level;
  document.getElementById('profilXp').textContent = u.xp || 0;
  document.getElementById('profilTarih').textContent = u.tarih ? new Date(u.tarih).toLocaleDateString('tr-TR') : '—';
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
  r.textContent = rolEtiket(rol);
  r.dataset.rol = rol;

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
  setTimeout(() => {
    document.getElementById('modalKapat').click();
    siteGuncelle();
  }, 800);
};

// ============ ADMIN ============
function adminGuncelle() {
  const k = dbAl(DB.kul, {});
  document.getElementById('apUye').textContent = Object.keys(k).length;

  let vip = 0;
  Object.values(k).forEach(u => { if (rolHesapla(u, u.email) === 'vip') vip++; });
  document.getElementById('apVip').textContent = vip;
  document.getElementById('apSorgu').textContent = dbAl(DB.sorgular, []).length;

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

// ============ KISAYOLLAR ============
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const arama = document.getElementById('hizliArama');
    if (arama) arama.focus();
  }
});

// ============ STORAGE EVENT ============
window.addEventListener('storage', (e) => {
  if (!aktifKullanici) return;
  if ([DB.kul, DB.duyuru, DB.girisler, DB.sorgular].includes(e.key)) {
    istGuncelle();
    feedGirislerGuncelle();
    feedAktiviteTamGuncelle();
    liderlikTamGuncelle();
    duyuruGuncelle();
    adminGuncelle();
  }
});

// ============ BAŞLAT ============
(function baslat() {
  authModDegistir('login');
})();
