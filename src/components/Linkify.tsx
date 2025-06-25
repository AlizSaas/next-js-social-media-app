import Link from "next/link";
import { LinkIt, LinkItUrl } from "react-linkify-it";
import UserLinkWithTooltip from "./UserLinkWithTooltip";

interface LinkifyProps {
  children: React.ReactNode;
}

export default function Linkify({ children }: LinkifyProps) {
  return (
    <LinkifyUsername>
      <LinkifyHashtag>
        <LinkifyUrl>{children}</LinkifyUrl>
      </LinkifyHashtag>
    </LinkifyUsername>
  );
} // This component combines LinkifyUsername, LinkifyHashtag, and LinkifyUrl to linkify usernames, hashtags, and URLs in the provided children text.

function LinkifyUrl({ children }: LinkifyProps) {
  return (
    <LinkItUrl className="text-primary hover:underline">{children}</LinkItUrl>
  );
} // This component uses LinkItUrl to automatically linkify URLs in the provided children text.

function LinkifyUsername({ children }: LinkifyProps) {
  return (
    <LinkIt
      regex={/(@[a-zA-Z0-9_-]+)/} // Matches usernames starting with @ 
      component={(match, key) => (
        <UserLinkWithTooltip key={key} username={match.slice(1)}> 
          {match}
        </UserLinkWithTooltip>
      )}
    >
      {children}
    </LinkIt>
  );
} // This component matches usernames starting with @ and links them to user profiles using the UserLinkWithTooltip component. 

function LinkifyHashtag({ children }: LinkifyProps) {
  return (
    <LinkIt
      regex={/(#[a-zA-Z0-9]+)/} // Matches hashtags starting with #
      component={(match, key) => (
        <Link
          key={key}
          href={`/hashtag/${match.slice(1)}`}
          className="text-primary hover:underline"
        >
          {match}
        </Link>
      )}
    >
      {children}
    </LinkIt>
  );
} // This component matches hashtags starting with # and links them to a hashtag page.
// It uses the Link component from Next.js to create the link, applying styles for primary text and hover effects.