import { useRef } from "react";

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 13l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function FileUpload({ label, hint, file, onSelect, accentLabel }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onSelect(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onSelect(f);
  };

  return (
    <div
      className="dropzone"
      data-filled={Boolean(file)}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
    >
      <div className="dropzone-label">
        <span className="dropzone-icon">{file ? <CheckIcon /> : <FileIcon />}</span>
        <span className="dropzone-text">
          <div className="dropzone-filename">{file ? file.name : label}</div>
          <div className="dropzone-hint">{file ? `${(file.size / 1024).toFixed(0)} KB — ready` : hint}</div>
        </span>
      </div>
      <span className="dropzone-action">{file ? "Replace" : accentLabel || "Browse"}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden-input"
        onChange={handleChange}
      />
    </div>
  );
}
