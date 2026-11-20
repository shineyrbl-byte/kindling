"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

// A QR code for the invite link, for when everyone's at the same lunch table.
export default function InviteQR({ url }: { url: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1a1022", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [url]);
  if (!svg) return null;
  // The SVG is generated locally by the qrcode library from our own URL.
  return <div className="qr" role="img" aria-label="QR code for the invite link" dangerouslySetInnerHTML={{ __html: svg }} />;
}
