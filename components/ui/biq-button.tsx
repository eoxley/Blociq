import * as React from 'react';

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean };

// Simple classnames helper if cn is not available
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export function BiqPrimary({ className, children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-white",
        "bg-gradient-to-r from-[#008C8F] to-[#7645ED]",
        "shadow-sm hover:brightness-110 hover:shadow-md active:scale-[0.99]",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300",
        "transition-all duration-150",
        className
      )}
    >
      {children}
    </button>
  );
}

export function BiqSecondary({ className, children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2",
        "bg-white text-gray-800 border border-gray-200",
        "hover:bg-gray-50 hover:border-gray-300",
        "shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300",
        "transition-all duration-150",
        className
      )}
    >
      {children}
    </button>
  );
}

// Compact variants for smaller screens
export function BiqPrimarySm(props: BtnProps) {
  return <BiqPrimary {...props} className={cn("px-3 py-1.5 text-sm", props.className)} />;
}

export function BiqSecondarySm(props: BtnProps) {
  return <BiqSecondary {...props} className={cn("px-3 py-1.5 text-sm", props.className)} />;
}
