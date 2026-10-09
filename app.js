// Den1zz v10 - Auth + XP + Admin + Profil

const ADMIN_EMAIL = 'gizlihesap40444@gmail.com';
const ADMIN_KADI = 'Den1zz';

let aktifTool = null;
let aktifKullanici = null;
let secilenFoto = null;
let secilenBanner = null;

// ============ STORAGE ============
const DB = {
  kul: 'den1zz_kullanicilar',
  oturum: 'den1zz_oturum',
  duyuru: 'den1zz_duyurular',
  girisler: 'den1zz_girisler',
  sorgular: 'den1zz_sorgular',
};

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

function rolEtiket(rol) {
  return { admin: 'ADMIN', vip: 'VIP', member: 'MEMBER' }[rol] || 'MEMBER';
}

function rolSinif(rol) {
  return { admin: 'admin', vip: 'vip', member: 'member' }[rol] || 'member';
}

// ============ XP ============
function xpGerekli(level) { return level * 100; }

function levelHesapla(xp) {
  let level = 1;
  let kalan = xp;
  while (kalan >= xpGerekli(level)) {
    kalan -= xpGerekli(level);
    level++;
  }
  return { level, mevcut: kalan, gerekli: xpGerekli(level) };
}

function xpEkle(email, miktar) {
  const k = dbAl(DB.kul, {});
  if (!k[email]) return;
  const eskiLevel = levelHesapla(k[email].xp || 0).level;
  k[email].xp = (k[email].xp || 0) + miktar;
  dbYaz(DB.kul, k);
  const yeniLevel = levelHesapla(k[email].xp).level;
  if (aktifKullanici && aktifKullanici.email === email) {
    aktifKullanici.xp = k[email].xp;
    xpGuncelleUI();
    if (yeniLevel > eskiLevel) {
      setTimeout(() => bildirim(`🎉 Seviye atladın! LVL ${yeniLevel}`, 'basari'), 300);
    }
  }
  if (yeniLevel > eskiLevel) return yeniLevel;
  return null;
}

// ============ BİLDİRİM ============
function bildirim(mesaj, tip = 'bilgi') {
  const el = document.createElement('div');
  el.className = 'toast ' + tip;
  el.textContent = mesaj;
  el.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    padding: .8rem 1.2rem; border-radius: 12px; z-index: 9999;
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
      kadi, email, sifreHash,
      tarih: Date.now(),
      xp: 0,
      vipBitis: null,
      bio: '',
      pp: null,
      banner: null,
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
  dbYaz(DB.oturum, { email });

  // Giriş kaydı ekle
  const girisler = dbAl(DB.girisler, []);
  girisler.unshift({
    email,
    kadi: u.kadi,
    pp: u.pp,
    rol: rolHesapla(u),
    zaman: Date.now(),
  });
  dbYaz(DB.girisler, girisler.slice(0, 30));

  panelGoster();
  bildirim(`Hoş geldin, ${u.kadi}!`, 'basari');
}

function cikisYap() {
  aktifKullanici = null;
  localStorage.removeItem(DB.oturum);
  document.getElementById('panel').style.display = 'none';
  document.getElementById('girisEkran').style.display = 'flex';
  document.getElementById('girisForm').reset();
  document.getElementById('girisHata').textContent = '';
}

document.getElementById('cikisBtn').onclick = cikisYap;

function panelGoster() {
  document.getElementById('girisEkran').style.display = 'none';
  document.getElementById('panel').style.display = 'block';

  const k = dbAl(DB.kul, {});
  const u = k[aktifKullanici.email];
  const rol = rolHesapla(u);

  // Header
  document.getElementById('hgMerhaba').textContent = 'Merhaba, ' + u.kadi;
  document.getElementById('hgAvatar').textContent = u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('hgAvatar').style.backgroundImage = `url(${u.pp})`;
  const rolEl = document.getElementById('hgRol');
  rolEl.textContent = rolEtiket(rol);
  rolEl.dataset.rol = rolSinif(rol);

  // Drawer
  document.getElementById('dkAvatar').textContent = u.kadi[0].toUpperCase();
  if (u.pp) document.getElementById('dkAvatar').style.backgroundImage = `url(${u.pp})`;
  document.getElementById('dkIsim').textContent = u.kadi;
  document.getElementById('dkRol').textContent = rolEtiket(rol);

  // Admin butonu
  document.getElementById('adminBtn').style.display = rol === 'admin' ? 'flex' : 'none';

  xpGuncelleUI();
  istatistikGuncelle();
  girisFeedGuncelle();
  liderlikGuncelle();
  akisGuncelle();
  duyuruGuncelle();
  listele();
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
  document.getElementById('barSeviye').style.width = `${(mevcut / gerekli) * 100}%`;
}

// ============ İSTATİSTİK ============
function istatistikGuncelle() {
  const k = dbAl(DB.kul, {});
  const toplam = Object.keys(k).length;
  document.getElementById('statKayitli').textContent = toplam.toLocaleString('tr-TR');
  document.getElementById('barKayitli').style.width = Math.min(100, toplam * 5) + '%';

  const oturumlar = dbAl(DB.girisler, []);
  const besDkOnce = Date.now() - 5 * 60 * 1000;
  const aktifler = new Set(
    oturumlar.filter(g => g.zaman > besDkOnce).map(g => g.email)
  );
  const aktifSayi = Math.max(1, aktifler.size);
  document.getElementById('statAktif').textContent = aktifSayi;
  document.getElementById('barAktif').style.width = Math.min(100, aktifSayi * 10) + '%';
}

// ============ GİRİŞ FEED ============
function girisFeedGuncelle() {
  const ul = document.getElementById('girisFeed');
  if (!ul) return;
  const girisler = dbAl(DB.girisler, []).slice(0, 15);
  if (!girisler.length) {
    ul.innerHTML = '<li class="bos-mesaj">Henüz giriş yok.</li>';
    return;
  }
  ul.innerHTML = '';
  girisler.forEach(g => {
    const li = document.createElement('li');
    const bas = g.kadi[0].toUpperCase();
    const rol = g.rol || 'member';
    li.innerHTML = `
      <div class="gf-avatar" data-email="${g.email}">${g.pp ? '' : bas}</div>
      <div class="gf-isim">
        <b>${g.kadi}</b>
        <span class="rol-rozet" data-rol="${rol}" style="font-size:.55rem;padding:.1rem .35rem;">${rolEtiket(rol)}</span>
      </div>
      <span class="gf-saat">${saatFormat(g.zaman)}</span>
    `;
    const av = li.querySelector('.gf-avatar');
    if (g.pp) av.style.backgroundImage = `url(${g.pp})`;
    av.onclick = () => profilGoster(g.email);
    ul.appendChild(li);
  });
}

// ============ LİDERLİK ============
function liderlikGuncelle() {
  const ul = document.getElementById('liderlikListe');
  if (!ul) return;
  const k = dbAl(DB.kul, {});
  const liste = Object.values(k)
    .map(u => ({ ...u, level: levelHesapla(u.xp || 0).level, xp: u.xp || 0 }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  if (!liste.length) {
    ul.innerHTML = '<li class="bos-mesaj">Henüz kimse yok.</li>';
    return;
  }
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

// ============ CANLI AKIŞ ============
function akisGuncelle() {
  const ul = document.getElementById('akisListe');
  if (!ul) return;
  const sorgular = dbAl(DB.sorgular, []).slice(0, 15);
  if (!sorgular.length) {
    ul.innerHTML = '<li class="bos-mesaj">Henüz sorgu yapılmadı. Bir araç çalıştır, burada görünsün.</li>';
    return;
  }
  ul.innerHTML = '';
  sorgular.forEach(s => {
    const li = document.createElement('li');
    const bas = s.kadi[0].toUpperCase();
    li.innerHTML = `
      <div class="ak-avatar" data-email="${s.email}">${s.pp ? '' : bas}</div>
      <div class="ak-mesaj"><b>${s.kadi}</b> <span style="color:var(--soluk)">"${s.arac}"</span> sorgusu yaptı</div>
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
    email: aktifKullanici.email,
    kadi: u.kadi,
    pp: u.pp,
    arac,
    xp,
    zaman: Date.now(),
  });
  dbYaz(DB.sorgular, sorgular.slice(0, 30));
  akisGuncelle();
}

// ============ DUYURU ============
function duyuruGuncelle() {
  const ul = document.getElementById('duyuruListe');
  if (!ul) return;
  const duyurular = dbAl(DB.duyuru, [
    { id: 1, baslik: 'WEB ÇÖZÜMLERİ EKLENDİ', icerik: '', zaman: Date.now() },
    { id: 2, baslik: 'TAKİP EDİN', icerik: '', zaman: Date.now() },
  ]);
  ul.innerHTML = '';
  duyurular.slice(0, 5).forEach(d => {
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
  if (!duyurular.length) ul.innerHTML = '<li class="bos-mesaj">Duyuru yok.</li>';
}

// ============ YARDIMCI ============
function saatFormat(t) {
  return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function tarihFormat(t) {
  return new Date(t).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============ DRAWER ============
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('drawerOverlay');

document.getElementById('hamburger').onclick = () => { drawer.classList.add('acik'); overlay.classList.add('acik'); };
function kapatDrawer() { drawer.classList.remove('acik'); overlay.classList.remove('acik'); }
document.getElementById('drawerKapat').onclick = kapatDrawer;
overlay.onclick = kapatDrawer;

// ============ TOOL LİSTE ============
function listele() {
  const ul = document.getElementById('drawerListe');
  if (!ul) return;
  ul.innerHTML = '';
  const q = document.getElementById('drawerArama').value.toLowerCase();
  Object.entries(TOOLS)
    .filter(([id, t]) => (!t.sayfa || t.sayfa === 1) && t.ad.toLowerCase().includes(q))
    .forEach(([id, t]) => {
      const li = document.createElement('li');
      if (t.backendGerekli) li.classList.add('backend-yok');
      li.innerHTML = `<span class="ikon">${t.ikon}</span><span>${t.ad}</span>`;
      li.onclick = () => { if (!t.backendGerekli) toolAc(id); };
      ul.appendChild(li);
    });
}
document.getElementById('drawerArama').addEventListener('input', listele);

// ============ TOOL PANEL ============
function toolAc(id) {
  const t = TOOLS[id];
  aktifTool = id;
  kapatDrawer();
  const panel = document.createElement('div');
  panel.className = 'tool-panel';
  panel.innerHTML = `
    <div class="tool-panel-ust">
      <div class="tool-panel-baslik">${t.ikon} ${t.ad}</div>
      <button class="tool-panel-kapat"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <p style="color:var(--soluk);font-size:.85rem;margin-bottom:1rem;">${t.aciklama || ''}</p>
    <div id="tpGirdiler"></div>
    <button class="tool-calistir" id="tpCalistir">ÇALIŞTIR</button>
    <div class="tool-sonuc" id="tpSonuc"><div style="text-align:center;color:var(--soluk);padding:2rem 0;font-style:italic;">Sonuç bekleniyor...</div></div>
  `;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('acik'));

  panel.querySelector('.tool-panel-kapat').onclick = () => {
    panel.classList.remove('acik');
    setTimeout(() => panel.remove(), 350);
  };

  const girdiler = panel.querySelector('#tpGirdiler');
  (t.girdiler || []).forEach(g => {
    const div = document.createElement('div');
    div.className = 'tool-girdi';
    let input;
    if (g.tip === 'textarea') input = `<textarea id="tp_${g.ad}" placeholder="${g.placeholder || ''}">${g.varsayilan || ''}</textarea>`;
    else input = `<input type="${g.tip || 'text'}" id="tp_${g.ad}" placeholder="${g.placeholder || ''}" value="${g.varsayilan || ''}">`;
    div.innerHTML = `<label>${g.etiket || g.ad}</label>${input}`;
    girdiler.appendChild(div);
  });

  panel.querySelector('#tpCalistir').onclick = async () => {
    const params = {};
    (t.girdiler || []).forEach(g => {
      const el = document.getElementById('tp_' + g.ad);
      if (el) params[g.ad] = el.value;
    });
    const btn = panel.querySelector('#tpCalistir');
    const sonucEl = panel.querySelector('#tpSonuc');
    btn.disabled = true; btn.textContent = 'ÇALIŞIYOR...';
    sonucEl.innerHTML = '<div style="text-align:center;color:var(--soluk);padding:2rem 0;">İşleniyor...</div>';
    try {
      const s = await t.calistir(params);
      sonucEl.innerHTML = sonucGoster(s);
      // XP ver
      if (!s || !s.hata) {
        const xp = Math.floor(Math.random() * 11) + 10;
        const yeniLev = xpEkle(aktifKullanici.email, xp);
        sorguKaydet(t.ad, xp);
        if (!yeniLev) bildirim(`+${xp} XP kazandın!`, 'basari');
      }
    } catch (e) {
      sonucEl.innerHTML = `<div class="etiket-hata">Hata: ${e.message}</div>`;
    } finally {
      btn.disabled = false; btn.textContent = 'ÇALIŞTIR';
    }
  };
}

function sonucGoster(s) {
  if (!s) return '<div style="text-align:center;color:var(--soluk);">Boş sonuç</div>';
  if (typeof s === 'string') return `<div>${s}</div>`;
  if (s.hata) return `<div class="etiket-hata">${s.hata}</div>`;
  let html = '<table class="veri-tablo">';
  for (const [k, v] of Object.entries(s)) html += `<tr><td>${k}</td><td>${String(v).replace(/\n/g, '<br>')}</td></tr>`;
  html += '</table>';
  return html;
}

// ============ PROFİL GÖSTER ============
function profilGoster(email) {
  const k = dbAl(DB.kul, {});
  const u = k[email];
  if (!u) return;
  const rol = rolHesapla(u);
  const { level } = levelHesapla(u.xp || 0);

  const pm = document.getElementById('profilModal');
  const banner = document.getElementById('pmBanner');
  const avatar = document.getElementById('pmAvatar');

  banner.style.backgroundImage = u.banner ? `url(${u.banner})` : '';
  banner.style.background = u.banner ? `url(${u.banner}) center/cover` : 'linear-gradient(135deg, var(--vurgu2), var(--vurgu))';

  avatar.textContent = u.pp ? '' : u.kadi[0].toUpperCase();
  avatar.style.backgroundImage = u.pp ? `url(${u.pp})` : '';

  document.getElementById('pmIsim').textContent = u.kadi;
  const pr = document.getElementById('pmRol');
  pr.textContent = rolEtiket(rol);
  pr.dataset.rol = rolSinif(rol);

  document.getElementById('pmMail').textContent = email === ADMIN_EMAIL ? '●●●●●●●● (gizli)' : email;
  document.getElementById('pmBio').textContent = u.bio || 'Henüz bio eklenmemiş.';
  document.getElementById('pmLevel').textContent = level;
  document.getElementById('pmXp').textContent = u.xp || 0;

  document.getElementById('profilArka').classList.add('acik');
  pm.classList.add('acik');
}

document.getElementById('pmKapat').onclick = () => {
  document.getElementById('profilArka').classList.remove('acik');
  document.getElementById('profilModal').classList.remove('acik');
};
document.getElementById('profilArka').onclick = () => {
  document.getElementById('profilArka').classList.remove('acik');
  document.getElementById('profilModal').classList.remove('acik');
};

// ============ PROFİL DÜZENLE ============
document.getElementById('dkProfilBtn').onclick = () => { kapatDrawer(); profilDuzenleAc(); };

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
document.getElementById('profilEditArka').onclick = () => {
  document.getElementById('profilEditArka').classList.remove('acik');
  document.getElementById('profilEditModal').classList.remove('acik');
};

document.getElementById('peFotoInput').onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    secilenFoto = ev.target.result;
    const av = document.getElementById('peAvatar');
    av.textContent = '';
    av.style.backgroundImage = `url(${secilenFoto})`;
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

  mesaj.style.color = '';
  mesaj.textContent = '';

  if (secilenFoto) u.pp = secilenFoto;
  if (secilenBanner) u.banner = secilenBanner;
  if (yeniIsim && yeniIsim.length >= 3) u.kadi = yeniIsim;
  u.bio = yeniBio;

  // E-posta değişikliği
  if (yeniMail && yeniMail !== aktifKullanici.email) {
    if (!sifreOnay) {
      mesaj.style.color = '#f87171';
      mesaj.textContent = 'E-posta değiştirmek için şifreni gir.';
      return;
    }
    const hash = await sha256(sifreOnay);
    if (hash !== u.sifreHash) {
      mesaj.style.color = '#f87171';
      mesaj.textContent = 'Şifre yanlış.';
      return;
    }
    if (!/^[\w.\-+]+@[\w\-]+\.[\w.\-]+$/.test(yeniMail)) {
      mesaj.style.color = '#f87171';
      mesaj.textContent = 'Geçersiz e-posta.';
      return;
    }
    if (k[yeniMail]) {
      mesaj.style.color = '#f87171';
      mesaj.textContent = 'Bu e-posta zaten kullanılıyor.';
      return;
    }
    k[yeniMail] = u;
    delete k[aktifKullanici.email];
    aktifKullanici.email = yeniMail;
    dbYaz(DB.oturum, { email: yeniMail });
  }

  dbYaz(DB.kul, k);

  mesaj.style.color = '#22c55e';
  mesaj.textContent = 'Profil güncellendi!';
  bildirim('Profil güncellendi', 'basari');
  setTimeout(() => {
    document.getElementById('peKapat').click();
    panelGoster();
  }, 800);
};

// ============ ADMIN PANEL ============
document.getElementById('adminBtn').onclick = () => {
  kapatDrawer();
  document.getElementById('adminArka').classList.add('acik');
  document.getElementById('adminPanel').classList.add('acik');
  adminKullanicilariListele();
};

document.getElementById('apKapat').onclick = () => {
  document.getElementById('adminArka').classList.remove('acik');
  document.getElementById('adminPanel').classList.remove('acik');
};
document.getElementById('adminArka').onclick = () => {
  document.getElementById('adminArka').classList.remove('acik');
  document.getElementById('adminPanel').classList.remove('acik');
};

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
  mesaj.textContent = `✓ ${u.kadi} → ${sure} gün VIP (${new Date(bitis).toLocaleDateString('tr-TR')} bitiş)`;
  document.getElementById('vipNick').value = '';
  adminKullanicilariListele();
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
};

function adminKullanicilariListele() {
  const ul = document.getElementById('apKullaniciListe');
  const k = dbAl(DB.kul, {});
  ul.innerHTML = '';
  Object.values(k).forEach(u => {
    const rol = rolHesapla(u);
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="ak-avatar">${u.pp ? '' : u.kadi[0].toUpperCase()}</div>
      <span class="ak-isim">${u.kadi}</span>
      <span class="rol-rozet" data-rol="${rolSinif(rol)}" style="font-size:.55rem;padding:.1rem .35rem;">${rolEtiket(rol)}</span>
    `;
    const av = li.querySelector('.ak-avatar');
    if (u.pp) av.style.backgroundImage = `url(${u.pp})`;
    ul.appendChild(li);
  });
  if (!Object.keys(k).length) ul.innerHTML = '<li class="bos-mesaj">Kayıtlı kullanıcı yok.</li>';
}

// ============ CROSS-TAB SENKRON ============
window.addEventListener('storage', (e) => {
  if (!aktifKullanici) return;
  if ([DB.kul, DB.duyuru, DB.girisler, DB.sorgular].includes(e.key)) {
    istatistikGuncelle();
    girisFeedGuncelle();
    liderlikGuncelle();
    akisGuncelle();
    duyuruGuncelle();
  }
});

// ============ BAŞLAT ============
(function baslat() {
  modDegistir('login');
  const oturum = dbAl(DB.oturum);
  if (oturum && oturum.email) {
    const k = dbAl(DB.kul, {});
    if (k[oturum.email]) {
      aktifKullanici = { email: oturum.email };
      panelGoster();
      return;
    }
  }
  // Oturum yoksa temizle
  localStorage.removeItem(DB.oturum);
})();

// ============ PERİYODİK ============
setInterval(() => {
  if (!aktifKullanici) return;
  istatistikGuncelle();
  girisFeedGuncelle();
}, 30000);
