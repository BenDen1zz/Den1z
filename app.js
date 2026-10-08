// Den1zz - Ana uygulama

let aktifTool = null;
let aktifSayfa = 1;

function saatGuncelle() {
  const d = new Date();
  const s = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  const el = document.getElementById('saat');
  if (el) el.textContent = s;
}
setInterval(saatGuncelle, 1000);
saatGuncelle();

function listele() {
  const ul = document.getElementById('toolListe');
  ul.innerHTML = '';
  const q = document.getElementById('miniArama').value.toLowerCase();

  Object.entries(TOOLS)
    .filter(([id, t]) => t.sayfa === aktifSayfa && t.ad.toLowerCase().includes(q))
    .forEach(([id, t]) => {
      const li = document.createElement('li');
      if (t.backendGerekli) li.classList.add('backend-yok');
      li.innerHTML = `<span class="ikon">${t.ikon}</span><span class="isim">${t.ad}</span>`;
      li.addEventListener('click', () => {
        if (t.backendGerekli) return;
        toolSec(id, li);
      });
      ul.appendChild(li);
    });

  const toplam = Object.values(TOOLS).filter(t => !t.backendGerekli).length;
  document.getElementById('toolSayisi').textContent = `${toplam} aktif araç • ${Object.keys(TOOLS).length} toplam`;
}

function toolSec(id, el) {
  const t = TOOLS[id];
  aktifTool = id;

  document.querySelectorAll('.tool-liste li').forEach(x => x.classList.remove('aktif'));
  if (el) el.classList.add('aktif');

  document.getElementById('bosEkran').style.display = 'none';
  document.getElementById('aktifEkran').classList.add('acik');

  document.getElementById('aktifAd').textContent = t.ad;
  document.getElementById('aktifKategori').textContent = t.kategori || 'ARAÇ';
  document.querySelector('#aktifBaslik .ikon').textContent = t.ikon;
  document.getElementById('aktifAciklama').textContent = t.aciklama || '';

  const gk = document.getElementById('girdiKutusu');
  gk.innerHTML = '';
  (t.girdiler || []).forEach(g => {
    const div = document.createElement('div');
    div.className = 'girdi-item';
    const label = `<label>${g.etiket || g.ad}</label>`;
    let input;
    if (g.tip === 'textarea') {
      input = `<textarea id="gir_${g.ad}" placeholder="${g.placeholder || ''}">${g.varsayilan || ''}</textarea>`;
    } else {
      input = `<input type="${g.tip || 'text'}" id="gir_${g.ad}" placeholder="${g.placeholder || ''}" value="${g.varsayilan || ''}">`;
    }
    div.innerHTML = label + input;
    gk.appendChild(div);
  });

  document.getElementById('sonucKutusu').innerHTML = '<div class="bos-sonuc">Sonuç bekleniyor...</div>';
}

async function calistir() {
  if (!aktifTool) return;
  const t = TOOLS[aktifTool];
  const params = {};
  (t.girdiler || []).forEach(g => {
    const el = document.getElementById('gir_' + g.ad);
    if (el) params[g.ad] = el.value;
  });

  const btn = document.getElementById('calistirBtn');
  const kutu = document.getElementById('sonucKutusu');
  btn.disabled = true;
  btn.textContent = 'ÇALIŞIYOR...';
  kutu.innerHTML = '<div class="bos-sonuc">İşleniyor...</div>';

  try {
    const sonuc = await t.calistir(params);
    kutu.innerHTML = sonucGoster(sonuc);
  } catch (e) {
    kutu.innerHTML = `<div class="etiket-hata">Hata: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Çalıştır';
  }
}

function sonucGoster(s) {
  if (!s) return '<div class="bos-sonuc">Boş</div>';
  if (typeof s === 'string') return `<div>${s}</div>`;
  if (s.hata) return `<div class="etiket-hata">${s.hata}</div>`;
  let html = '<table class="veri-tablo">';
  for (const [k, v] of Object.entries(s)) {
    const val = String(v).replace(/\n/g, '<br>');
    html += `<tr><td>${k}</td><td>${val}</td></tr>`;
  }
  html += '</table>';
  return html;
}

document.querySelectorAll('.sekme').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sekme').forEach(b => b.classList.remove('aktif'));
    btn.classList.add('aktif');
    aktifSayfa = parseInt(btn.dataset.sayfa);
    listele();
  });
});

document.getElementById('miniArama').addEventListener('input', listele);
document.getElementById('calistirBtn').addEventListener('click', calistir);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') calistir();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('miniArama').focus();
  }
});

listele();
