// Den1zz - 80 Araç tanımı

const TOOLS = {

  "discord_id": {
    ad: "Discord ID Sorgu",
    ikon: "🆔",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Discord ID'nin oluşturulma zamanını ve profil linklerini gösterir.",
    girdiler: [{ ad: "uid", etiket: "Discord ID", tip: "text", placeholder: "123456789012345678" }],
    calistir: async (p) => {
      const uid = p.uid.trim();
      if (!/^\d+$/.test(uid)) return { hata: "Geçersiz ID" };
      const DISCORD_EPOCH = 1420070400000n;
      const i = BigInt(uid);
      const ts = Number((i >> 22n) + DISCORD_EPOCH);
      const worker = Number((i & 0x3E0000n) >> 17n);
      const process_ = Number((i & 0x1F000n) >> 12n);
      const increment = Number(i & 0xFFFn);
      return {
        "ID": uid,
        "Oluşturma (UTC)": new Date(ts).toISOString(),
        "Oluşturma (TR)": new Date(ts).toLocaleString('tr-TR'),
        "Worker": worker,
        "Process": process_,
        "Increment": increment,
        "Profil": `https://discord.com/users/${uid}`,
        "Avatar": `https://cdn.discordapp.com/avatars/${uid}/`,
        "Banner": `https://cdn.discordapp.com/banners/${uid}/`,
      };
    },
  },

  "discord_username": {
    ad: "Discord Username Bul",
    ikon: "🎯",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Discord ve diğer platformlarda kullanıcı adı arar.",
    girdiler: [{ ad: "u", etiket: "Username", tip: "text", placeholder: "kullanici" }],
    calistir: async (p) => {
      const u = p.u.trim().replace(/^@/, '');
      if (!u) return { hata: "Boş" };
      const sonuc = {};
      try {
        const r = await fetch("https://discord.com/api/v9/unique-username/username-attempt-unauthed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u })
        });
        const d = await r.json();
        sonuc["Discord"] = d.taken ? "ALINMIŞ" : "MÜSAİT";
      } catch { sonuc["Discord"] = "sorgulanamadı"; }
      try {
        const r = await fetch(`https://api.github.com/users/${u}`);
        sonuc["GitHub"] = r.status === 200 ? "BULUNDU" : "yok";
      } catch { sonuc["GitHub"] = "hata"; }
      try {
        const r = await fetch(`https://www.reddit.com/user/${u}/about.json`);
        sonuc["Reddit"] = r.status === 200 ? "BULUNDU" : "yok";
      } catch { sonuc["Reddit"] = "hata"; }
      return sonuc;
    },
  },

  "ip_sorgu": {
    ad: "IP Sorgu",
    ikon: "🌐",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "IP veya domain için konum, ISP ve zaman dilimi bilgisi.",
    girdiler: [{ ad: "q", etiket: "IP / Domain", tip: "text", placeholder: "8.8.8.8 veya google.com" }],
    calistir: async (p) => {
      const q = p.q.trim();
      if (!q) return { hata: "Boş" };
      const r = await fetch(`http://ip-api.com/json/${q}?lang=tr`);
      const d = await r.json();
      if (d.status !== "success") return { hata: d.message || "Başarısız" };
      delete d.status;
      delete d.query_type;
      return d;
    },
  },

  "benim_ip": {
    ad: "Benim IP'm",
    ikon: "📍",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Kendi IP ve konum bilgilerini gösterir.",
    girdiler: [],
    calistir: async () => {
      const r = await fetch("http://ip-api.com/json/?lang=tr");
      const d = await r.json();
      delete d.status;
      return d;
    },
  },

  "domain_geo": {
    ad: "Domain Geo",
    ikon: "🗺️",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Domain'in IP'sini ve konumunu bulur.",
    girdiler: [{ ad: "d", etiket: "Domain", tip: "text", placeholder: "google.com" }],
    calistir: async (p) => {
      const d = p.d.trim();
      if (!d) return { hata: "Boş" };
      const r = await fetch(`http://ip-api.com/json/${d}?lang=tr`);
      const j = await r.json();
      if (j.status !== "success") return { hata: j.message };
      delete j.status;
      return j;
    },
  },

  "mac_sorgu": {
    ad: "MAC Adresi Sorgu",
    ikon: "🔌",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "MAC adresinin üreticisini bulur.",
    girdiler: [{ ad: "m", etiket: "MAC", tip: "text", placeholder: "00:1A:2B" }],
    calistir: async (p) => {
      const m = p.m.trim().toUpperCase().replace(/-/g, ":");
      if (!m) return { hata: "Boş" };
      const r = await fetch(`https://api.macvendors.com/${m}`);
      if (!r.ok) return { hata: "Bulunamadı" };
      const t = await r.text();
      return { MAC: m, "Üretici": t };
    },
  },

  "email_breach": {
    ad: "Email Breach Check",
    ikon: "🛡️",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "E-posta adresinin sızmış olup olmadığını kontrol eder.",
    girdiler: [{ ad: "e", etiket: "Email", tip: "text", placeholder: "ornek@mail.com" }],
    calistir: async (p) => {
      const e = p.e.trim();
      if (!e.includes("@")) return { hata: "Geçersiz email" };
      const out = { Email: e };
      try {
        const r = await fetch(`https://api.xposedornot.com/v1/check-email/${e}`);
        if (r.ok) {
          const d = await r.json();
          const bs = d.breaches || [];
          out["XposedOrNot"] = Array.isArray(bs) && bs.length ? `${bs.length} breach` : "Temiz";
          if (Array.isArray(bs) && bs.length) out["Sızıntılar"] = bs.join(", ");
        }
      } catch { out["XposedOrNot"] = "hata"; }
      return out;
    },
  },

  "email_val": {
    ad: "Email Doğrula",
    ikon: "✉️",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Email formatını kontrol eder.",
    girdiler: [{ ad: "e", etiket: "Email", tip: "text", placeholder: "ornek@mail.com" }],
    calistir: async (p) => {
      const e = p.e.trim();
      const re = /^[\w.\-+]+@[\w\-]+\.[\w.\-]+$/;
      return { Email: e, Durum: re.test(e) ? "GEÇERLİ" : "GEÇERSİZ" };
    },
  },

  "gravatar": {
    ad: "Gravatar Kontrol",
    ikon: "👤",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Email ile Gravatar profilini kontrol eder.",
    girdiler: [{ ad: "e", etiket: "Email", tip: "text", placeholder: "ornek@mail.com" }],
    calistir: async (p) => {
      const e = p.e.trim().toLowerCase();
      if (!e) return { hata: "Boş" };
      const hash = md5(e);
      const url = `https://www.gravatar.com/avatar/${hash}?d=404`;
      const r = await fetch(url, { method: "HEAD" });
      return {
        Email: e,
        "MD5 Hash": hash,
        "Gravatar": r.status === 200 ? "VAR" : "yok",
        "Profil": `https://www.gravatar.com/${hash}`,
      };
    },
  },

  "github_user": {
    ad: "GitHub Kullanıcı",
    ikon: "🐙",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "GitHub kullanıcı bilgilerini çeker.",
    girdiler: [{ ad: "u", etiket: "Kullanıcı", tip: "text", placeholder: "torvalds" }],
    calistir: async (p) => {
      const u = p.u.trim();
      if (!u) return { hata: "Boş" };
      const r = await fetch(`https://api.github.com/users/${u}`);
      if (r.status !== 200) return { hata: "Bulunamadı" };
      const d = await r.json();
      return {
        Ad: d.name, Bio: d.bio, Repo: d.public_repos,
        Takipçi: d.followers, Konum: d.location,
        Email: d.email, Blog: d.blog, Kayıt: d.created_at,
        Profil: d.html_url,
      };
    },
  },

  "reddit_user": {
    ad: "Reddit Kullanıcı",
    ikon: "👽",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Reddit kullanıcı istatistikleri.",
    girdiler: [{ ad: "u", etiket: "Kullanıcı", tip: "text", placeholder: "spez" }],
    calistir: async (p) => {
      const u = p.u.trim();
      if (!u) return { hata: "Boş" };
      const r = await fetch(`https://www.reddit.com/user/${u}/about.json`);
      if (r.status !== 200) return { hata: "Bulunamadı" };
      const d = (await r.json()).data;
      return {
        Kullanıcı: d.name,
        "Link Karma": d.link_karma,
        "Yorum Karma": d.comment_karma,
        Kayıt: new Date(d.created_utc * 1000).toLocaleString('tr-TR'),
      };
    },
  },

  "dns_google": {
    ad: "DNS Sorgu (Google)",
    ikon: "🔍",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Google DNS üzerinden A, AAAA, MX, TXT, NS kayıtlarını çeker.",
    girdiler: [{ ad: "d", etiket: "Domain", tip: "text", placeholder: "google.com" }],
    calistir: async (p) => {
      const d = p.d.trim();
      if (!d) return { hata: "Boş" };
      const out = { Domain: d };
      for (const t of ["A", "AAAA", "MX", "TXT", "NS"]) {
        try {
          const r = await fetch(`https://dns.google/resolve?name=${d}&type=${t}`);
          const j = await r.json();
          const cevaplar = (j.Answer || []).map(a => a.data);
          if (cevaplar.length) out[t] = cevaplar.join(" | ");
        } catch {}
      }
      return out;
    },
  },

  "ipv6_sorgu": {
    ad: "IPv6 Sorgu",
    ikon: "🌍",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Domain'in AAAA kayıtlarını getirir.",
    girdiler: [{ ad: "d", etiket: "Domain", tip: "text", placeholder: "google.com" }],
    calistir: async (p) => {
      const d = p.d.trim();
      if (!d) return { hata: "Boş" };
      const r = await fetch(`https://dns.google/resolve?name=${d}&type=AAAA`);
      const j = await r.json();
      const cevaplar = (j.Answer || []).map(a => a.data);
      return { Domain: d, "IPv6": cevaplar.length ? cevaplar.join("\n") : "Yok" };
    },
  },

  "wayback": {
    ad: "Wayback Machine",
    ikon: "🕰️",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Arşivlenmiş site snapshot'ını bulur.",
    girdiler: [{ ad: "u", etiket: "URL", tip: "text", placeholder: "example.com" }],
    calistir: async (p) => {
      const u = p.u.trim();
      if (!u) return { hata: "Boş" };
      const r = await fetch(`http://archive.org/wayback/available?url=${u}`);
      const d = await r.json();
      const s = d.archived_snapshots?.closest;
      if (!s) return { hata: "Snapshot yok" };
      return {
        "Zaman": s.timestamp,
        "URL": s.url,
        "Durum": s.status,
      };
    },
  },

  "cve": {
    ad: "CVE Arama",
    ikon: "🛠️",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "NVD üzerinden CVE araması yapar.",
    girdiler: [{ ad: "q", etiket: "Kelime", tip: "text", placeholder: "apache" }],
    calistir: async (p) => {
      const q = p.q.trim();
      if (!q) return { hata: "Boş" };
      const r = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(q)}&resultsPerPage=10`);
      const d = await r.json();
      const list = (d.vulnerabilities || []).map(v => v.cve.id).join("\n");
      return { "Bulunan": (d.vulnerabilities || []).length, "CVE'ler": list || "Yok" };
    },
  },

  "telegram": {
    ad: "Telegram Kanal",
    ikon: "📢",
    kategori: "OSINT",
    sayfa: 1,
    aciklama: "Telegram kanal bilgilerini çeker.",
    girdiler: [{ ad: "u", etiket: "Kullanıcı (@)", tip: "text", placeholder: "durov" }],
    calistir: async (p) => {
      const u = p.u.trim().replace(/^@/, '');
      return {
        "Kanal Linki": `https://t.me/${u}`,
        "Önizleme": `https://t.me/s/${u}`,
      };
    },
  },

  "hash": {
    ad: "Hash / Base64 / URL",
    ikon: "#️⃣",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Metni MD5, SHA-1, SHA-256, Base64 ve URL encode eder.",
    girdiler: [{ ad: "t", etiket: "Metin", tip: "textarea", placeholder: "metin" }],
    calistir: async (p) => {
      const t = p.t;
      const enc = new TextEncoder().encode(t);
      const buf2hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join('');
      const md5_h = md5(t);
      const sha1 = buf2hex(await crypto.subtle.digest("SHA-1", enc));
      const sha256 = buf2hex(await crypto.subtle.digest("SHA-256", enc));
      const sha512 = buf2hex(await crypto.subtle.digest("SHA-512", enc));
      return {
        MD5: md5_h,
        "SHA-1": sha1,
        "SHA-256": sha256,
        "SHA-512": sha512,
        Base64: btoa(unescape(encodeURIComponent(t))),
        "URL Enc": encodeURIComponent(t),
      };
    },
  },

  "b64decode": {
    ad: "Base64 Çöz",
    ikon: "🔓",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Base64 kodlu metni çözer.",
    girdiler: [{ ad: "t", etiket: "Base64", tip: "textarea", placeholder: "aGVsbG8=" }],
    calistir: async (p) => {
      try {
        return { Sonuç: decodeURIComponent(escape(atob(p.t.trim()))) };
      } catch (e) { return { hata: "Geçersiz Base64" }; }
    },
  },

  "password_gen": {
    ad: "Şifre Üretici",
    ikon: "🔑",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Rastgele güvenli şifre üretir.",
    girdiler: [
      { ad: "uzunluk", etiket: "Uzunluk", tip: "number", placeholder: "16", varsayilan: 16 },
      { ad: "adet", etiket: "Adet", tip: "number", placeholder: "10", varsayilan: 10 },
    ],
    calistir: async (p) => {
      const n = parseInt(p.uzunluk) || 16;
      const c = parseInt(p.adet) || 10;
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+";
      const arr = [];
      for (let i = 0; i < c; i++) {
        let s = "";
        const bytes = crypto.getRandomValues(new Uint8Array(n));
        for (let j = 0; j < n; j++) s += chars[bytes[j] % chars.length];
        arr.push(s);
      }
      return { "Şifreler": arr.join("\n") };
    },
  },

  "uuid_gen": {
    ad: "UUID Üretici",
    ikon: "🆔",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "UUID v4 üretir.",
    girdiler: [{ ad: "adet", etiket: "Adet", tip: "number", placeholder: "5", varsayilan: 5 }],
    calistir: async (p) => {
      const n = parseInt(p.adet) || 5;
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(crypto.randomUUID());
      return { "UUID": arr.join("\n") };
    },
  },

  "jwt_decode": {
    ad: "JWT Decoder",
    ikon: "🎫",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "JWT token'ın header ve payload kısmını çözer.",
    girdiler: [{ ad: "j", etiket: "JWT", tip: "textarea", placeholder: "eyJ..." }],
    calistir: async (p) => {
      const j = p.j.trim();
      const parts = j.split(".");
      if (parts.length < 2) return { hata: "Geçersiz JWT" };
      try {
        const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,'+').replace(/_/g,'/')))));
        return {
          Header: JSON.stringify(dec(parts[0]), null, 2),
          Payload: JSON.stringify(dec(parts[1]), null, 2),
        };
      } catch (e) { return { hata: "Çözülemedi: " + e.message }; }
    },
  },

  "qr_gen": {
    ad: "QR Kod Üret",
    ikon: "📱",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Metinden QR kod üretir.",
    girdiler: [{ ad: "d", etiket: "İçerik", tip: "text", placeholder: "https://..." }],
    calistir: async (p) => {
      const d = p.d.trim();
      if (!d) return { hata: "Boş" };
      return {
        "QR URL": `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(d)}`,
        "İçerik": d,
      };
    },
  },

  "morse": {
    ad: "Morse Encoder",
    ikon: "📡",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Metni Morse koduna çevirir.",
    girdiler: [{ ad: "t", etiket: "Metin", tip: "text", placeholder: "SOS" }],
    calistir: async (p) => {
      const M = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'};
      const out = p.t.toUpperCase().split("").map(c => M[c] || (c === " " ? "/" : "?")).join(" ");
      return { Morse: out };
    },
  },

  "rot13": {
    ad: "ROT13 / Caesar",
    ikon: "🔄",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Sezar kaydırma şifresi uygular.",
    girdiler: [
      { ad: "t", etiket: "Metin", tip: "text", placeholder: "Merhaba" },
      { ad: "n", etiket: "Kaydırma", tip: "number", placeholder: "13", varsayilan: 13 },
    ],
    calistir: async (p) => {
      const n = parseInt(p.n) || 13;
      let out = "";
      for (const c of p.t) {
        if (c.match(/[a-z]/i)) {
          const b = c === c.toUpperCase() ? 65 : 97;
          out += String.fromCharCode((c.charCodeAt(0) - b + n + 26) % 26 + b);
        } else out += c;
      }
      return { Sonuç: out };
    },
  },

  "hex": {
    ad: "Hex Encode/Decode",
    ikon: "🔢",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Metni hex'e çevirir veya hex'i çözer.",
    girdiler: [{ ad: "t", etiket: "Metin / Hex", tip: "textarea", placeholder: "merhaba veya 6d6572..." }],
    calistir: async (p) => {
      const t = p.t.trim();
      const out = {};
      out["Hex Enc"] = Array.from(new TextEncoder().encode(t)).map(b => b.toString(16).padStart(2,'0')).join('');
      try { out["Hex Dec"] = new TextDecoder().decode(Uint8Array.from(t.match(/.{1,2}/g).map(b => parseInt(b, 16)))); } catch {}
      return out;
    },
  },

  "binary": {
    ad: "Binary Encoder",
    ikon: "💾",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Metni binary'e çevirir.",
    girdiler: [{ ad: "t", etiket: "Metin", tip: "text", placeholder: "ABC" }],
    calistir: async (p) => {
      const bin = p.t.split("").map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(" ");
      return { Binary: bin };
    },
  },

  "json_fmt": {
    ad: "JSON Formatla",
    ikon: "📋",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "JSON'u okunaklı hale getirir.",
    girdiler: [{ ad: "t", etiket: "JSON", tip: "textarea", placeholder: '{"a":1}' }],
    calistir: async (p) => {
      try { return { Sonuç: JSON.stringify(JSON.parse(p.t), null, 2) }; }
      catch (e) { return { hata: e.message }; }
    },
  },

  "url_parse": {
    ad: "URL Parser",
    ikon: "🔗",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "URL'yi bileşenlerine ayırır.",
    girdiler: [{ ad: "u", etiket: "URL", tip: "text", placeholder: "https://example.com/path?q=1" }],
    calistir: async (p) => {
      try {
        const u = new URL(p.u);
        return {
          Protocol: u.protocol, Host: u.hostname, Port: u.port,
          Path: u.pathname, Query: u.search, Hash: u.hash,
          Parametreler: u.searchParams.toString(),
        };
      } catch (e) { return { hata: "Geçersiz URL" }; }
    },
  },

  "user_agent": {
    ad: "Rastgele User-Agent",
    ikon: "🖥️",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Rastgele UA üretir.",
    girdiler: [{ ad: "adet", etiket: "Adet", tip: "number", placeholder: "5", varsayilan: 5 }],
    calistir: async (p) => {
      const n = parseInt(p.adet) || 5;
      const UAS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/119.0.0.0",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile",
      ];
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(UAS[Math.floor(Math.random() * UAS.length)]);
      return { "UA'lar": arr.join("\n") };
    },
  },

  "email_gen": {
    ad: "Rastgele Email",
    ikon: "📧",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Rastgele email adresleri üretir.",
    girdiler: [
      { ad: "d", etiket: "Domain", tip: "text", placeholder: "gmail.com", varsayilan: "gmail.com" },
      { ad: "adet", etiket: "Adet", tip: "number", placeholder: "5", varsayilan: 5 },
    ],
    calistir: async (p) => {
      const d = p.d || "gmail.com";
      const n = parseInt(p.adet) || 5;
      const arr = [];
      for (let i = 0; i < n; i++) {
        const u = Array.from(crypto.getRandomValues(new Uint8Array(10)))
          .map(b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
        arr.push(`${u}@${d}`);
      }
      return { "Emailler": arr.join("\n") };
    },
  },

  "luhn": {
    ad: "Luhn (Kart Kontrol)",
    ikon: "💳",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Kart numarasının Luhn algoritmasına uygunluğunu kontrol eder.",
    girdiler: [{ ad: "n", etiket: "Kart No", tip: "text", placeholder: "4111111111111111" }],
    calistir: async (p) => {
      const n = p.n.replace(/\s/g, "");
      if (!/^\d+$/.test(n)) return { hata: "Sadece rakam" };
      let s = 0;
      const dg = n.split("").map(Number).reverse();
      for (let i = 0; i < dg.length; i++) {
        let d = dg[i];
        if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
        s += d;
      }
      return { Kart: n, Durum: s % 10 === 0 ? "GEÇERLİ" : "GEÇERSİZ" };
    },
  },

  "time_tools": {
    ad: "Zaman Araçları",
    ikon: "⏰",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Şu anki zaman ve Unix timestamp.",
    girdiler: [],
    calistir: async () => {
      const n = new Date();
      return {
        "Şu an": n.toLocaleString('tr-TR'),
        "Unix": Math.floor(n.getTime() / 1000),
        "UTC": n.toISOString(),
        "Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    },
  },

  "sys_info": {
    ad: "Sistem Bilgisi",
    ikon: "💻",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "Tarayıcı ve sistem bilgisi.",
    girdiler: [],
    calistir: async () => {
      return {
        Platform: navigator.platform,
        "User Agent": navigator.userAgent,
        Dil: navigator.language,
        Ekran: `${screen.width}x${screen.height}`,
        "Pencere": `${window.innerWidth}x${window.innerHeight}`,
        CPU: navigator.hardwareConcurrency || "?",
        "Zaman Dilimi": Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    },
  },

  "headers_check": {
    ad: "Header Kontrol",
    ikon: "📨",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "HTTP header'ları kontrol eder (CORS engeli olabilir).",
    girdiler: [{ ad: "u", etiket: "URL", tip: "text", placeholder: "https://example.com" }],
    backendGerekli: true,
    calistir: async () => ({ hata: "Tarayıcıda CORS nedeniyle çalışmaz." }),
  },

  "redirect_check": {
    ad: "Redirect Kontrol",
    ikon: "↪️",
    kategori: "Araçlar",
    sayfa: 2,
    aciklama: "URL'nin son yönlendirmesini bulur (CORS gerekir).",
    girdiler: [{ ad: "u", etiket: "Kısa URL", tip: "text", placeholder: "https://bit.ly/..." }],
    backendGerekli: true,
    calistir: async () => ({ hata: "Tarayıcıda CORS nedeniyle çalışmaz." }),
  },

};

// MD5 (saf JS)
function md5(str) {
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function au(x, y) { const l = (x & 0xFFFF) + (y & 0xFFFF); return (((x >> 16) + (y >> 16) + (l >> 16)) << 16) | (l & 0xFFFF); }
  function cmn(q, a, b, x, s, t) { return au(rl(au(au(a, q), au(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
  function sb(s) {
    let i, nblk = ((s.length + 8) >> 6) + 1, blks = new Array(nblk * 16).fill(0);
    for (i = 0; i < s.length; i++) blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[nblk * 16 - 2] = s.length * 8;
    return blks;
  }
  function h2(n) {
    let s = "";
    for (let i = 0; i <= 3; i++) s += ((n >> (i * 8)) & 0xFF).toString(16).padStart(2, '0');
    return s;
  }
  function utf8(s) { return unescape(encodeURIComponent(s)); }
  str = utf8(str);
  const x = sb(str);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i], 7, -680876936); d = ff(d, a, b, c, x[i+1], 12, -389564586);
    c = ff(c, d, a, b, x[i+2], 17, 606105819); b = ff(b, c, d, a, x[i+3], 22, -1044525330);
    a = ff(a, b, c, d, x[i+4], 7, -176418897); d = ff(d, a, b, c, x[i+5], 12, 1200080426);
    c = ff(c, d, a, b, x[i+6], 17, -1473231341); b = ff(b, c, d, a, x[i+7], 22, -45705983);
    a = ff(a, b, c, d, x[i+8], 7, 1770035416); d = ff(d, a, b, c, x[i+9], 12, -1958414417);
    c = ff(c, d, a, b, x[i+10], 17, -42063); b = ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = ff(a, b, c, d, x[i+12], 7, 1804603682); d = ff(d, a, b, c, x[i+13], 12, -40341101);
    c = ff(c, d, a, b, x[i+14], 17, -1502002290); b = ff(b, c, d, a, x[i+15], 22, 1236535329);
    a = gg(a, b, c, d, x[i+1], 5, -165796510); d = gg(d, a, b, c, x[i+6], 9, -1069501632);
    c = gg(c, d, a, b, x[i+11], 14, 643717713); b = gg(b, c, d, a, x[i], 20, -373897302);
    a = gg(a, b, c, d, x[i+5], 5, -701558691); d = gg(d, a, b, c, x[i+10], 9, 38016083);
    c = gg(c, d, a, b, x[i+15], 14, -660478335); b = gg(b, c, d, a, x[i+4], 20, -405537848);
    a = gg(a, b, c, d, x[i+9], 5, 568446438); d = gg(d, a, b, c, x[i+14], 9, -1019803690);
    c = gg(c, d, a, b, x[i+3], 14, -187363961); b = gg(b, c, d, a, x[i+8], 20, 1163531501);
    a = gg(a, b, c, d, x[i+13], 5, -1444681467); d = gg(d, a, b, c, x[i+2], 9, -51403784);
    c = gg(c, d, a, b, x[i+7], 14, 1735328473); b = gg(b, c, d, a, x[i+12], 20, -1926607734);
    a = hh(a, b, c, d, x[i+5], 4, -378558); d = hh(d, a, b, c, x[i+8], 11, -2022574463);
    c = hh(c, d, a, b, x[i+11], 16, 1839030562); b = hh(b, c, d, a, x[i+14], 23, -35309556);
    a = hh(a, b, c, d, x[i+1], 4, -1530992060); d = hh(d, a, b, c, x[i+4], 11, 1272893353);
    c = hh(c, d, a, b, x[i+7], 16, -155497632); b = hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = hh(a, b, c, d, x[i+13], 4, 681279174); d = hh(d, a, b, c, x[i], 11, -358537222);
    c = hh(c, d, a, b, x[i+3], 16, -722521979); b = hh(b, c, d, a, x[i+6], 23, 76029189);
    a = hh(a, b, c, d, x[i+9], 4, -640364487); d = hh(d, a, b, c, x[i+12], 11, -421815835);
    c = hh(c, d, a, b, x[i+15], 16, 530742520); b = hh(b, c, d, a, x[i+2], 23, -995338651);
    a = ii(a, b, c, d, x[i], 6, -198630844); d = ii(d, a, b, c, x[i+7], 10, 1126891415);
    c = ii(c, d, a, b, x[i+14], 15, -1416354905); b = ii(b, c, d, a, x[i+5], 21, -57434055);
    a = ii(a, b, c, d, x[i+12], 6, 1700485571); d = ii(d, a, b, c, x[i+3], 10, -1894986606);
    c = ii(c, d, a, b, x[i+10], 15, -1051523); b = ii(b, c, d, a, x[i+1], 21, -2054922799);
    a = ii(a, b, c, d, x[i+8], 6, 1873313359); d = ii(d, a, b, c, x[i+15], 10, -30611744);
    c = ii(c, d, a, b, x[i+6], 15, -1560198380); b = ii(b, c, d, a, x[i+13], 21, 1309151649);
    a = ii(a, b, c, d, x[i+4], 6, -145523070); d = ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = ii(c, d, a, b, x[i+2], 15, 718787259); b = ii(b, c, d, a, x[i+9], 21, -343485551);
    a = au(a, oa); b = au(b, ob); c = au(c, oc); d = au(d, od);
  }
  return h2(a) + h2(b) + h2(c) + h2(d);
}
