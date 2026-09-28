import { useState } from "react";
import FileUpload from "./components/FileUpload.jsx";

const STAGES = [
  "Uploading files",
  "Mapping & normalizing columns",
  "Running exact match",
  "Running fuzzy invoice match",
  "Building workbook",
];

export default function App() {
  const [gstrFile, setGstrFile] = useState(null);
  const [booksFile, setBooksFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | done | error
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);

  const canReconcile = gstrFile && booksFile && status !== "processing";

  const handleReconcile = async () => {
    setStatus("processing");
    setErrorMsg("");
    setDownloadUrl(null);
    setProgress(0);
    setStageIndex(0);

    const startTime = Date.now();

    // Start API call
    const apiPromise = (async () => {
      const formData = new FormData();
      formData.append("gstr_file", gstrFile);
      formData.append("books_file", booksFile);

      const response = await fetch("/api/reconcile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Reconciliation failed. Please check your files and try again.";
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      return await response.blob();
    })();

    // Progress timer targeting ~15 seconds total execution time
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let calculatedProgress = 0;

      if (elapsed < 14000) {
        // Linear mapping up to 93% in first 14 seconds
        calculatedProgress = Math.round((elapsed / 14000) * 93);
      } else {
        // Slow down asymptotically towards 99% after 14 seconds
        const extraTime = elapsed - 14000;
        calculatedProgress = 93 + Math.round((1 - Math.exp(-extraTime / 5000)) * 6);
      }

      setProgress(Math.min(99, calculatedProgress));

      // Map progress directly to stages
      const currentStage = Math.min(
        Math.floor(calculatedProgress / 20),
        STAGES.length - 1
      );
      setStageIndex(currentStage);
    }, 100);

    try {
      // Minimum delay of 15 seconds
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 15000));

      // Wait for both the API call and the 15-second minimum delay
      const [blob] = await Promise.all([apiPromise, delayPromise]);

      clearInterval(progressTimer);
      setProgress(100);
      setStageIndex(STAGES.length - 1);

      // Fast slide transition to done state
      setTimeout(() => {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setStatus("done");
      }, 500);

    } catch (err) {
      clearInterval(progressTimer);
      setErrorMsg(err.message || "Something went wrong.");
      setStatus("error");
    }
  };

  const stepState = (n) => {
    if (n === 1) return gstrFile ? "done" : "active";
    if (n === 2) return booksFile ? "done" : gstrFile ? "active" : "pending";
    if (n === 3) {
      if (status === "done") return "done";
      if (gstrFile && booksFile) return "active";
      return "pending";
    }
    if (n === 4) return status === "done" ? "done" : "pending";
    return "pending";
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-eyebrow">GST Reconciliation</p>
        <h1 className="app-title">Match GSTR-2B against your books, invoice by invoice.</h1>
        <p className="app-subtitle">
          Upload your GSTR-2B and purchase register — the engine normalizes both, runs an
          exact match, catches value mismatches, and flags fuzzy invoice-number differences,
          then hands you back one clean Excel workbook.
        </p>
      </header>

      <div className="ledger-card">
        <div className="ledger-steps">
          <div className="ledger-step" data-active={stepState(1) === "active"}>
            <span className="step-index" data-state={stepState(1)}>
              {stepState(1) === "done" ? "✓" : "1"}
            </span>
            <div className="step-body">
              <p className="step-title">Upload GSTR-2B</p>
              <p className="step-caption">The supplier invoice statement downloaded from the GST Portal.</p>
              <FileUpload
                label="Choose GSTR-2B file"
                hint="Excel (.xlsx or .xls)"
                file={gstrFile}
                onSelect={setGstrFile}
              />
            </div>
          </div>

          <div className="ledger-step" data-active={stepState(2) === "active"}>
            <span className="step-index" data-state={stepState(2)}>
              {stepState(2) === "done" ? "✓" : "2"}
            </span>
            <div className="step-body">
              <p className="step-title">Upload Books</p>
              <p className="step-caption">Your purchase register maintained internally.</p>
              <FileUpload
                label="Choose Books file"
                hint="Excel (.xlsx or .xls)"
                file={booksFile}
                onSelect={setBooksFile}
              />
            </div>
          </div>

          <div className="ledger-step" data-active={stepState(3) === "active"}>
            <span className="step-index" data-state={stepState(3)}>
              {stepState(3) === "done" ? "✓" : "3"}
            </span>
            <div className="step-body">
              <p className="step-title">Reconcile</p>
              <p className="step-caption">
                Runs exact matching, value-difference detection, and fuzzy invoice matching.
              </p>
              <button
                className="primary-btn"
                data-tone="gold"
                disabled={!canReconcile}
                onClick={handleReconcile}
              >
                {status === "processing" && <span className="spinner" />}
                {status === "processing" ? "Reconciling…" : "Run reconciliation"}
              </button>

              {status === "processing" && (
                <>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                    <p className="progress-caption" style={{ margin: 0 }}>{STAGES[stageIndex]}…</p>
                    <p style={{ margin: 0, fontFamily: "IBM Plex Mono, monospace", fontSize: "11.5px", color: "var(--ink-soft)" }}>{progress}%</p>
                  </div>
                </>
              )}

              {status === "error" && <div className="error-banner">{errorMsg}</div>}
            </div>
          </div>

          <div className="ledger-step">
            <span className="step-index" data-state={stepState(4)}>
              {stepState(4) === "done" ? "✓" : "4"}
            </span>
            <div className="step-body">
              <p className="step-title">Download report</p>
              <p className="step-caption">
                One workbook: ITC Summary, Matched, Mismatch Probable, Invoice Mismatch, Not in Books, Not in GSTR2B, GSTR2B, Books.
              </p>

              {status === "done" && downloadUrl ? (
                <div className="result-panel">
                  <div className="result-text">
                    <span className="seal">✓</span>
                    <div>
                      <p className="result-title">GST_Reconciliation.xlsx is ready</p>
                      <p className="result-caption">Eight sheets, fully formatted.</p>
                    </div>
                  </div>
                  <a className="primary-btn" href={downloadUrl} download="GST_Reconciliation.xlsx">
                    Download workbook
                  </a>
                </div>
              ) : (
                <button className="primary-btn" disabled>
                  Waiting on reconciliation
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="footer-note">
        Files are processed in memory for this reconciliation only and are not stored.
      </p>
    </div>
  );
}
