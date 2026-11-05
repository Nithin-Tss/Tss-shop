// Site-wide language switching. The app has no per-string translations, so we use Google's website
// translator: it rewrites the text on the whole page (including pages rendered later by the router).
// The choice is saved in localStorage and in the `googtrans` cookie the translator reads.

export const SOURCE_LANGUAGE = "en";
const STORAGE_KEY = "tss-language";

// [code, English name, native name]
export const LANGUAGES = [
  ["af", "Afrikaans", "Afrikaans"],
  ["sq", "Albanian", "Shqip"],
  ["am", "Amharic", "አማርኛ"],
  ["ar", "Arabic", "العربية"],
  ["hy", "Armenian", "Հայերեն"],
  ["as", "Assamese", "অসমীয়া"],
  ["az", "Azerbaijani", "Azərbaycanca"],
  ["eu", "Basque", "Euskara"],
  ["be", "Belarusian", "Беларуская"],
  ["bn", "Bengali", "বাংলা"],
  ["bs", "Bosnian", "Bosanski"],
  ["bg", "Bulgarian", "Български"],
  ["ca", "Catalan", "Català"],
  ["ceb", "Cebuano", "Cebuano"],
  ["zh-CN", "Chinese (Simplified)", "简体中文"],
  ["zh-TW", "Chinese (Traditional)", "繁體中文"],
  ["co", "Corsican", "Corsu"],
  ["hr", "Croatian", "Hrvatski"],
  ["cs", "Czech", "Čeština"],
  ["da", "Danish", "Dansk"],
  ["nl", "Dutch", "Nederlands"],
  ["en", "English", "English"],
  ["eo", "Esperanto", "Esperanto"],
  ["et", "Estonian", "Eesti"],
  ["fil", "Filipino", "Filipino"],
  ["fi", "Finnish", "Suomi"],
  ["fr", "French", "Français"],
  ["fy", "Frisian", "Frysk"],
  ["gl", "Galician", "Galego"],
  ["ka", "Georgian", "ქართული"],
  ["de", "German", "Deutsch"],
  ["el", "Greek", "Ελληνικά"],
  ["gu", "Gujarati", "ગુજરાતી"],
  ["ht", "Haitian Creole", "Kreyòl ayisyen"],
  ["ha", "Hausa", "Hausa"],
  ["haw", "Hawaiian", "ʻŌlelo Hawaiʻi"],
  ["iw", "Hebrew", "עברית"],
  ["hi", "Hindi", "हिन्दी"],
  ["hmn", "Hmong", "Hmoob"],
  ["hu", "Hungarian", "Magyar"],
  ["is", "Icelandic", "Íslenska"],
  ["ig", "Igbo", "Igbo"],
  ["id", "Indonesian", "Bahasa Indonesia"],
  ["ga", "Irish", "Gaeilge"],
  ["it", "Italian", "Italiano"],
  ["ja", "Japanese", "日本語"],
  ["jw", "Javanese", "Basa Jawa"],
  ["kn", "Kannada", "ಕನ್ನಡ"],
  ["kk", "Kazakh", "Қазақша"],
  ["km", "Khmer", "ខ្មែរ"],
  ["rw", "Kinyarwanda", "Kinyarwanda"],
  ["ko", "Korean", "한국어"],
  ["ku", "Kurdish", "Kurdî"],
  ["ky", "Kyrgyz", "Кыргызча"],
  ["lo", "Lao", "ລາວ"],
  ["la", "Latin", "Latina"],
  ["lv", "Latvian", "Latviešu"],
  ["lt", "Lithuanian", "Lietuvių"],
  ["lb", "Luxembourgish", "Lëtzebuergesch"],
  ["mk", "Macedonian", "Македонски"],
  ["mg", "Malagasy", "Malagasy"],
  ["ms", "Malay", "Bahasa Melayu"],
  ["ml", "Malayalam", "മലയാളം"],
  ["mt", "Maltese", "Malti"],
  ["mi", "Maori", "Māori"],
  ["mr", "Marathi", "मराठी"],
  ["mn", "Mongolian", "Монгол"],
  ["my", "Myanmar (Burmese)", "မြန်မာ"],
  ["ne", "Nepali", "नेपाली"],
  ["no", "Norwegian", "Norsk"],
  ["ny", "Nyanja (Chichewa)", "Chichewa"],
  ["or", "Odia (Oriya)", "ଓଡ଼ିଆ"],
  ["ps", "Pashto", "پښتو"],
  ["fa", "Persian", "فارسی"],
  ["pl", "Polish", "Polski"],
  ["pt", "Portuguese", "Português"],
  ["pa", "Punjabi", "ਪੰਜਾਬੀ"],
  ["ro", "Romanian", "Română"],
  ["ru", "Russian", "Русский"],
  ["sm", "Samoan", "Gagana Samoa"],
  ["gd", "Scots Gaelic", "Gàidhlig"],
  ["sr", "Serbian", "Српски"],
  ["st", "Sesotho", "Sesotho"],
  ["sn", "Shona", "chiShona"],
  ["sd", "Sindhi", "سنڌي"],
  ["si", "Sinhala", "සිංහල"],
  ["sk", "Slovak", "Slovenčina"],
  ["sl", "Slovenian", "Slovenščina"],
  ["so", "Somali", "Soomaali"],
  ["es", "Spanish", "Español"],
  ["su", "Sundanese", "Basa Sunda"],
  ["sw", "Swahili", "Kiswahili"],
  ["sv", "Swedish", "Svenska"],
  ["tg", "Tajik", "Тоҷикӣ"],
  ["ta", "Tamil", "தமிழ்"],
  ["tt", "Tatar", "Татарча"],
  ["te", "Telugu", "తెలుగు"],
  ["th", "Thai", "ไทย"],
  ["tr", "Turkish", "Türkçe"],
  ["tk", "Turkmen", "Türkmençe"],
  ["uk", "Ukrainian", "Українська"],
  ["ur", "Urdu", "اردو"],
  ["ug", "Uyghur", "ئۇيغۇرچە"],
  ["uz", "Uzbek", "Oʻzbekcha"],
  ["vi", "Vietnamese", "Tiếng Việt"],
  ["cy", "Welsh", "Cymraeg"],
  ["xh", "Xhosa", "isiXhosa"],
  ["yi", "Yiddish", "ייִדיש"],
  ["yo", "Yoruba", "Yorùbá"],
  ["zu", "Zulu", "isiZulu"],
];

const RTL = new Set(["ar", "iw", "fa", "ur", "ps", "sd", "ug", "yi"]);

export function isSupportedLanguage(code) {
  return LANGUAGES.some(([c]) => c === code);
}

export function getLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isSupportedLanguage(saved)) return saved;
  } catch {
    /* storage unavailable */
  }
  return SOURCE_LANGUAGE;
}

function setCookie(code) {
  const value = code === SOURCE_LANGUAGE ? "" : `/${SOURCE_LANGUAGE}/${code}`;
  const host = window.location.hostname;
  const expiry =
    code === SOURCE_LANGUAGE ? "; expires=Thu, 01 Jan 1970 00:00:00 GMT" : "; max-age=31536000";
  document.cookie = `googtrans=${value}; path=/${expiry}`;
  // The translator also reads the cookie on the bare domain.
  if (host.includes(".")) document.cookie = `googtrans=${value}; path=/; domain=${host}${expiry}`;
}

let loading = null;

function loadTranslator() {
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    // Hidden mount point the translator needs.
    if (!document.getElementById("google_translate_element")) {
      const el = document.createElement("div");
      el.id = "google_translate_element";
      el.style.display = "none";
      document.body.appendChild(el);
    }
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        { pageLanguage: SOURCE_LANGUAGE, autoDisplay: false },
        "google_translate_element"
      );
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load the translation service"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// The translator swaps text nodes under React's feet; without this React throws when it later tries to
// remove or insert next to a node the translator has wrapped.
function patchDomForTranslator() {
  if (window.__tssDomPatched) return;
  window.__tssDomPatched = true;
  const { removeChild, insertBefore } = Node.prototype;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child);
  };
  Node.prototype.insertBefore = function (node, ref) {
    if (ref && ref.parentNode !== this) return node;
    return insertBefore.call(this, node, ref);
  };
}

function applyDirection(code) {
  document.documentElement.dir = RTL.has(code) ? "rtl" : "ltr";
}

function selectInWidget(code, tries = 0) {
  const combo = document.querySelector("select.goog-te-combo");
  if (!combo) {
    if (tries < 50) setTimeout(() => selectInWidget(code, tries + 1), 100);
    return;
  }
  combo.value = code === SOURCE_LANGUAGE ? "" : code;
  combo.dispatchEvent(new Event("change"));
}

// Switch the whole site to `code` and remember it.
export async function setLanguage(code) {
  if (!isSupportedLanguage(code)) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* storage unavailable */
  }
  setCookie(code);
  applyDirection(code);
  document.documentElement.lang = code;
  patchDomForTranslator();

  if (code === SOURCE_LANGUAGE) {
    // Restoring the original text is only reliable with a reload.
    if (document.querySelector("html.translated-ltr, html.translated-rtl"))
      window.location.reload();
    return;
  }
  await loadTranslator();
  selectInWidget(code);
}

// Call once at startup: re-applies the saved language on every page load.
export function initLanguage() {
  const code = getLanguage();
  if (code === SOURCE_LANGUAGE) return;
  setCookie(code);
  applyDirection(code);
  document.documentElement.lang = code;
  patchDomForTranslator();
  loadTranslator().catch(() => {});
}
