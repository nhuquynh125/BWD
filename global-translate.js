// Bơm CSS ẩn thanh banner Google Translate và tạo style cho nút floating
const style = document.createElement('style');
style.innerHTML = `
    .goog-te-banner-frame.skiptranslate, .goog-te-banner-frame { display: none !important; }
    body { top: 0px !important; position: static !important; }
    html { top: 0px !important; height: 100% !important; }
    #goog-gt-tt, .goog-te-balloon-frame { display: none !important; }
    .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
    #google_translate_element { display: none !important; }
    iframe.skiptranslate { display: none !important; }
    body > .skiptranslate { display: none !important; }
    .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc { display: none !important; }

    /* Floating language button styles */
    .floating-lang-wrapper {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 9999;
        font-family: 'Outfit', sans-serif;
    }
    .floating-lang-btn {
        background: rgba(10, 10, 11, 0.8);
        color: #d4af37;
        border: 1px solid #d4af37;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        backdrop-filter: blur(10px);
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;
    }
    .floating-lang-btn:hover {
        background: rgba(212, 175, 55, 0.1);
    }
    .floating-lang-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-bottom: 8px;
        background: rgba(10, 10, 11, 0.95);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 8px;
        min-width: 140px;
        display: none;
        flex-direction: column;
        overflow: hidden;
        backdrop-filter: blur(10px);
    }
    .floating-lang-dropdown a {
        color: #f8f9fa;
        text-decoration: none;
        padding: 10px 16px;
        font-size: 0.875rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        transition: background 0.3s;
    }
    .floating-lang-dropdown a:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #d4af37;
    }
`;
document.head.appendChild(style);

// Bơm Google Translate Script
function injectGoogleTranslate() {
    if (!document.querySelector('script[src*="translate.google.com"]')) {
        const gtDiv = document.createElement('div');
        gtDiv.id = 'google_translate_element';
        document.body.appendChild(gtDiv);

        window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement({
                pageLanguage: 'vi',
                includedLanguages: 'en,fr,ja,ko,zh-CN',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
            }, 'google_translate_element');
        };

        const gtScript = document.createElement('script');
        gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(gtScript);
    }
}

// Logic chuyển đổi ngôn ngữ
window.changeLanguage = function(lang) {
    if (lang === 'vi') {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname + ";";
    } else {
        document.cookie = "googtrans=/vi/" + lang + "; path=/;";
        document.cookie = "googtrans=/vi/" + lang + "; path=/; domain=" + window.location.hostname + ";";
    }
    
    // Ẩn các menu dropdown nếu đang mở
    const dropdown1 = document.getElementById('custom-lang-dropdown');
    if(dropdown1) dropdown1.style.display = 'none';
    const dropdown2 = document.getElementById('floating-lang-dropdown');
    if(dropdown2) dropdown2.style.display = 'none';
    
    window.location.reload();
};

window.toggleFloatingLang = function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('floating-lang-dropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }
};

document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('floating-lang-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        const dropdown = document.getElementById('floating-lang-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// Bơm nút floating nếu trên trang chưa có nút Language
function injectFloatingLang() {
    const isIndexPage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('\\index.html');
    if (!isIndexPage) return;

    if (!document.getElementById('custom-lang-wrapper') && !document.getElementById('floating-lang-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'floating-lang-wrapper';
        wrapper.className = 'floating-lang-wrapper';
        
        wrapper.innerHTML = `
            <div id="floating-lang-dropdown" class="floating-lang-dropdown">
                <a href="javascript:void(0)" onclick="changeLanguage('vi')">Tiếng Việt</a>
                <a href="javascript:void(0)" onclick="changeLanguage('en')">English</a>
                <a href="javascript:void(0)" onclick="changeLanguage('fr')">Français</a>
                <a href="javascript:void(0)" onclick="changeLanguage('ja')">日本語</a>
                <a href="javascript:void(0)" onclick="changeLanguage('ko')">한국어</a>
                <a href="javascript:void(0)" onclick="changeLanguage('zh-CN')">中文</a>
            </div>
            <button class="floating-lang-btn" onclick="toggleFloatingLang(event)">
                Language 🌐
            </button>
        `;
        document.body.appendChild(wrapper);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        injectGoogleTranslate();
        injectFloatingLang();
    });
} else {
    injectGoogleTranslate();
    injectFloatingLang();
}
