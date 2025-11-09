import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Note: for Transactions we expect the QR payload to be a small JSON containing SKU and unit price, for example:
// {
//   "sku": "SKU-RICE-001",
//   "unitPrice": 50.0
// }
// Quantity and notes are entered manually in the form. If the QR encodes something else, we attempt to parse JSON
// and pass the parsed object (or raw string) to the caller.

// jsqr doesn't ship types; ignore TS here so we can import the package at runtime.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import jsQR from 'jsqr';

type QRScannerProps = {
  onDecode: (payload: unknown) => void;
  onClose?: () => void;
};

const QRScanner: React.FC<QRScannerProps> = ({ onDecode, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDecoded, setLastDecoded] = useState<string | null>(null);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        console.log('QRScanner: camera started');
        tick();
      }
    } catch (err) {
      console.error('QRScanner: camera start error', err);
      setError('Unable to access camera. You can upload an image instead.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) {
      animationRef.current = requestAnimationFrame(tick);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        console.log('QRScanner: code detected', code.data);
        // got it
        handleParsed(code.data);
        stopCamera();
        return;
      }
    } catch (e) {
      console.error('QRScanner: tick error', e);
      // ignore errors from getImageData in some browsers when not ready
    }

    animationRef.current = requestAnimationFrame(tick);
  };

  const tryFetchUrl = async (url: string) => {
    setLastFetchError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        const msg = `HTTP ${res.status}`;
        console.warn('QRScanner: fetch returned non-OK status', msg);
        setLastFetchError(msg);
        return null;
      }

      if (contentType.includes('application/json')) {
        const json = await res.json();
        return json;
      }

      const txt = await res.text();
      // try direct JSON parse
      try {
        return JSON.parse(txt);
      } catch (e) {
        // try to extract first JSON object from HTML or text
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            return JSON.parse(m[0]);
          } catch (ee) {
            console.warn('QRScanner: extracted JSON did not parse', ee);
          }
        }
        const msg = 'fetched URL did not return JSON';
        console.warn('QRScanner: ' + msg);
        setLastFetchError(msg);
        return null;
      }
    } catch (err) {
      console.error('QRScanner: failed to fetch URL from QR (CORS or network)', err);
      setLastFetchError(String(err));
      return null;
    }
  };

  const handleParsed = async (data: string) => {
    // log and expose the raw decoded string
    console.log('QRScanner decoded raw data:', data);
    setLastDecoded(data);

    // 1) If the payload is raw JSON, parse and return it
    try {
      const parsed = JSON.parse(data);
      console.log('QRScanner: parsed JSON directly from QR');
      onDecode(parsed);
      return;
    } catch (err) {
      // not JSON, continue
    }

    // 2) If the payload looks like a URL, attempt to fetch JSON from it (handles short-URL → JSON flows)
    if (/^https?:\/\//i.test(data)) {
      console.log('QRScanner: decoded value looks like a URL, attempting to fetch JSON from it');
      const json = await tryFetchUrl(data);
      if (json) {
        console.log('QRScanner: obtained JSON from URL', json);
        setLastDecoded(JSON.stringify(json));
        onDecode(json);
        return;
      }
    }

    // fallback: pass the raw decoded string through
    onDecode(data);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            console.log('QRScanner: code detected from image', code.data);
            handleParsed(code.data);
            return;
          }
          setError('No QR code found in image');
        } catch (err) {
          setError('Failed to read image');
        }
      };
      if (typeof reader.result === 'string') img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Scan QR</DialogTitle>
        <DialogDescription>
          <p className="text-sm text-muted-foreground">Point your camera at a QR code or upload an image containing a QR.</p>
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4">
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        <div className="w-full h-64 bg-black/5 rounded-md flex items-center justify-center overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            <Button variant="outline">Upload Image</Button>
          </label>
          <Button variant="ghost" onClick={() => { stopCamera(); onClose?.(); }}>Close</Button>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          <div>
            - Expected QR payload: JSON with SKU and unitPrice, e.g. <code>{'{"sku":"SKU-RICE-001","unitPrice":50.0}'}</code>.
          </div>
          <div>- If QR contains raw string, it will be returned as-is to the caller.</div>
          {lastDecoded && (
            <div className="mt-2">
              <div className="text-xs font-mono text-muted-foreground">Decoded:</div>
              <pre className="rounded bg-muted p-2 overflow-auto text-xs">{lastDecoded}</pre>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="mt-4">
        <div />
      </DialogFooter>
    </DialogContent>
  );
};

export default QRScanner;
