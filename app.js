// Den1zz - Auth + Dashboard

let aktifTool = null;
let aktifSayfa = 1;
let aktifKullanici = null;

// ============ YARDIMCI ============
async function sha256(metin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function kullanicilariAl() {
  try { return JSON.parse(localStorage.getItem('den1zz_kullanicilar') || '{}'); }
  catch { return {}; }
}

function kullanicilariKaydet(k) {
  localStorage.setItem('den1zz_kullanicilar', JSON.stringify(k));
}

// ============ AUTH ============
let authMod = 'login';

function modDegistir(mod) {
  authMod = mod;
  document.querySelectorAll('.giris-sekme').forEach(b => {
    b.classList.toggle('aktif', b.dataset.mod === mod);
  });
  document.getElementById('alanKullanici').style.display = mod === 'register' ? 'flex' : 'none';
  document.getElementById('girisButon').textContent = mod === 'register' ? 'KAYIT OL' : 'GİRİŞ YAP';
  document.getElementById('girisAlt').textContent = mod === 'register' ? 'Yeni hesap oluştur' : 'Hesabına giriş yap';
  document.getElementById('altYazi').textContent = mod === 'register' ? 'Hesabın var mı?' : 'Hesabın yok mu?';
  document.getElementById('altLink').textContent = mod === 'register' ? 'Giriş yap' : 'Kayıt ol';
  document.getElementById('girisHata').textContent = '';
}

document.querySelectorAll('.giris-sekme').forEach(b => {
  b.onclick = () => modDegistir(b.dataset.mod);
});

document.getElementById('altLink').onclick = (e) => {
  e.preventDefault();
  modDegistir(authMod === 'register' ? 'login' : 'register');
};

document.getElementById('sifreGoz').onclick = () => {
  const inp = document.getElementById('fSifre');
  const img = document.getElementById('gozImg');
  if (inp.type === 'password') {
    inp.type = 'text';
    img.src = 'assets/icons/eye-off.png';
  } else {
    inp.type = 'password';
    img.src = 'assets/icons/eye.png';
  }
};

document.getElementById('girisForm').onsubmit = async (e) => {
  e.preventDefault();
  const hata = document.getElementById('girisHata');
  const buton = document.getElementById('girisButon');
  hata.textContent = '';

  const email = document.getElementById('fEmail').value.trim().toLowerCase();
  const sifre = document.getElementById('fSifre').value;
  const kadi = document.getElementById('fKullanici').value.trim();

  if (authMod === 'register') {
    if (!kadi || kadi.length < 3) { hata.textContent = 'Kullanıcı adı en az 3 karakter.'; return; }
    if (!/^[\w\.\-+]+@[\w\-]+\.[\w\.\-]+$/.test(email)) { hata.textContent = 'Geçersiz e-posta.'; return; }
    if (sifre.length < 6) { hata.textContent = 'Şifre en az 6 karakter.'; return; }

    const k = kullanicilariAl();
    if (k[email]) { hata.textContent = 'Bu e-posta zaten kayıtlı.'; return; }

    buton.disabled = true;
    buton.textContent = 'KAYIT EDİLİYOR...';
    const sifreHash = await sha256(sifre);
    k[email] = { kadi, sifreHash, tarih: Date.now() };
    kullanicilariKaydet(k);

    // Kayıtlı kullanıcı sayacını arttır
    const mevcut = parseInt(localStorage.getItem('den1zz_kayitli') || '19443');
    localStorage.setItem('den1zz_kayitli', String(mevcut + 1));

    buton.disabled = false;
    buton.textContent = 'KAYIT OL';
    hata.style.color = '#22c55e';
    hata.textContent = 'Kayıt başarılı! Giriş yapılıyor...';
    setTimeout(() => girisYap(email, kadi), 700);
  } else {
    if (!email || !sifre) { hata.textContent = 'Boş alan bırakma.'; return; }
    const k = kullanicilariAl();
    if (!k[email]) { hata.textContent = 'Bu e-posta kayıtlı değil.'; return; }

    buton.disabled = true;
    buton.textContent = 'GİRİŞ YAPILIYOR...';
    const hash = await sha256(sifre);
    if (k[email].sifreHash !== hash) {
      buton.disabled = false;
      buton.textContent = 'GİRİŞ YAP';
      hata.style.color = '#f87171';
      hata.textContent = 'Şifre yanlış.';
      return;
    }
    buton.disabled = false;
    buton.textContent = 'GİRİŞ YAP';
    girisYap(email, k[email].kadi);
  }
};

function girisYap(email, kadi) {
  aktifKullanici = { email, kadi };
  localStorage.setItem('den1zz_oturum', JSON.stringify(aktifKullanici));
  panelGoster();
}

function cikisYap() {
  aktifKullanici = null;
  localStorage.removeItem('den1zz_oturum');
  document.getElementById('panel').style.display = 'none';
  document.getElementById('girisEkran').style.display = 'flex';
  document.getElementById('girisForm').reset();
  document.getElementById('girisHata').textContent = '';
}

document.getElementById('cikisBtn').onclick = cikisYap;

function panelGoster() {
  document.getElementById('girisEkran').style.display = 'none';
  document.getElementById('panel').style.display = 'block';

  const k = aktifKullanici;
  document.getElementById('ustKullanici').textContent = '@' + k.kadi;
  document.getElementById('hgMerhaba').textContent = 'Merhaba, ' + k.kadi;
  document.querySelector('.hg-avatar').textContent = k.kadi[0].toUpperCase();

  istatistikGuncelle();
  listele();
}

// ============ DRAWER ============
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('drawerOverlay');

document.getElementById('hamburger').onclick = () => {
  drawer.classList.add('acik');
  overlay.classList.add('acik');
};

function kapatDrawer() {
  drawer.classList.remove('acik');
  overlay.classList.remove('acik');
}

document.getElementById('drawerKapat').onclick = kapatDrawer;
overlay.onclick = kapatDrawer;

// ============ TOOL LİSTE ============
function listele() {
  const ul = document.getElementById('drawerListe');
  if (!ul) return;
  ul.innerHTML = '';
  const q = document.getElementById('drawerArama').value.toLowerCase();

  Object.entries(TOOLS)
    .filter(([id, t]) => t.sayfa === aktifSayfa && t.ad.toLowerCase().includes(q))
    .forEach(([id, t]) => {
      const li = document.createElement('li');
      if (t.backendGerekli) li.classList.add('backend-yok');
      li.innerHTML = `<span class="ikon">${t.ikon}</span><span>${t.ad}</span>`;
      li.onclick = () => { if (!t.backendGerekli) toolAc(id); };
      ul.appendChild(li);
    });
}

document.querySelectorAll('.d-sekme').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.d-sekme').forEach(b => b.classList.remove('aktif'));
    btn.classList.add('aktif');
    aktifSayfa = parseInt(btn.dataset.sayfa);
    listele();
  };
});

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
      <button class="tool-panel-kapat">✕</button>
    </div>
    <p style="color:var(--soluk);font-size:.85rem;margin-bottom:1rem;">${t.aciklama || ''}</p>
    <div id="tpGirdiler"></div>
    <button class="tool-calistir" id="tpCalistir">ÇALIŞTIR</button>
    <div class="tool-sonuc" id="tpSonuc">
      <div style="text-align:center;color:var(--soluk);padding:2rem 0;font-style:italic;">Sonuç bekleniyor...</div>
    </div>
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
    if (g.tip === 'textarea') {
      input = `<textarea id="tp_${g.ad}" placeholder="${g.placeholder || ''}">${g.varsayilan || ''}</textarea>`;
    } else {
      input = `<input type="${g.tip || 'text'}" id="tp_${g.ad}" placeholder="${g.placeholder || ''}" value="${g.varsayilan || ''}">`;
    }
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
    btn.disabled = true;
    btn.textContent = 'ÇALIŞIYOR...';
    sonucEl.innerHTML = '<div style="text-align:center;color:var(--soluk);padding:2rem 0;">İşleniyor...</div>';

    try {
      const s = await t.calistir(params);
      sonucEl.innerHTML = sonucGoster(s);
    } catch (e) {
      sonucEl.innerHTML = `<div class="etiket-hata">Hata: ${e.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'ÇALIŞTIR';
    }
  };
}

function sonucGoster(s) {
  if (!s) return '<div style="text-align:center;color:var(--soluk);">Boş sonuç</div>';
  if (typeof s === 'string') return `<div>${s}</div>`;
  if (s.hata) return `<div class="etiket-hata">${s.hata}</div>`;
  let html = '<table class="veri-tablo">';
  for (const [k, v] of Object.entries(s)) {
    html += `<tr><td>${k}</td><td>${String(v).replace(/\n/g,'<br>')}</td></tr>`;
  }
  html += '</table>';
  return html;
}

// ============ İSTATİSTİK ============
function istatistikGuncelle() {
  const kayitli = parseInt(localStorage.getItem('den1zz_kayitli') || '19443');
  const aktif = Math.floor(Math.random() * 5) + 1;

  const el1 = document.getElementById('kayitliSayi');
  if (!el1) return;
  el1.textContent = kayitli.toLocaleString('tr-TR');
  document.getElementById('kayitliBar').style.width = `${Math.min(100, kayitli / 500)}%`;

  document.getElementById('aktifSayi').textContent = aktif;
  document.getElementById('aktifBar').style.width = `${aktif * 5}%`;
}
setInterval(() => { if (aktifKullanici) istatistikGuncelle(); }, 30000);

// ============ CANLI AKIŞ ============
const akisMesajlar = [
  'giriş yaptı, hoş geldin.',
  'yeni bir sorgu çalıştırdı.',
  'IP sorgusu yaptı.',
  'DNS sorgusu yaptı.',
  'profilini güncelledi.',
  'panele bağlandı.',
];

const kullaniciAdlari = ['Denizxkqv', 'Kadirx', 'Jesus34', 'lcx', 'Darknes', 'Anka', 'Furkan', 'Ege', 'Mert', 'Yusuf'];

function akisEkle() {
  const ul = document.getElementById('akisListe');
  if (!ul) return;
  const isim = kullaniciAdlari[Math.floor(Math.random() * kullaniciAdlari.length)];
  const mesaj = akisMesajlar[Math.floor(Math.random() * akisMesajlar.length)];
  const saat = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});

  const li = document.createElement('li');
  li.innerHTML = `
    <div class="avatar">${isim[0]}</div>
    <div class="mesaj"><strong>${isim}</strong> ${mesaj}</div>
    <div class="saat">${saat}</div>
  `;
  ul.prepend(li);
  while (ul.children.length > 6) ul.removeChild(ul.lastChild);
}

setInterval(() => { if (aktifKullanici) akisEkle(); }, 12000);

// ============ BAŞLAT ============
(function baslat() {
  modDegistir('login');
  const oturum = localStorage.getItem('den1zz_oturum');
  if (oturum) {
    try {
      aktifKullanici = JSON.parse(oturum);
      panelGoster();
      for (let i = 0; i < 5; i++) akisEkle();
    } catch {}
  }
})();
