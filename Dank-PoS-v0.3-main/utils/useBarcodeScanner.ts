import { useEffect, useRef } from 'react';

interface UseBarcodeScannerOptions {
  onBarcodeScanned: (barcode: string) => void;
  debounceTime?: number; // Time in ms to wait for new input before clearing buffer
}

/**
 * A React hook for handling barcode scanner input.
 * Assumes the barcode scanner acts like a keyboard and sends an "Enter" key after the barcode.
 * @param onBarcodeScanned Callback function to execute when a barcode is successfully scanned.
 * @param debounceTime Time in milliseconds to wait for new input before clearing the buffer (defaults to 100ms).
 */
export const useBarcodeScanner = ({ onBarcodeScanned, debounceTime = 100 }: UseBarcodeScannerOptions) => {
  const barcodeBuffer = useRef<string>('');
  const lastKeyPressTime = useRef<number>(Date.now());
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();

      // If the time between key presses is too long, assume a new scan or manual typing
      // and reset the buffer. This helps differentiate between fast scanner input
      // and slow manual typing or accidental key presses.
      if (currentTime - lastKeyPressTime.current > debounceTime) {
        barcodeBuffer.current = ''; // Reset buffer for a new scan
      }

      lastKeyPressTime.current = currentTime;

      if (event.key === 'Enter') {
        // Barcode scan complete
        const scannedBarcode = barcodeBuffer.current.trim();
        if (scannedBarcode) {
          onBarcodeScanned(scannedBarcode);
        }
        barcodeBuffer.current = ''; // Clear buffer after processing
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
          debounceTimeout.current = null;
        }
      } else if (event.key.length === 1) { // Only append single characters
        barcodeBuffer.current += event.key;
        // Reset timeout to clear buffer if no more input comes
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
          barcodeBuffer.current = ''; // Clear buffer if no 'Enter' received
        }, debounceTime + 50); // Give a little extra time than debounceTime
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [onBarcodeScanned, debounceTime]);
};
