// Lets any page open the floating Help chat (components/HelpWidget.jsx) without owning its state.
const EVENT = "tss-open-help-chat";

export const openHelpChat = () => window.dispatchEvent(new Event(EVENT));

export function onOpenHelpChat(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
