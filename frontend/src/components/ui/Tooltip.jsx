import { useId } from 'react';
export function Tooltip({ content, children }) {
    const id = useId();
    return (<span aria-describedby={id} className="tooltip">
      {children}
      <span className="tooltip__content" id={id} role="tooltip">{content}</span>
    </span>);
}
