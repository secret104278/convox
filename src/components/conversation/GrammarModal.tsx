interface GrammarModalProps {
  explanation: string | null;
  onClose: () => void;
}

export function GrammarModal({ explanation, onClose }: GrammarModalProps) {
  if (!explanation) return null;

  return (
    <dialog
      id="grammar_modal"
      className="modal modal-bottom sm:modal-middle"
      open={true}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-box">
        <h3 className="text-lg font-bold">文法說明</h3>
        <p className="whitespace-pre-wrap py-4">{explanation}</p>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
