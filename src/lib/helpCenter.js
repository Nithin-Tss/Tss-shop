// Content and helpers for the Help Center (/admin/help). Pure data, no React.
//
// The articles marked "guide" below are copied from Tss-backend/apps/assistant/knowledge/admin_guide.md. The
// others were written from the admin pages themselves; every label, button and message in them is quoted from
// the page source. Keep it that way: do not add a label that is not on screen.

// TODO(owner): replace this with your real support address or page before launch. "mailto:" opens the visitor's
// email app; an https:// address opens that page instead.
export const SUPPORT_URL = "mailto:support@example.com";

// The Contact support page: /admin/help/contact. Its slug must never be a category or article slug.
export const CONTACT_SLUG = "contact";
export const CONTACT_PATH = `/admin/help/${CONTACT_SLUG}`;

// My support tickets: /admin/help/tickets (the list) and /admin/help/tickets/<id> (one conversation).
// "tickets" must never be a category or article slug either.
export const TICKETS_PATH = "/admin/help/tickets";
export const ticketPath = (id) => `${TICKETS_PATH}/${id}`;

// The pages an article may offer a button for. This mirrors ACTIONS in Tss-backend/apps/assistant/actions.py
// (label, path, and the permission the page itself needs, see RequirePermission in App.jsx). An article names a
// key from here, never a path of its own, and the button is shown only to a member who holds `permission`.
export const OPEN_PAGES = {
  online_store: { label: "Open Online Store", path: "/admin/online-store", permission: "themes.view" },
  customize: {
    label: "Open Customize",
    path: "/admin/online-store/customize",
    permission: "themes.manage",
  },
  code: { label: "Open Code editor", path: "/admin/online-store/code", permission: "themes.manage" },
  add_product: {
    label: "Add product",
    path: "/admin/online-store/products/new",
    permission: "products.manage",
  },
  products: {
    label: "Open Products",
    path: "/admin/online-store/products",
    permission: "products.view",
  },
  discounts: {
    label: "Open Discounts",
    path: "/admin/online-store/discounts",
    permission: "discounts.view",
  },
  menus: {
    label: "Open Menus",
    path: "/admin/online-store/content/menus",
    permission: "themes.manage",
  },
  pages: { label: "Open Pages", path: "/admin/online-store/pages", permission: "themes.manage" },
};

// Category slugs must never equal an article slug: /admin/help/:topic is either one.
export const CATEGORIES = [
  {
    slug: "online-store",
    title: "Online store",
    summary: "Your theme: header, footer, code and going live.",
  },
  {
    slug: "products",
    title: "Products",
    summary: "Add products, change prices and group them into collections.",
  },
  {
    slug: "discounts",
    title: "Discounts",
    summary: "Codes and automatic offers, with limits and dates.",
  },
  {
    slug: "menus",
    title: "Menus",
    summary: "Navigation menus and redirects from old addresses.",
  },
  {
    slug: "pages",
    title: "Pages",
    summary: "Pages such as About us, and how they appear in search.",
  },
];

// `open`: a key of OPEN_PAGES, or null when no button is offered. Articles are listed in the order they show.
export const ARTICLES = [
  // ---- Online store (guide) ----
  {
    slug: "logo-text",
    category: "online-store",
    title: "Change the logo text in the header",
    keywords: [
      "logo",
      "logo text",
      "brand name",
      "store name",
      "header text",
      "name in header",
      "site name",
    ],
    open: "customize",
    steps: [
      `Open the Online Store page and click "Edit theme" on your theme.`,
      `In the list on the left, under "Header", click the "Header" row (Announcement, logo and navigation).`,
      `Find "Logo text" and type your text.`,
      `Wait a moment: changes in the customizer are saved automatically.`,
    ],
    note: `Leave "Logo text" empty to show your store name. If "Logo image" is set, the image is shown instead of the text. The file behind this is sections/header.liquid.`,
  },
  {
    slug: "logo-image",
    category: "online-store",
    title: "Use a logo image in the header",
    keywords: [
      "logo image",
      "logo picture",
      "upload logo",
      "change logo",
      "logo size",
      "logo height",
      "logo position",
      "logo left",
      "logo centre",
    ],
    open: "customize",
    steps: [
      `Open the Online Store page and click "Edit theme" on your theme.`,
      `Under "Header", click the "Header" row.`,
      `Set "Logo image" to your picture.`,
      `Use "Logo image height" to change its size, and "Logo position" to choose Left or Centred.`,
    ],
    note: "The image is shown instead of the logo text. Changes save automatically.",
  },
  {
    slug: "announcement-bar",
    category: "online-store",
    title: "Change or hide the announcement bar",
    keywords: [
      "announcement",
      "announcement bar",
      "banner",
      "top banner",
      "notice",
      "promo bar",
      "announcement text",
      "free delivery banner",
    ],
    open: "customize",
    steps: [
      `Open the Online Store page and click "Edit theme" on your theme.`,
      `Under "Header", click the "Header" row.`,
      `Type your message in "Announcement text".`,
      `Optional: "Announcement link" makes the whole banner a link. "Announcement colour" and "Announcement text colour" change the colours.`,
      `To hide the bar, clear "Announcement text".`,
    ],
    note: "The banner sits above the header. Changes save automatically. The file behind this is sections/header.liquid.",
  },
  {
    slug: "header-menu-links",
    category: "online-store",
    title: "Add or change the links in the header menu",
    keywords: [
      "header menu",
      "navigation",
      "nav",
      "menu link",
      "header links",
      "add link",
      "top menu",
      "main menu links",
    ],
    open: "customize",
    steps: [
      `Open the Online Store page and click "Edit theme" on your theme.`,
      `Under "Header", click the "Header" row.`,
      `In "Blocks", click "+ Add block" and choose "Menu link".`,
      `Set "Label" (the text shoppers see) and "Link" (a page of your store such as /collections/all, or a full web address).`,
      `Click an existing "Menu link" block to change its "Label" or "Link".`,
    ],
    note: `The header has room for up to 12 blocks. "Show the navigation menu" turns the menu on or off. With no menu links, "Collections in the automatic menu" sets how many collections are listed. Changes save automatically.`,
  },
  {
    slug: "footer",
    category: "online-store",
    title: "Edit the footer",
    keywords: [
      "footer",
      "copyright",
      "utility bar",
      "footer links",
      "footer text",
      "footer logo",
      "contact details in footer",
      "phone in footer",
      "bottom of page",
    ],
    open: "customize",
    steps: [
      `Open the Online Store page and click "Edit theme" on your theme.`,
      `In the list on the left, click the "Footer" row (Links, social and copyright).`,
      `For the line at the very bottom, change "Copyright line". Leave it empty to show the year and the store name.`,
      `For a thin strip with contact details, tick "Show the utility bar", then fill "Utility bar text", "Phone number" and "Email address".`,
      `For the footer's content, use "Blocks" and add as many as you like: "Logo and text", "Menu column", "Social links", "Text", "Newsletter" and "Payment icons". In a "Menu column", add links and pick where each goes, or choose "A menu in Admin > Menus" to follow one of your menus. In "Social links", add a network and its address for each icon.`,
      `For the line at the bottom, tick which policies to link. "Accordion on mobile" folds the menu columns on phones.`,
    ],
    note: "Changes save automatically. The file behind this is sections/footer.liquid.",
  },
  {
    slug: "edit-theme-code",
    category: "online-store",
    title: "Edit theme code (the code editor)",
    keywords: [
      "code",
      "theme code",
      "edit code",
      "code editor",
      "liquid",
      "css",
      "javascript",
      "html",
      "template file",
      "edit file",
      "custom code",
    ],
    open: "code",
    steps: [
      `Open the Online Store page, click the "⋯" menu on your theme and choose "Edit code".`,
      `In the file list on the left, open a folder (layout, sections, snippets or templates) and click a file. The "Search" box finds files.`,
      `Edit the file in the editor.`,
      `Click "Save" (or press Ctrl+S, Cmd+S on a Mac).`,
      `To go back, click "Return to theme customizer".`,
    ],
    note: `A saved file is live on your store straight away. "History" shows the last 20 versions of the open file. Only .liquid, .css, .js and .json files are allowed. "New File" and "New Folder" are at the top of the file list.`,
  },
  {
    slug: "edit-header-footer-code",
    category: "online-store",
    title: "Edit the header or footer in code",
    keywords: [
      "header code",
      "footer code",
      "header.liquid",
      "footer.liquid",
      "edit header html",
      "edit footer html",
      "header file",
      "footer file",
    ],
    open: "code",
    steps: [
      `Open the Online Store page, click the "⋯" menu on your theme and choose "Edit code".`,
      `Open the "sections" folder.`,
      `For the header (announcement bar, logo, navigation) open "header.liquid". For the footer open "footer.liquid".`,
      `Edit the file and click "Save".`,
    ],
    note: `These two files also define the options shown in the customizer. After you save, the customizer's Header or Footer options follow the file. The customizer's "Header" and "Footer" rows also have an "Edit code" link that opens the same file.`,
  },
  {
    slug: "publish-theme",
    category: "online-store",
    title: "Publish a different theme",
    keywords: [
      "publish",
      "publish theme",
      "make live",
      "switch theme",
      "change theme",
      "go live",
      "live theme",
      "new theme",
    ],
    open: "online_store",
    steps: [
      "Open the Online Store page.",
      `Find the theme under "Draft themes" (the theme in use is shown at the top of the page).`,
      `Click "Publish" on it.`,
      "Confirm the question that appears. It says which theme it replaces.",
    ],
    note: "The theme being replaced stays in your themes as a draft.",
  },

  // ---- Products ----
  {
    slug: "add-product",
    category: "products",
    title: "Add a product",
    keywords: [
      "add product",
      "new product",
      "create product",
      "product",
      "list a bottle",
      "add item",
      "upload product",
      "new item",
    ],
    open: "add_product",
    steps: [
      `Open "Products" and click "Add product".`,
      `Under "Basic info", fill in "Product name" and "About this product".`,
      `Add pictures under "Media".`,
      `Under "Pricing", set "Selling price".`,
      `Under "Stock", set "SKU" and, for each location, the "Quantity".`,
      `Under "Organize", choose "Category", "Product type" and "Vendor".`,
      `Under "Visibility", choose "Active" (shoppers can find and buy it), "Draft" (only you can see it) or "Archived".`,
      `Under "Sales channels", choose where to sell it, then click "Save product".`,
    ],
    note: `Choose "Draft" if the product is not ready to sell.`,
  },
  {
    slug: "product-price-visibility",
    category: "products",
    title: "Change a product's price or hide it from the store",
    keywords: [
      "change price",
      "edit price",
      "update price",
      "price",
      "hide product",
      "unpublish",
      "draft",
      "archive product",
      "visibility",
      "edit product",
    ],
    open: "products",
    steps: [
      `Open "Products" and click the product.`,
      `To change the price, edit "Selling price" under "Pricing".`,
      `To hide it, under "Visibility" choose "Draft" (only you can see it) or "Archived" (hidden and kept for your records). Choose "Active" to show it again.`,
      `Click "Save changes".`,
    ],
    note: null,
  },
  {
    slug: "create-collection",
    category: "products",
    title: "Group products into a collection",
    keywords: [
      "collection",
      "collections",
      "add collection",
      "create collection",
      "group products",
      "category page",
      "manual collection",
      "automated collection",
    ],
    open: null,
    steps: [
      `Open the "Collections" page and click "Add collection".`,
      `Fill in "Title", for example Summer collection. You can also write a "Description".`,
      `Under "Products", choose "Manual" or "Automated".`,
      `With "Manual", click "Add products" and pick the products to include. With "Automated", set the conditions under "Products must match".`,
      `Under "Publishing", set "Status" to "Active" or "Draft". The switch "Show on the Online Store" controls whether it appears on your store.`,
      `Click "Save".`,
    ],
    note: "Draft collections are hidden from your store.",
  },

  // ---- Discounts ----
  {
    slug: "create-discount",
    category: "discounts",
    title: "Create a discount or coupon code",
    keywords: [
      "discount",
      "coupon",
      "promo",
      "promo code",
      "discount code",
      "offer",
      "sale",
      "percentage off",
      "amount off",
      "free shipping",
      "buy x get y",
      "voucher",
    ],
    open: "discounts",
    steps: [
      `Open "Discounts" and click "Create discount".`,
      `Choose the type: "Amount off products", "Buy X get Y", "Amount off order" or "Free shipping".`,
      `Under "Method" choose "Discount code" (shoppers type a code; "Generate random code" makes one) or "Automatic discount" (applied by itself; give it a "Title").`,
      `Under "Value" choose "Percentage (%)" or "Fixed amount ($)" and enter the amount.`,
      `Optional: "Minimum purchase requirements", "Maximum discount uses", and "Active dates" (set a "Start date").`,
      `Click "Save discount".`,
    ],
    note: `"Amount off products" and "Amount off order" have "Value". "Buy X get Y" has "Customer buys" and "Customer gets". "Free shipping" has "Countries" and "Shipping rates".`,
  },
  {
    slug: "limit-discount-uses",
    category: "discounts",
    title: "Limit how often a discount can be used",
    keywords: [
      "limit uses",
      "maximum uses",
      "usage limit",
      "one per customer",
      "limit discount",
      "times used",
      "discount limit",
      "coupon limit",
    ],
    open: "discounts",
    steps: [
      `Open "Discounts", click "Create discount" and choose a type.`,
      `Find the "Maximum discount uses" section.`,
      `To cap the total, tick "Limit number of times this discount can be used in total" and enter a number.`,
      `To allow each customer one use, tick "Limit to one use per customer".`,
      `Click "Save discount".`,
    ],
    note: `With the per-customer limit, the customer's email or phone number is checked at checkout. The "Used" column on the Discounts page shows how many times each discount has been used.`,
  },
  {
    slug: "schedule-discount",
    category: "discounts",
    title: "Schedule a discount with start and end dates",
    keywords: [
      "schedule",
      "start date",
      "end date",
      "active dates",
      "expire",
      "expiry",
      "limited time",
      "end time",
      "discount dates",
    ],
    open: "discounts",
    steps: [
      `Open "Discounts", click "Create discount" and choose a type.`,
      `Find the "Active dates" section.`,
      `Set the "Start date" and "Start time".`,
      `To end it automatically, tick "Set end date", then set the "End date" and "End time".`,
      `Click "Save discount".`,
    ],
    note: `The end date must be after the start date. On the Discounts page, the "Status" column shows "Active" or "Expired".`,
  },

  // ---- Menus ----
  {
    slug: "create-menu",
    category: "menus",
    title: "Create or edit a menu",
    keywords: [
      "menu",
      "menus",
      "create menu",
      "footer menu",
      "main menu",
      "menu item",
      "navigation menu",
      "url redirect",
    ],
    open: "menus",
    steps: [
      `Open "Content", then "Menus".`,
      `Click "Create menu" (or open an existing menu to change it).`,
      `Fill in "Title", for example Main menu or Footer menu, and the "Handle".`,
      `Click "+ Add menu item", then fill in "Link name" and "Link".`,
      `Click "Save menu".`,
    ],
    note: `"URL redirects" on the same page sends an old address to a new one. The links shown in the theme's header are edited in the customizer (see "Add or change the links in the header menu").`,
  },
  {
    slug: "edit-menu",
    category: "menus",
    title: "Reorder, remove or delete menu items",
    keywords: [
      "reorder menu",
      "move menu item",
      "remove menu item",
      "delete menu",
      "edit menu",
      "change menu",
      "menu order",
      "sub-link",
    ],
    open: "menus",
    steps: [
      `Open "Menus" and click the menu you want to change.`,
      `To reorder, use the up and down buttons on an item ("Move item up", "Move item down").`,
      `To take an item out, use its "Remove menu item" button.`,
      `Click "Save menu". You will see "Menu updated successfully."`,
      `To remove the whole menu, click "Delete menu" and confirm the question that appears.`,
    ],
    note: `"Cancel" leaves the menu as it was. The table on the Menus page shows each menu's items, or "No menu items" when it is empty.`,
  },
  {
    slug: "url-redirects",
    category: "menus",
    title: "Redirect an old address to a new one",
    keywords: [
      "redirect",
      "url redirect",
      "301",
      "old url",
      "old address",
      "moved page",
      "broken link",
      "redirect from",
    ],
    open: "menus",
    steps: [
      `Open "Menus" and click "URL redirects".`,
      `Under "Create new URL redirect", fill in "Redirect from" (for example /old-page-path) and "Redirect to" (a path such as /new-page-path, or a full address starting with https://).`,
      `Click "Add redirect".`,
      `To change one, click "Edit" next to it, change the fields and click "Update redirect".`,
      `To remove one, click "Delete" next to it and confirm.`,
    ],
    note: `Both fields are required. The list shows "No URL redirects configured yet." until you add one.`,
  },

  // ---- Pages ----
  {
    slug: "add-page",
    category: "pages",
    title: "Add a page such as About or Contact",
    keywords: [
      "page",
      "add page",
      "new page",
      "about page",
      "contact page",
      "policy page",
      "create page",
      "store page",
    ],
    open: "pages",
    steps: [
      `Open "Pages" and click "Add page".`,
      `Fill in "Title" and "Content".`,
      `Choose "Visible" to publish it, or "Hidden" to keep it private.`,
      `Click "Save".`,
    ],
    note: "A visible page appears on your store at /pages/ followed by its handle.",
  },
  {
    slug: "edit-page",
    category: "pages",
    title: "Edit a page or change who can see it",
    keywords: [
      "edit page",
      "change page",
      "update page",
      "hide page",
      "show page",
      "page visibility",
      "page template",
      "view on store",
    ],
    open: "pages",
    steps: [
      `Open "Pages" and click the page in the list. The list shows each page's Title, Visibility, Address and Last updated.`,
      `Change "Title" or "Content".`,
      `Under "Visibility", choose "Visible" or "Hidden".`,
      `Optional: under "Template", pick a template. "Default page" is the first choice.`,
      `Click "Save".`,
    ],
    note: `For a saved page that is visible, "View on store" opens it on your store. "Back to pages" returns to the list.`,
  },
  {
    slug: "page-search-listing",
    category: "pages",
    title: "Set how a page appears in search engines",
    keywords: [
      "seo",
      "search engine",
      "search engine listing",
      "meta description",
      "page title",
      "url handle",
      "slug",
      "page address",
    ],
    open: "pages",
    steps: [
      `Open "Pages" and click a page (or click "Add page").`,
      `In "Search engine listing", click the pencil button ("Edit search engine listing").`,
      `Fill in "Page title" and "Meta description". If "Page title" is empty, the page's title is used.`,
      `Change "URL handle (slug)" to set the address. If it is empty, it is made from the title.`,
      `Click "Save".`,
    ],
    note: `The page is shown at /pages/ followed by its handle.`,
  },
  {
    slug: "delete-page",
    category: "pages",
    title: "Delete a page",
    keywords: ["delete page", "remove page", "erase page", "get rid of page"],
    open: "pages",
    steps: [
      `Open "Pages" and click the page in the list.`,
      `Click "Delete page" in the side column.`,
      `Confirm the question that appears.`,
      `You will see "Page deleted."`,
    ],
    note: `Deleting cannot be undone. To keep a page but stop showing it, choose "Hidden" under "Visibility" and click "Save" instead.`,
  },
];

export const getCategory = (slug) => CATEGORIES.find((c) => c.slug === slug) || null;

export const getArticle = (slug) => ARTICLES.find((a) => a.slug === slug) || null;

export const articlesIn = (categorySlug) => ARTICLES.filter((a) => a.category === categorySlug);

// The first three articles of a category: what its card on the Help home shows
export const topArticles = (categorySlug, count = 3) => articlesIn(categorySlug).slice(0, count);

// Other articles of the same category
export const relatedArticles = (article, count = 4) =>
  article ? articlesIn(article.category).filter((a) => a.slug !== article.slug).slice(0, count) : [];

// The first line of the first step: what a result or list row shows under its title
export const firstLine = (article) => article?.steps?.[0] || "";

export const helpPath = (slug) => `/admin/help/${slug}`;

// Every word you type must appear in the title or the keywords. Title matches come first, then the
// order of the articles. No query, no results.
export function searchArticles(query, limit = 8) {
  const words = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return [];

  const scored = [];
  ARTICLES.forEach((article, index) => {
    const title = article.title.toLowerCase();
    const keywords = article.keywords.join(" ").toLowerCase();
    let inTitle = 0;
    for (const word of words) {
      if (title.includes(word)) inTitle += 1;
      else if (!keywords.includes(word)) return;
    }
    scored.push({ article, inTitle, index });
  });
  scored.sort((a, b) => b.inTitle - a.inTitle || a.index - b.index);
  return scored.slice(0, limit).map((entry) => entry.article);
}
