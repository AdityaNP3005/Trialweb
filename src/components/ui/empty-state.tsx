export function EmptyState({
    title,
    body,
    action,
    icon,
}: {
    title: string;
    body?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-[0.5rem] border border-dashed border-border px-6 py-12 text-center">
            {icon ? (
                <div className="grid size-10 place-items-center rounded-full border border-border text-muted">
                    {icon}
                </div>
            ) : null}
            <h3 className="display text-lg">{title}</h3>
            {body ? <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p> : null}
            {action ? <div className="mt-2">{action}</div> : null}
        </div>
    );
}
