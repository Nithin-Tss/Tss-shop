// Keeps the Customize editor and the theme code editor in step when both are open
// (e.g. in two tabs): whichever one saves tells the other, which then reloads.
//
//   kind "settings": the customizer's settings changed (sections, blocks, colours, header, footer ...)
//   kind "code":     a Liquid file changed

const CHANNEL = "tss-theme-sync";
const tabId = Math.random().toString(36).slice(2);

function open() {
  try {
    return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
}

export function announceThemeChange(kind) {
  const channel = open();
  if (!channel) return;
  channel.postMessage({ tabId, kind });
  channel.close();
}

// Calls `callback(kind)` when ANOTHER tab saved a change. Returns the function that stops listening.
export function onThemeChange(callback) {
  const channel = open();
  if (!channel) return () => {};
  channel.onmessage = (event) => {
    if (event.data?.tabId !== tabId) callback(event.data.kind);
  };
  return () => channel.close();
}
