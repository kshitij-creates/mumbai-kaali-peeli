import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 400,
        background: toast.color || "#22C55E", // Added a fallback green just in case!
        color: toast.textColor || "#FFFFFF",
        padding: "10px 20px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 800,
      }}
    >
      {toast.msg}
    </div>
  );
}