import React from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  badge,
  subtitle,
  maxWidth = '560px',
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      // Prevenir explícitamente el cierre accidental al hacer clic en el fondo
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 19, 22, 0.72)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        overflowY: 'auto',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '2.5px solid var(--border-strong)',
          boxShadow: 'var(--shadow-crisp-lg)',
          borderRadius: 'var(--radius-sm)',
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '2px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-canvas)',
            gap: '12px',
          }}
        >
          <div>
            {badge && (
              <span className="badge badge-categoria" style={{ marginBottom: '6px', display: 'inline-block' }}>
                {badge}
              </span>
            )}
            <h2 style={{ fontSize: '1.35rem', lineHeight: 1.2 }}>{title}</h2>
            {subtitle && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-outline"
            style={{ padding: '6px 10px', flexShrink: 0 }}
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
