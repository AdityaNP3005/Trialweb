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
        <div className="surface-card flex flex-col items-center gap-3 px-6 py-12 text-center">
            {icon ? (
                <div className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
                    {icon}
                </div>
            ) : null}
            <h3 className="text-base font-bold">{title}</h3>
            {body ? <p className="max-w-sm text-sm text-muted">{body}</p> : null}
            {action ? <div className="mt-2">{action}</div> : null}
        </div>
    );
}
