import type { PropsWithChildren, ReactNode } from 'react';

interface CollapsibleSectionProps extends PropsWithChildren {
  title: string;
  description?: string;
  meta?: ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({
  title,
  description,
  meta,
  className,
  contentClassName,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) => (
  <details
    className={`collapsible-panel${className ? ` ${className}` : ''}`}
    open={defaultOpen || undefined}
  >
    <summary>
      <div className="collapsible-panel__summary-copy">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      {meta ? <div className="collapsible-panel__summary-meta">{meta}</div> : null}
    </summary>
    <div className={`collapsible-panel__content${contentClassName ? ` ${contentClassName}` : ''}`}>
      {children}
    </div>
  </details>
);

export default CollapsibleSection;
