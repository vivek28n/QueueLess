import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Smartphone,
  Building2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

export const QRCodeModal = ({ queue, businessName, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !queue) return null;

  // Determine public queue URL (respects production VITE_PUBLIC_URL if configured)
  const baseUrl = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, '');
  const publicQueueUrl = `${baseUrl}/queue/${queue.queueCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicQueueUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = document.getElementById(`qr-canvas-${queue.queueCode}`);
    if (!canvas) return;

    // Create a high-res download canvas with branded header and footer
    const printCanvas = document.createElement('canvas');
    const padding = 32;
    const headerHeight = 80;
    const footerHeight = 60;
    const qrSize = 320;

    printCanvas.width = qrSize + padding * 2;
    printCanvas.height = qrSize + headerHeight + footerHeight + padding * 2;
    const ctx = printCanvas.getContext('2d');

    // Fill dark SaaS background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, printCanvas.width, printCanvas.height);

    // Border around badge
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, printCanvas.width - 16, printCanvas.height - 16);

    // Business & Queue Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(businessName || 'QueueLess Venue', printCanvas.width / 2, 44);

    ctx.fillStyle = '#818cf8';
    ctx.font = '600 15px Inter, system-ui, sans-serif';
    ctx.fillText(queue.name, printCanvas.width / 2, 70);

    // White QR background card
    const cardX = padding - 8;
    const cardY = headerHeight + padding - 8;
    const cardSize = qrSize + 16;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardSize, cardSize, 12);
    ctx.fill();

    // Draw the QR Code image
    ctx.drawImage(canvas, padding, headerHeight + padding, qrSize, qrSize);

    // Footer Code & Instructions
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.fillText('Scan to join virtual queue with your mobile device', printCanvas.width / 2, printCanvas.height - 48);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`QUEUE CODE: ${queue.queueCode}`, printCanvas.width / 2, printCanvas.height - 24);

    // Trigger PNG Download
    const downloadLink = document.createElement('a');
    downloadLink.download = `QueueLess-QR-${queue.queueCode}.png`;
    downloadLink.href = printCanvas.toDataURL('image/png');
    downloadLink.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <Card className="w-full max-w-md border-slate-800 shadow-2xl p-6 sm:p-7 bg-[#0b101d] space-y-5">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Queue Check-in QR Code</h3>
              <p className="text-xs text-slate-400">{queue.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Venue Info */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Building2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>{businessName}</span>
            <span>•</span>
            <Badge variant="cyan" size="sm">
              Code: {queue.queueCode}
            </Badge>
          </div>
        </div>

        {/* QR Code Container (Crisp White Card with Dark Elements) */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
          <div className="p-4 rounded-xl bg-white shadow-xl">
            <QRCodeCanvas
              id={`qr-canvas-${queue.queueCode}`}
              value={publicQueueUrl}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            <span>Patrons scan to take a contactless digital token</span>
          </div>
        </div>

        {/* Link Box with Copy Button */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Public Queue URL
          </label>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            <input
              type="text"
              readOnly
              value={publicQueueUrl}
              className="bg-transparent flex-1 font-mono text-[11px] text-slate-300 focus:outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1 text-[11px]"
              title="Copy link"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleDownloadQR}
            className="w-full text-xs text-slate-200 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PNG</span>
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => window.open(publicQueueUrl, '_blank')}
            className="w-full text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Link</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default QRCodeModal;
