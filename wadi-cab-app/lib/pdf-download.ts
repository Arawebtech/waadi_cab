import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface PdfDownloadOptions {
  url: string;
  filename: string;
  headers?: Record<string, string>;
}

/**
 * Downloads a PDF file in a Capacitor-compatible way
 * Works on both web and mobile platforms
 */
export const downloadPdf = async (options: PdfDownloadOptions): Promise<void> => {
  const { url, filename, headers = {} } = options;

  try {
    if (Capacitor.isNativePlatform()) {
      // For mobile platforms (iOS/Android)
      await downloadPdfNative(url, filename, headers);
    } else {
      // For web platform
      await downloadPdfWeb(url, filename, headers);
    }
  } catch (error) {
    console.error('PDF download error:', error);
    throw new Error('Failed to download PDF. Please try again.');
  }
};

/**
 * Downloads PDF for web platform using blob URL
 */
const downloadPdfWeb = async (url: string, filename: string, headers: Record<string, string>): Promise<void> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': headers.Authorization || '',
      ...headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(link);
};

/**
 * Downloads PDF for native platforms using Capacitor APIs
 */
const downloadPdfNative = async (url: string, filename: string, headers: Record<string, string>): Promise<void> => {
  try {
    // Fetch the PDF data
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': headers.Authorization || '',
        ...headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Save to device filesystem
    const fileResult = await Filesystem.writeFile({
      path: `Downloads/${filename}`,
      data: base64Data,
      directory: Directory.ExternalStorage,
      encoding: Encoding.UTF8,
    });

    console.log('PDF saved to:', fileResult.uri);

    // Share the file (opens native share sheet)
    await Share.share({
      title: 'Tax Slip PDF',
      text: 'Your tax slip is ready for download',
      url: fileResult.uri,
      dialogTitle: 'Share Tax Slip',
    });

  } catch (error) {
    console.error('Native PDF download error:', error);
    
    // Fallback: Open in browser
    await Browser.open({ 
      url: url,
      windowName: '_system'
    });
  }
};

/**
 * Opens PDF in browser (useful for preview)
 */
export const openPdfInBrowser = async (url: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ 
      url: url,
      windowName: '_system'
    });
  } else {
    window.open(url, '_blank');
  }
};

/**
 * Checks if PDF is available for a booking
 */
export const isPdfAvailable = (booking: any): boolean => {
  return !!(booking?.tax_slip_pdf?.filename);
};

/**
 * Gets PDF filename for a booking
 */
export const getPdfFilename = (booking: any): string => {
  if (booking?.tax_slip_pdf?.original_name) {
    return booking.tax_slip_pdf.original_name;
  }
  return `tax_slip_${booking?.bookingId || 'unknown'}.pdf`;
};
