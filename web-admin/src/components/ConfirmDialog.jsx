
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar' }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-slate-400 text-sm mt-2">{message}</p>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onCancel} className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}