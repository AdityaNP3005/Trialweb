import { cn } from "@/lib/utils/cn";

export function Label({
    className,
    ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return <label className={cn("label", className)} {...props} />;
}

export function Input({
    className,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn("field", className)} {...props} />;
}

export function Textarea({
    className,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn("field min-h-24 resize-y", className)} {...props} />;
}

export function Select({
    className,
    children,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select className={cn("field pr-8", className)} {...props}>
            {children}
        </select>
    );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
    if (!children) return null;
    return <p className="mt-1.5 text-xs text-danger">{children}</p>;
}
