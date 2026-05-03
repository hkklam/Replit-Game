import { useEffect, useRef } from "react";
import QR from "qrcode";

interface Props {
  value: string;
  size?: number;
  dark?: string;
  light?: string;
  className?: string;
}

export function QRCode({ value, size = 160, dark = "#000000", light = "#ffffff", className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    QR.toCanvas(ref.current, value, {
      width: size,
      margin: 2,
      color: { dark, light },
    }).catch(() => {});
  }, [value, size, dark, light]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", borderRadius: 8 }}
    />
  );
}

// Builds the invite URL for a multiplayer room from the current page URL
export function buildInviteUrl(roomCode: string): string {
  return `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
}

// Reads a room code from URL query params (e.g. ?room=ABCD)
export function getUrlRoomCode(): string {
  return new URLSearchParams(window.location.search).get("room") ?? "";
}
