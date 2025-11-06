import React, { useEffect, useRef, useState } from 'react';

const BarcodeScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let detector: any = null;
    let rafId = 0;

    const stopStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };

    const detectLoop = async () => {
      if (!mounted || !videoRef.current) return;
      try {
        const videoEl = videoRef.current;
        if (detector) {
          const results = await detector.detect(videoEl as any);
          if (results && results.length > 0) {
            setScanned(results[0].rawValue || String(results[0]));
            setScanning(false);
            stopStream();
            return;
          }
        }
      } catch (e: any) {
        // ignore occasional errors from the detection call
      }
      rafId = requestAnimationFrame(detectLoop);
    };

    const start = async () => {
      setError(null);
      setScanned(null);
      try {
        const constraints: MediaStreamConstraints = { video: { facingMode: 'environment' } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if ((window as any).BarcodeDetector) {
          detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'code_128', 'qr_code'] });
          detectLoop();
        } else {
          setError('BarcodeDetector API not available in this browser. Please use the manual input below.');
        }
      } catch (err: any) {
        setError('Could not start camera: ' + (err?.message || String(err)));
      }
    };

    if (scanning) start();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafId);
      stopStream();
    };
  }, [scanning]);

  return (
    <div className="mobile-padding min-h-screen bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Barcode Scanner</h1>
          <div className="text-sm text-muted-foreground">Point camera at barcode</div>
        </div>

        <div className="space-y-4">
          <div className="rounded border overflow-hidden bg-muted">
            <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />
          </div>

          <div className="flex gap-2">
            {!scanning ? (
              <button
                className="px-4 py-2 rounded bg-primary text-white"
                onClick={() => setScanning(true)}
              >
                Start Scanning
              </button>
            ) : (
              <button
                className="px-4 py-2 rounded bg-red-600 text-white"
                onClick={() => setScanning(false)}
              >
                Stop
              </button>
            )}

            <button
              className="px-4 py-2 rounded border"
              onClick={() => {
                setScanned(null);
                setScanning(false);
              }}
            >
              Clear
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1">Scanned value</label>
            <div className="p-3 rounded border bg-white min-h-[48px]">{scanned ?? <span className="text-muted-foreground">No value yet</span>}</div>
          </div>

          <div className="pt-2">
            <label className="block text-sm mb-1">Manual input (fallback)</label>
            <input
              className="w-full p-2 border rounded"
              placeholder="Enter barcode value manually"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) setScanned(v);
                }
              }}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
