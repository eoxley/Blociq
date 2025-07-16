import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-error/50 text-error bg-error/5",
        success: "border-success/50 text-success bg-success/5",
        warning: "border-warning/50 text-warning bg-warning/5",
        info: "border-info/50 text-info bg-info/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

// Convenience components for different alert types
const AlertSuccess = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Alert ref={ref} variant="success" className={className} {...props}>
    <CheckCircle className="h-4 w-4" />
    {children}
  </Alert>
))
AlertSuccess.displayName = "AlertSuccess"

const AlertError = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Alert ref={ref} variant="destructive" className={className} {...props}>
    <XCircle className="h-4 w-4" />
    {children}
  </Alert>
))
AlertError.displayName = "AlertError"

const AlertWarning = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Alert ref={ref} variant="warning" className={className} {...props}>
    <AlertCircle className="h-4 w-4" />
    {children}
  </Alert>
))
AlertWarning.displayName = "AlertWarning"

const AlertInfo = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <Alert ref={ref} variant="info" className={className} {...props}>
    <Info className="h-4 w-4" />
    {children}
  </Alert>
))
AlertInfo.displayName = "AlertInfo"

export { Alert, AlertTitle, AlertDescription, AlertSuccess, AlertError, AlertWarning, AlertInfo } 