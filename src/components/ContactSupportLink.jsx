import { Link } from "react-router-dom";
import { useHelpAssistantAccess } from "@/components/HelpWidget";
import { CONTACT_PATH } from "@/lib/helpCenter";
import { openHelpChat } from "@/lib/helpChat";

// "Contact support" entry point. With the help assistant available the assistant answers first and offers
// "Talk to a human" (which raises the ticket); without it this is the plain link to the contact form.
export default function ContactSupportLink({ from, className, children }) {
  const assistant = useHelpAssistantAccess();
  if (assistant) {
    return (
      <button type="button" onClick={openHelpChat} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link to={CONTACT_PATH} state={{ from }} className={className}>
      {children}
    </Link>
  );
}
