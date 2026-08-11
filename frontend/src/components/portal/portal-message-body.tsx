import { splitPortalMessageBodyWithLinks } from "@/lib/portal-messages.shared";

const PORTAL_MESSAGE_LINK_CLASSNAME =
  "font-semibold text-dojo-red underline decoration-dojo-red underline-offset-[3px] break-all transition hover:text-dojo-red-hover";

interface PortalMessageBodyProps {
  body: string;
  className?: string;
}

/**
 * Renders portal message plain text with clickable http(s)/www links that open
 * in the browser (new tab). Does not interpret HTML from the message body.
 */
export function PortalMessageBody({ body, className }: PortalMessageBodyProps) {
  const segments = splitPortalMessageBodyWithLinks(body);

  return (
    <div
      className={
        className ??
        "whitespace-pre-wrap text-sm leading-relaxed text-dojo-white"
      }
    >
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`text-${index}`}>{segment.value}</span>;
        }

        return (
          <a
            key={`link-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={PORTAL_MESSAGE_LINK_CLASSNAME}
          >
            {segment.value}
          </a>
        );
      })}
    </div>
  );
}
