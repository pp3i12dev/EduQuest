import { useState } from 'react';
import { useSaveActivityDraft } from '../hooks/useActivities';

export const TrueFalseActivityModal = ({ isOpen, onClose, initialData = null }) => {
  const [title, setTitle] = useState(initialData?.title || '');

  // Inicialización perezosa para garantizar que la función impura se ejecute solo al montar
  const [statements, setStatements] = useState(() => 
    initialData?.content?.statements || [
      { id: crypto.randomUUID(), text: '', correctAnswer: true }
    ]
  );

  const { mutate, isPending, isError } = useSaveActivityDraft();

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
    const payload = {
      id: initialData?.id,
      title,
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
    <div className="modal-overlay">
      <div className="modal-container">
        <h2>{initialData ? 'Editar' : 'Crear'} actividad Verdadero / Falso</h2>

        <input
          type="text"
          className="input-title"
          placeholder="Título de la actividad"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="statements-list">
          {statements.map((stmt) => (
            <div key={stmt.id} className="statement-row">
              <input
                type="text"
                placeholder="Escribe la premisa..."
                value={stmt.text}
                onChange={(e) => handleStatementChange(stmt.id, 'text', e.target.value)}
              />
              <button
                type="button"
                className={stmt.correctAnswer ? 'btn-active' : ''}
                onClick={() => handleStatementChange(stmt.id, 'correctAnswer', true)}
              >
                Verdadero
              </button>
              <button
                type="button"
                className={!stmt.correctAnswer ? 'btn-active' : ''}
                onClick={() => handleStatementChange(stmt.id, 'correctAnswer', false)}
              >
                Falso
              </button>
              <button type="button" onClick={() => handleRemoveStatement(stmt.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={handleAddStatement}>+ Agregar afirmación</button>

        {isError && (
          <div className="error-retry-banner">
            <p>Error de red al guardar. Los datos siguen intactos en pantalla.</p>
            <button type="button" onClick={handleSave} disabled={isPending}>
              Reintentar conexión
            </button>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Volver / Cerrar</button>
          <button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar borrador'}
          </button>
        </div>
      </div>
    </div>
  );
};