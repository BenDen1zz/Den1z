// Den1zz v11 - Auth + XP + Admin + Profil + Ayrı Menüler
// Her girişte mail+şifre istenir. Oturum kalıcı değil.

const ADMIN_EMAIL = 'gizlihesap40444@gmail.com';
const ADMIN_KADI = 'Den1zz';

const DB = {
  kul: 'den1zz_kullanicilar',
  duyuru: 'den1zz_duyurular',
  girisler: 'den1zz_girisler',
  sorgular: 'den1zz_sorgular',
};

let aktifKullanici = null;
let aktifTool = null;
let secilenFoto = null;
let secilenBanner = null;

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
function rolHesapla(u) {
  if (!u) return 'member';
  if (u.email === ADMIN_EMAIL) return 'admin';
  if (u.vipBitis && Date.now() < u.vipBitis) return 'vip';
  return 'member';
}
function rolEtiket(r) { return { admin: 'ADMIN', vip: 'VIP', member: 'MEMBER' }[r] || 'MEMBER'; }

// ============ XP ============
function xpGerekli(level) { return level * 100; }

function levelHesapla(xp) {
  let level = 1, kalan = xp;
  while (kalan >= xpGerekli(level)) { kalan -= xpGerekli(level); level++; }
  return { level, mevcut: kalan, gerekli: xpGerekli(level) };
}

function xpEkle(email, miktar) {
  const k = dbAl(DB.kul, {});
  if (!k[email]) return null;
  const eskiLevel = levelHesapla(k[email].xp || 0).level;
  k[email].xp = (k[email].xp || 0) + miktar;
  dbYaz(DB.kul, k);
  const yeniLevel = levelHesapla(k[email].xp).level;
  if (aktifKullanici && aktifKullanici.email === email) {
    xpGuncelleUI();
    if (yeniLevel > eskiLevel) {
      setTimeout(() => toast(`🎉 Seviye atladın! LVL ${yeniLevel}`, 'basari'), 300);
    }
  }
  return yeniLevel > eskiLevel ? yeniLevel : null;
}

// ============ TOAST ============
function toast(mesaj, tip = 'bilgi') {
  const el = document.createElement('div');
  el.textContent = mesaj;
  el.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    padding: .85rem 1.3rem; border-radius: 12px; z-index: 9999;
    font-size: .85rem; font-weight: 700; animation: toastIn .3s ease;
    background: ${tip === 'basari' ? 'linear-gradient(135deg,#10b981,#047857)' :
                  tip === 'hata' ? 'linear-gradient(135deg,#ef4444,#991b1b)' :
                  'linear-gradient(135deg,#3b82f6,#1e40af)'};
    color: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.5);
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s, transform .3s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// ============ AUTH ============
let authMod = 'login';

function modDegistir(mod) {
  authMod = mod;
  document.querySelectorAll('.giris-sekme').forEach(b => b.classList.toggle('aktif', b.dataset.mod === mod));
  document.getElementById('alanKullanici').style.display = mod === 'register' ? 'flex' : 'none';
  document.getElementById('girisButon').textContent = mod === 'register' ? 'KAYIT OL' : 'GİRİŞ YAP';
  document.getElementById('girisAlt').textContent = mod === 'register' ? 'Yeni hesap oluştur' : 'Hesabına giriş yap';
  document.getElementById('altYazi').textContent = mod === 'register' ? 'Hesabın var mı?' : 'Hesabın yok mu?';
  document.getElementById('altLink').textContent = mod === 'register' ? 'Giriş yap' : 'Kayıt ol';
  document.getElementById('girisHata').textContent = '';
}

document.querySelectorAll('.giris-sekme').forEach(b => b.onclick = () => modDegistir(b.dataset.mod));

document.getElementById('altLink').onclick = (e) => {
  e.preventDefault();
  modDegistir(authMod === 'register' ? 'login' : 'register');
};

document.getElementById('sifreGoz').onclick = () => {
  const inp = document.getElementById('fSifre');
  const ik = document.getElementById('gozIkon');
  if (inp.type === 'password') { inp.type = 'text'; ik.className = 'fa-solid fa-eye-slash'; }
  else { inp.type = 'password'; ik.className = 'fa-solid fa-eye'; }
};

document.getElementById('girisForm').onsubmit = async (e) => {
  e.preventDefault();
  const hata = document.getElementById('girisHata');
  const buton = document.getElementById('girisButon');
  hata.textContent = ''; hata.style.color = '';

  const email = document.getElementById('fEmail').value.trim().toLowerCase();
  const sifre = document.getElementById('fSifre').value;
  const kadi = document.getElementById('fKullanici').value.trim();

  if (authMod === 'register') {
    if (!kadi || kadi.length < 3) { hata.textContent = 'Kullanıcı adı en az 3 karakter.'; return; }
    if (!/^[\w.\-+]+@[\w\-]+\.[\w.\-]+$/.test(email)) { hata.textContent = 'Geçersiz e-posta.'; return; }
    if (sifre.length < 6) { hata.textContent = 'Şifre en az 6 karakter.'; return; }

    const k = dbAl(DB.kul, {});
    if (k[email]) { hata.textContent = 'Bu e-posta zaten kayıtlı.'; return; }

    buton.disabled = true; buton.textContent = 'KAYIT EDİLİYOR...';
    const sifreHash = await sha256(sifre);
    k[email] = {
      kadi, email, sifreHash, tarih: Date.now(),
      xp: 0, vipBitis: null, bio: '', pp: null, banner: null,
    };
    dbYaz(DB.kul, k);
    buton.disabled = false; buton.textContent = 'KAYIT OL';
    hata.style.color = '#22c55e';
    hata.textContent = 'Kayıt başarılı! Giriş yapılıyor...';
    setTimeout(() => girisYap(email), 700);
  } else {
    if (!email || !sifre) { hata.textContent = 'Boş alan bırakma.'; return; }
    const k = dbAl(DB.kul, {});
    if (!k[email]) { hata.textContent = 'Bu e-posta kayıtlı değil.'; return; }

    buton.disabled = true; buton.textContent = 'GİRİŞ YAPILIYOR...';
    const hash = await sha256(sifre);
    if (k[email].sifreHash !== hash) {
      buton.disabled = false; buton.textContent = 'GİRİŞ YAP';
      hata.textContent = 'Şifre yanlış.'; return;
    }
    buton.disabled = false; buton.textContent = 'GİRİŞ YAP';
    girisYap(email);
  }
};

function girisYap(email) {
  const k = dbAl(DB.kul, {});
  const u = k[email];
  if (!u) return;
  aktifKullanici = { email };

  const girisler = dbAl(DB.girisler, []);
  girisler.unshift({
    email, kadi: u.kadi, pp: u.pp,
    rol: rolHesapla(u), zaman: Date.now(),
  });
  dbYaz(DB.girisler, girisler.slice(0, 30));

  panelGoster();
  sayfaDegistir('anasayfa');
  toast(`Hoş geldin, ${u.kadi}!`, 'basari');
}

function cikisYap() {
  aktifKullanici = null;
  document.getElementById('panel').style.display = 'none';
  document.getElementById('girisEkran').style.display = 'flex';
  document.getElementById('girisForm').reset();
  document.getElementById('girisHata').textContent = '';
  document.getElementById('sidebar').classList.remove('acik');
  document.getElementById('sbOverlay').classList.remove('acik');
}

document.getElementById('cikisBtn').onclick = cikisYap;

function panelGoster() {
  document.getElementById('girisEkran').style.display = 'none';
  document.getElementById('panel').style.display = 'flex';

  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const rol = rolHesapla(u);

  // Sidebar kullanıcı
  document.getElementById('sbAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('sbAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('sbKulIsim').textContent = u.kadi;
  document.getElementById('sbKulRol').textContent = rolEtiket(rol);

  // Mobil avatar
  document.getElementById('mobilAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('mobilAvatar').style.backgroundImage = `url(${u.pp})`;

  // Anasayfa
  document.getElementById('hgMerhaba').textContent = 'Merhaba, ' + u.kadi;
  document.getElementById('hgAvatar').textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('hgAvatar').style.backgroundImage = `url(${u.pp})`;
  const rolEl = document.getElementById('hgRol');
  rolEl.textContent = rolEtiket(rol);
  rolEl.dataset.rol = rol;

  // Admin butonu
  document.getElementById('sbAdminBtn').style.display = rol === 'admin' ? 'flex' : 'none';

  xpGuncelleUI();
  istatistikGuncelle();
  girisFeedGuncelle();
  liderlikGuncelle();
  akisGuncelle();
  duyuruGuncelle();
  aracGridGuncelle();
  adminKullanicilariListele();
}

function xpGuncelleUI() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;
  const { level, mevcut, gerekli } = levelHesapla(u.xp || 0);
  document.getElementById('hgLevel').textContent = level;
  document.getElementById('hgXpYazi').textContent = `${mevcut} / ${gerekli} XP`;
  document.getElementById('hgXpDolgu').style.width = `${(mevcut / gerekli) * 100}%`;
  document.getElementById('statSeviye').textContent = `LVL ${level}`;
}

// ============ İSTATİSTİK ============
function istatistikGuncelle() {
  const k = dbAl(DB.kul, {});
  document.getElementById('statKayitli').textContent = Object.keys(k).length;
  const oturumlar = dbAl(DB.girisler, []);
  const besDkOnce = Date.now() - 5 * 60 * 1000;
  const aktifler = new Set(oturumlar.filter(g => g.zaman > besDkOnce).map(g => g.email));
  document.getElementById('statAktif').textContent = Math.max(1, aktifler.size);
}

// ============ FEED ============
function girisFeedGuncelle() {
  const ul = document.getElementById('girisFeed');
  if (!ul) return;
  const girisler = dbAl(DB.girisler, []).slice(0, 15);
  if (!girisler.length) { ul.innerHTML = '<li class="bos-mesaj">Henüz giriş yok.</li>'; return; }
  ul.innerHTML = '';
  girisler.forEach(g => {
    const li = document.createElement('li');
    const bas = g.kadi[0].toUpperCase();
    const rol = g.rol || 'member';
    li.innerHTML = `
      <div class="gf-avatar">${g.pp ? '' : bas}</div>
      <div class="gf-isim">
        <b>${g.kadi}</b>
        <span class="rol-rozet" data-rol="${rol}" style="font-size:.55rem;padding:.1rem .4rem;">${rolEtiket(rol)}</span>
      </div>
      <span class="gf-saat">${saatFormat(g.zaman)}</span>
    `;
    const av = li.querySelector('.gf-avatar');
    if (g.pp) av.style.backgroundImage = `url(${g.pp})`;
    av.onclick = () => profilGoster(g.email);
    ul.appendChild(li);
  });
}

function akisGuncelle() {
  const ul = document.getElementById('akisListe');
  if (!ul) return;
  const sorgular = dbAl(DB.sorgular, []).slice(0, 15);
  if (!sorgular.length) {
    ul.innerHTML = '<li class="bos-mesaj">Henüz sorgu yapılmadı.</li>';
    return;
  }
  ul.innerHTML = '';
  sorgular.forEach(s => {
    const li = document.createElement('li');
    const bas = s.kadi[0].toUpperCase();
    li.innerHTML = `
      <div class="ak-avatar">${s.pp ? '' : bas}</div>
      <div class="ak-mesaj"><b>${s.kadi}</b> <span>"${s.arac}"</span> sorgusu yaptı</div>
      <span class="ak-xp">+${s.xp} XP</span>
      <span class="ak-saat">${saatFormat(s.zaman)}</span>
    `;
    const av = li.querySelector('.ak-avatar');
    if (s.pp) av.style.backgroundImage = `url(${s.pp})`;
    av.onclick = () => profilGoster(s.email);
    ul.appendChild(li);
  });
}

function sorguKaydet(arac, xp) {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const sorgular = dbAl(DB.sorgular, []);
  sorgular.unshift({
    email: aktifKullanici.email, kadi: u.kadi, pp: u.pp,
    arac, xp, zaman: Date.now(),
  });
  dbYaz(DB.sorgular, sorgular.slice(0, 30));
  akisGuncelle();
}

// ============ LİDERLİK ============
function liderlikGuncelle() {
  const ul = document.getElementById('liderlikTam');
  if (!ul) return;
  const k = dbAl(DB.kul, {});
  const liste = Object.values(k)
    .map(u => ({ ...u, level: levelHesapla(u.xp || 0).level, xp: u.xp || 0 }))
    .sort((a, b) => b.xp - a.xp);

  if (!liste.length) { ul.innerHTML = '<li class="bos-mesaj">Henüz kimse yok.</li>'; return; }
  ul.innerHTML = '';
  liste.forEach((u, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="lr-sira">${i + 1}</span>
      <span class="lr-isim">${u.kadi}</span>
      <span class="lr-level">LVL ${u.level}</span>
      <span class="lr-xp">${u.xp} XP</span>
    `;
    ul.appendChild(li);
  });
}

// ============ DUYURU ============
function duyuruGuncelle() {
  const ul = document.getElementById('duyuruListe');
  if (!ul) return;
  const duyurular = dbAl(DB.duyuru, []);
  if (!duyurular.length) {
    ul.innerHTML = '<li class="bos-mesaj">Henüz duyuru yok.</li>';
    return;
  }
  ul.innerHTML = '';
  duyurular.forEach(d => {
    const li = document.createElement('li');
    li.innerHTML = `
      <i class="fa-solid fa-bullhorn"></i>
      <div>
        <div class="duyuru-baslik">${d.baslik}</div>
        ${d.icerik ? `<div class="duyuru-icerik">${d.icerik}</div>` : ''}
        <div class="duyuru-tarih">${tarihFormat(d.zaman)}</div>
      </div>
    `;
    ul.appendChild(li);
  });
}

// ============ YARDIMCI ============
function saatFormat(t) {
  return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function tarihFormat(t) {
  return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============ SIDEBAR ============
const sidebar = document.getElementById('sidebar');
const sbOverlay = document.getElementById('sbOverlay');

document.getElementById('menuBtn').onclick = () => {
  sidebar.classList.add('acik');
  sbOverlay.classList.add('acik');
};
document.getElementById('sbKapat').onclick = () => {
  sidebar.classList.remove('acik');
  sbOverlay.classList.remove('acik');
};
sbOverlay.onclick = () => {
  sidebar.classList.remove('acik');
  sbOverlay.classList.remove('acik');
};
document.getElementById('sbKullanici').onclick = () => { sayfaDegistir('profil'); kapatMobil(); };

function kapatMobil() {
  if (window.innerWidth < 900) {
    sidebar.classList.remove('acik');
    sbOverlay.classList.remove('acik');
  }
}

// ============ SAYFA GEÇİŞİ ============
document.querySelectorAll('.sb-item').forEach(btn => {
  btn.onclick = () => {
    sayfaDegistir(btn.dataset.sayfa);
    kapatMobil();
  };
});

function sayfaDegistir(ad) {
  document.querySelectorAll('.sayfa').forEach(s => s.classList.remove('aktif'));
  const hedef = document.getElementById('sayfa-' + ad);
  if (hedef) hedef.classList.add('aktif');

  document.querySelectorAll('.sb-item').forEach(b => {
    b.classList.toggle('aktif', b.dataset.sayfa === ad);
  });

  // Profil sayfası güncelle
  if (ad === 'profil') profilSayfaGuncelle();
}

// ============ ARAÇLAR ============
function aracGridGuncelle() {
  const grid = document.getElementById('aracGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const q = (document.getElementById('aracArama')?.value || '').toLowerCase();

  Object.entries(TOOLS)
    .filter(([id, t]) => t.ad.toLowerCase().includes(q))
    .forEach(([id, t]) => {
      const div = document.createElement('div');
      div.className = 'arac-kart';
      if (t.backendGerekli) div.classList.add('backend-yok');
      div.innerHTML = `
        <div class="arac-kart-ust">
          <div class="arac-kart-ikon">${t.ikon || '🔧'}</div>
          <div class="arac-kart-ad">${t.ad}</div>
        </div>
        <div class="arac-kart-aciklama">${t.aciklama || ''}</div>
        ${t.kategori ? `<span class="arac-kart-tag">${t.kategori}</span>` : ''}
      `;
      div.onclick = () => { if (!t.backendGerekli) toolAc(id); };
      grid.appendChild(div);
    });

  if (!grid.children.length) {
    grid.innerHTML = '<div class="bos-mesaj">Sonuç yok.</div>';
  }
}

document.getElementById('aracArama')?.addEventListener('input', aracGridGuncelle);

// ============ TOOL PANEL ============
function toolAc(id) {
  const t = TOOLS[id];
  aktifTool = id;

  document.getElementById('tpBaslik').textContent = `${t.ikon || ''} ${t.ad}`;
  document.getElementById('tpAciklama').textContent = t.aciklama || '';

  const girdiler = document.getElementById('tpGirdiler');
  girdiler.innerHTML = '';
  (t.girdiler || []).forEach(g => {
    const div = document.createElement('div');
    div.className = 'tool-girdi';
    let input;
    if (g.tip === 'textarea') input = `<textarea id="tp_${g.ad}" placeholder="${g.placeholder || ''}">${g.varsayilan || ''}</textarea>`;
    else input = `<input type="${g.tip || 'text'}" id="tp_${g.ad}" placeholder="${g.placeholder || ''}" value="${g.varsayilan || ''}">`;
    div.innerHTML = `<label>${g.etiket || g.ad}</label>${input}`;
    girdiler.appendChild(div);
  });

  document.getElementById('tpSonuc').innerHTML = '<div class="bos-sonuc">Sonuç bekleniyor...</div>';
  document.getElementById('toolPanel').classList.add('acik');
}

document.getElementById('tpKapat').onclick = () => document.getElementById('toolPanel').classList.remove('acik');

document.getElementById('tpCalistir').onclick = async () => {
  const t = TOOLS[aktifTool];
  if (!t) return;
  const params = {};
  (t.girdiler || []).forEach(g => {
    const el = document.getElementById('tp_' + g.ad);
    if (el) params[g.ad] = el.value;
  });

  const btn = document.getElementById('tpCalistir');
  const sonucEl = document.getElementById('tpSonuc');
  btn.disabled = true; btn.textContent = 'ÇALIŞIYOR...';
  sonucEl.innerHTML = '<div class="bos-sonuc">İşleniyor...</div>';

  try {
    const s = await t.calistir(params);
    sonucEl.innerHTML = sonucGoster(s);
    if (!s || !s.hata) {
      const xp = Math.floor(Math.random() * 11) + 10;
      const yeniLev = xpEkle(aktifKullanici.email, xp);
      sorguKaydet(t.ad, xp);
      if (!yeniLev) toast(`+${xp} XP kazandın!`, 'basari');
    }
  } catch (e) {
    sonucEl.innerHTML = `<div class="etiket-hata">Hata: ${e.message}</div>`;
  } finally {
    btn.disabled = false; btn.textContent = 'ÇALIŞTIR';
  }
};

function sonucGoster(s) {
  if (!s) return '<div class="bos-sonuc">Boş sonuç</div>';
  if (typeof s === 'string') return `<div>${s}</div>`;
  if (s.hata) return `<div class="etiket-hata">${s.hata}</div>`;
  let html = '<table class="veri-tablo">';
  for (const [k, v] of Object.entries(s)) html += `<tr><td>${k}</td><td>${String(v).replace(/\n/g, '<br>')}</td></tr>`;
  html += '</table>';
  return html;
}

// ============ PROFİL GÖR (başkası) ============
function profilGoster(email) {
  const k = dbAl(DB.kul, {});
  const u = k[email];
  if (!u) return;
  const rol = rolHesapla(u);
  const { level } = levelHesapla(u.xp || 0);

  const banner = document.getElementById('pmBanner');
  banner.style.background = u.banner ? `url(${u.banner}) center/cover` : 'linear-gradient(135deg, var(--vurgu2), var(--vurgu))';

  const avatar = document.getElementById('pmAvatar');
  avatar.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  avatar.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  document.getElementById('pmIsim').textContent = u.kadi;
  const pr = document.getElementById('pmRol');
  pr.textContent = rolEtiket(rol);
  pr.dataset.rol = rol;

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

// ============ PROFİL SAYFASI ============
function profilSayfaGuncelle() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;
  const rol = rolHesapla(u);
  const { level } = levelHesapla(u.xp || 0);

  const banner = document.getElementById('pkBanner');
  banner.style.background = u.banner ? `url(${u.banner}) center/cover` : 'linear-gradient(135deg, var(--vurgu2), var(--vurgu))';

  const avatar = document.getElementById('pkAvatar');
  avatar.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  avatar.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  document.getElementById('pkIsim').textContent = u.kadi;
  const pr = document.getElementById('pkRol');
  pr.textContent = rolEtiket(rol);
  pr.dataset.rol = rol;

  document.getElementById('pkMail').textContent = u.email === ADMIN_EMAIL ? '●●●●●●●● (gizli)' : u.email;
  document.getElementById('pkBio').textContent = u.bio || 'Henüz bio eklenmemiş.';
  document.getElementById('pkLevel').textContent = level;
  document.getElementById('pkXp').textContent = u.xp || 0;
}

document.getElementById('pkDuzenle').onclick = () => profilDuzenleAc();

// ============ PROFİL DÜZENLE ============
function profilDuzenleAc() {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;

  secilenFoto = null;
  secilenBanner = null;

  const av = document.getElementById('peAvatar');
  av.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  av.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  const bn = document.getElementById('peBanner');
  bn.style.backgroundImage = u.banner ? `url(${u.banner})` : '';

  document.getElementById('peIsim').value = u.kadi;
  document.getElementById('peBio').value = u.bio || '';
  document.getElementById('peYeniMail').value = '';
  document.getElementById('peSifreOnay').value = '';
  document.getElementById('peMesaj').textContent = '';

  document.getElementById('profilEditArka').classList.add('acik');
  document.getElementById('profilEditModal').classList.add('acik');
}

document.getElementById('peKapat').onclick = () => {
  document.getElementById('profilEditArka').classList.remove('acik');
  document.getElementById('profilEditModal').classList.remove('acik');
};
document.getElementById('profilEditArka').onclick = () => document.getElementById('peKapat').click();

document.getElementById('peFotoInput').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    secilenFoto = ev.target.result;
    const av = document.getElementById('peAvatar');
    av.textContent = ''; av.style.backgroundImage = `url(${secilenFoto})`;
  };
  r.readAsDataURL(f);
};

document.getElementById('peBannerInput').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    secilenBanner = ev.target.result;
    document.getElementById('peBanner').style.backgroundImage = `url(${secilenBanner})`;
  };
  r.readAsDataURL(f);
};

document.getElementById('peKaydet').onclick = async () => {
  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  if (!u) return;

  const mesaj = document.getElementById('peMesaj');
  const yeniIsim = document.getElementById('peIsim').value.trim();
  const yeniBio = document.getElementById('peBio').value.trim();
  const yeniMail = document.getElementById('peYeniMail').value.trim().toLowerCase();
  const sifreOnay = document.getElementById('peSifreOnay').value;

  mesaj.style.color = ''; mesaj.textContent = '';

  if (secilenFoto) u.pp = secilenFoto;
  if (secilenBanner) u.banner = secilenBanner;
  if (yeniIsim && yeniIsim.length >= 3) u.kadi = yeniIsim;
  u.bio = yeniBio;

  if (yeniMail && yeniMail !== aktifKullanici.email) {
    if (!sifreOnay) { mesaj.style.color = '#f87171'; mesaj.textContent = 'E-posta için şifreni gir.'; return; }
    const hash = await sha256(sifreOnay);
    if (hash !== u.sifreHash) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Şifre yanlış.'; return; }
    if (!/^[\w.\-+]+@[\w\-]+\.[\w.\-]+$/.test(yeniMail)) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Geçersiz e-posta.'; return; }
    if (k[yeniMail]) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Bu e-posta zaten kullanılıyor.'; return; }
    k[yeniMail] = u;
    delete k[aktifKullanici.email];
    aktifKullanici.email = yeniMail;
  }

  dbYaz(DB.kul, k);
  mesaj.style.color = '#22c55e';
  mesaj.textContent = 'Profil güncellendi!';
  toast('Profil güncellendi', 'basari');
  setTimeout(() => {
    document.getElementById('peKapat').click();
    panelGoster();
    profilSayfaGuncelle();
  }, 800);
};

// ============ ADMIN ============
document.getElementById('vipVerBtn').onclick = () => {
  const nick = document.getElementById('vipNick').value.trim().replace(/^@/, '');
  const sure = parseInt(document.getElementById('vipSure').value);
  const mesaj = document.getElementById('vipMesaj');
  mesaj.style.color = '';

  if (!nick) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Kullanıcı adı gir.'; return; }

  const k = dbAl(DB.kul, {});
  const u = Object.values(k).find(x => x.kadi.toLowerCase() === nick.toLowerCase());
  if (!u) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Kullanıcı bulunamadı.'; return; }

  const bitis = Date.now() + sure * 24 * 60 * 60 * 1000;
  u.vipBitis = bitis;
  dbYaz(DB.kul, k);
  mesaj.style.color = '#22c55e';
  mesaj.textContent = `✓ ${u.kadi} → ${sure} gün VIP`;
  document.getElementById('vipNick').value = '';
  adminKullanicilariListele();
  toast(`${u.kadi} VIP yapıldı`, 'basari');
};

document.getElementById('duyuruEkleBtn').onclick = () => {
  const baslik = document.getElementById('duyuruBaslik').value.trim();
  const icerik = document.getElementById('duyuruIcerik').value.trim();
  const mesaj = document.getElementById('duyuruMesaj');
  mesaj.style.color = '';

  if (!baslik) { mesaj.style.color = '#f87171'; mesaj.textContent = 'Başlık gir.'; return; }

  const duyurular = dbAl(DB.duyuru, []);
  duyurular.unshift({ id: Date.now(), baslik, icerik, zaman: Date.now() });
  dbYaz(DB.duyuru, duyurular);
  mesaj.style.color = '#22c55e';
  mesaj.textContent = '✓ Duyuru yayınlandı';
  document.getElementById('duyuruBaslik').value = '';
  document.getElementById('duyuruIcerik').value = '';
  duyuruGuncelle();
  toast('Duyuru yayınlandı', 'basari');
};

function adminKullanicilariListele() {
  const ul = document.getElementById('apKullaniciListe');
  if (!ul) return;
  const k = dbAl(DB.kul, {});
  ul.innerHTML = '';
  Object.values(k).forEach(u => {
    const rol = rolHesapla(u);
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="ak-avatar">${u.pp ? '' : u.kadi[0].toUpperCase()}</div>
      <span class="ak-isim">${u.kadi}</span>
      <span class="rol-rozet" data-rol="${rol}" style="font-size:.55rem;padding:.1rem .4rem;">${rolEtiket(rol)}</span>
    `;
    const av = li.querySelector('.ak-avatar');
    if (u.pp) av.style.backgroundImage = `url(${u.pp})`;
    ul.appendChild(li);
  });
  if (!Object.keys(k).length) ul.innerHTML = '<li class="bos-mesaj">Kullanıcı yok.</li>';
}

// ============ CROSS-TAB ============
window.addEventListener('storage', (e) => {
  if (!aktifKullanici) return;
  if ([DB.kul, DB.duyuru, DB.girisler, DB.sorgular].includes(e.key)) {
    istatistikGuncelle();
    girisFeedGuncelle();
    liderlikGuncelle();
    akisGuncelle();
    duyuruGuncelle();
    adminKullanicilariListele();
  }
});

// ============ BAŞLAT ============
(function baslat() {
  modDegistir('login');
  // Oturum kaydedilmez, her ziyarette giriş istenir
})();

setInterval(() => {
  if (!aktifKullanici) return;
  istatistikGuncelle();
  girisFeedGuncelle();
}, 30000);
