import { useState, useEffect } from 'react';
import { useSaveActivityDraft } from '../hooks/useActivities';

export const TrueFalseActivityModal = ({ isOpen, onClose, initialData = null }) => {
  const [title, setTitle] = useState('');
  const [statements, setStatements] = useState([]);

  const { mutate, isPending, isError } = useSaveActivityDraft();

  // Sincronización del estado cuando cambia la data inicial o se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setStatements(
        initialData?.content?.statements || [
          { id: crypto.randomUUID(), text: '', correctAnswer: true }
        ]
      );
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleAddStatement = () => {
    setStatements((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: '', correctAnswer: true }
    ]);
  };

  const handleRemoveStatement = (id) => {
    if (statements.length <= 1) return;
    setStatements((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStatementChange = (id, field, value) => {
    setStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const payload = {
      id: initialData?.id,
      title,
      gameType: 'true_false',
      content: {
        statements: statements.map((s, index) => ({
          id: s.id,
          text: s.text,
          correctAnswer: s.correctAnswer,
          order: index + 1,
        })),
      },
    };

    mutate(payload, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 text-white shadow-2xl">
        <h2 className="text-lg font-semibold italic text-white">
          {initialData ? 'Editar' : 'Crear'} actividad Verdadero / Falso
        </h2>

        <input
          type="text"
          className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          placeholder="Título de la actividad"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="space-y-3">
          {statements.map((stmt) => (
            <div key={stmt.id} className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 p-2 rounded">
              <input
                type="text"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                placeholder="Escribe la premisa..."
                value={stmt.text}
                onChange={(e) => handleStatementChange(stmt.id, 'text', e.target.value)}
              />
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded font-medium ${
                  stmt.correctAnswer ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
                onClick={() => handleStatementChange(stmt.id, 'correctAnswer', true)}
              >
                Verdadero
              </button>
              <button
                type="button"
                className={`px-2 py-1 text-xs rounded font-medium ${
                  !stmt.correctAnswer ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
                onClick={() => handleStatementChange(stmt.id, 'correctAnswer', false)}
              >
                Falso
              </button>
              <button
                type="button"
                className="border border-red-500 text-red-400 hover:bg-red-500/10 rounded px-2 py-1 text-xs"
                onClick={() => handleRemoveStatement(stmt.id)}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm text-blue-400 font-medium"
          onClick={handleAddStatement}
        >
          + Agregar afirmación
        </button>

        {isError && (
          <div className="bg-red-950/40 border border-red-800 rounded p-3 text-sm space-y-2">
            <p className="text-red-300 text-xs">
              Error de red al guardar. Los datos siguen intactos en pantalla.
            </p>
            <button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded"
              onClick={handleSave}
              disabled={isPending}
            >
              Reintentar conexión
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-800"
            onClick={onClose}
          >
            Volver / Cerrar
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? 'Guardando...' : 'Guardar borrador'}
          </button>
        </div>
      </div>
    </div>
  );
};