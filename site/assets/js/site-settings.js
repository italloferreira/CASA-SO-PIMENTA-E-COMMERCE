var API = window.API_BASE_URL || 'http://localhost:3333';
var siteSettings = null;

function applySettings(settings) {
  siteSettings = settings;

  if (settings.store_name) {
    document.title = document.title.replace(/Casa Só Pimenta/g, settings.store_name);

    document.querySelectorAll('.footer-copyright, [data-copyright]').forEach(function (el) {
      el.textContent = el.textContent.replace(/Casa Só Pimenta[\s\S]*?Todos os direitos reservados/, settings.store_name + ' - ' + new Date().getFullYear() + ' - Todos os direitos reservados');
    });

    document.querySelectorAll('h1, h2, h3, p, span, strong').forEach(function (el) {
      if (el.textContent.trim() === 'Casa Só Pimenta' && el.tagName === 'H1') {
        el.textContent = settings.store_name;
      }
    });
  }

  if (settings.store_logo) {
    document.querySelectorAll('img[src*="logo.jpeg"], img[src*="logo.jpg"], img[src*="logo.png"]').forEach(function (img) {
      if (img.closest('header') || img.closest('.logo-section') || img.closest('a[href*="index"]')) {
        img.src = settings.store_logo;
      }
    });
  }

  if (settings.social_instagram) {
    document.querySelectorAll('a[href*="instagram.com"]').forEach(function (a) {
      a.href = 'https://www.instagram.com/' + settings.social_instagram.replace('@', '');
    });
  }

  if (settings.social_facebook) {
    document.querySelectorAll('a[href*="facebook.com"]').forEach(function (a) {
      a.href = 'https://web.facebook.com/' + settings.social_facebook.replace('@', '');
    });
  }

  if (settings.social_tiktok) {
    document.querySelectorAll('a[href*="tiktok.com"]').forEach(function (a) {
      a.href = 'https://www.tiktok.com/@' + settings.social_tiktok.replace('@', '');
    });
  }

  if (settings.pix_discount_percent) {
    document.querySelectorAll('[data-pix-discount]').forEach(function (el) {
      el.textContent = 'Desconto PIX (-' + settings.pix_discount_percent + '%)';
    });
  }

  if (settings.contact_address) {
    var addressEl = document.getElementById('storeAddress');
    if (addressEl) {
      addressEl.innerHTML = settings.contact_address.replace(/\n/g, '<br>');
    }
  }

  if (settings.store_hours) {
    var hoursEl = document.getElementById('storeHours');
    if (hoursEl) {
      hoursEl.textContent = settings.store_hours;
    }
  }

  document.querySelectorAll('[data-setting]').forEach(function (el) {
    var key = el.getAttribute('data-setting');
    var attr = el.getAttribute('data-setting-attr') || 'textContent';
    var fallback = el.getAttribute('data-setting-fallback') || '';
    var value = settings[key] !== undefined && settings[key] !== '' ? settings[key] : fallback;
    if (attr === 'textContent') {
      el.textContent = value;
    } else {
      el.setAttribute(attr, value);
    }
  });
}

(function () {
  fetch(API + '/api/settings')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.settings) {
        applySettings(data.settings);
      }
    })
    .catch(function () {});
})();
