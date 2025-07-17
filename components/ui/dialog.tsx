import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof RadixDialog.Content>>(
  ({ children, ...props }, ref) => (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 bg-black/30 z-40" />
      <RadixDialog.Content ref={ref} className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 max-w-lg w-full" {...props}>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

export const DialogTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold mb-2">{children}</h2>
);

export const DialogFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="flex justify-end gap-2 mt-6">{children}</div>
); 