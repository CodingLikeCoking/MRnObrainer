import { PrettyLink } from "./pretty-link";

export const FeatureRequestLink: React.FC<{ className?: string }> = ({
  className,
}) => (
  <PrettyLink
    className={className}
    variant="outline"
    href="https://github.com/CodingLikeCoking/MRnObrainer/issues/new"
  >
    <span className="mr-2">want to be featured here? reach out</span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </PrettyLink>
);
