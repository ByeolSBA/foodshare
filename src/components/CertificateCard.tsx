import { Award, Download } from 'lucide-react';
import { Button } from './ui/Button';

export type CertificateCardProps = {
  title: string;
  body?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  recipientName?: string | null;
  roleLabel?: string | null;
  /** Texto secundario (p. ej. email en vista admin) */
  subtitle?: string | null;
  onDownloadPdf: () => void | Promise<void>;
  downloading?: boolean;
};

export function CertificateCard({
  title,
  body,
  createdAt,
  expiresAt,
  recipientName,
  roleLabel,
  subtitle,
  onDownloadPdf,
  downloading,
}: CertificateCardProps) {
  const expiry = expiresAt ? new Date(expiresAt) : null;
  const issued = new Date(createdAt);

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/80 shadow-sm overflow-hidden">
      <div className="border-b border-emerald-100 bg-white/60 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-800">
          <Award className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide">Certificado FoodShare</span>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={downloading}
          onClick={() => void onDownloadPdf()}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Generando…' : 'Descargar PDF'}
        </Button>
      </div>
      <div className="p-5 sm:p-6">
        <div className="aspect-[1.4/1] max-h-[220px] sm:max-h-[260px] rounded-xl border-2 border-emerald-600/25 bg-white/90 shadow-inner flex flex-col items-center justify-center text-center px-4 py-5">
          <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">Reconocimiento</p>
          {recipientName ? (
            <p className="mt-1 text-lg sm:text-2xl font-bold text-emerald-900 leading-tight">{recipientName}</p>
          ) : null}
          <p className="mt-3 text-sm sm:text-base font-semibold text-slate-800 line-clamp-3">{title}</p>
          {body ? (
            <p className="mt-2 text-xs text-slate-600 line-clamp-4 max-w-prose">{body}</p>
          ) : null}
          <div className="mt-auto pt-3 text-[10px] sm:text-xs text-slate-500 w-full border-t border-slate-100">
            Emitido el {issued.toLocaleDateString('es-ES', { dateStyle: 'medium' })}
            {roleLabel ? ` · ${roleLabel}` : null}
            {subtitle ? ` · ${subtitle}` : null}
          </div>
        </div>
        {expiry ? (
          <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2">
            <strong>Importante:</strong> descarga tu certificado en PDF ahora. El registro en la web puede eliminarse automáticamente después del{' '}
            <time dateTime={expiresAt || undefined}>{expiry.toLocaleDateString('es-ES', { dateStyle: 'long' })}</time>{' '}
            (aprox. un mes desde la emisión).
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-600">
            Usa el botón de arriba para guardar una copia en PDF en tu dispositivo.
          </p>
        )}
      </div>
    </div>
  );
}
