const PDFDocument = require('pdfkit');

/**
 * Genera un PDF estilo diploma (horizontal) y lo envía por `res`.
 * @param {import('express').Response} res
 * @param {object} cert fila con recipient_name, title, body, created_at, expires_at, id
 */
function streamCertificatePdf(res, cert) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 0,
    info: { Title: String(cert.title || 'Certificado FoodShare') },
  });

  res.setHeader('Content-Type', 'application/pdf');
  const safe = String(cert.id || 'cert').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12);
  res.setHeader('Content-Disposition', `attachment; filename="FoodShare-certificado-${safe}.pdf"`);

  doc.pipe(res);

  const { width, height } = doc.page;
  const m = 52;
  const w = width - m * 2;
  const h = height - m * 2;

  doc.save();
  doc.rect(0, 0, width, height).fill('#ecfdf5');
  doc.restore();

  doc.lineWidth(4).strokeColor('#047857').rect(m, m, w, h).stroke();
  doc.lineWidth(1).strokeColor('#34d399').rect(m + 10, m + 10, w - 20, h - 20).stroke();

  let y = m + 40;
  doc.font('Helvetica-Bold').fontSize(38).fillColor('#065f46').text('FoodShare', m, y, { width: w, align: 'center' });
  y += 48;
  doc.font('Helvetica').fontSize(12).fillColor('#64748b').text('Plataforma de rescate de alimentos', m, y, { width: w, align: 'center' });
  y += 36;
  doc.font('Helvetica-Oblique').fontSize(17).fillColor('#334155').text('Certificado de reconocimiento', m, y, { width: w, align: 'center' });
  y += 44;
  doc.font('Helvetica').fontSize(13).fillColor('#0f172a').text('Otorgado a', m, y, { width: w, align: 'center' });
  y += 22;
  doc.font('Helvetica-Bold').fontSize(28).fillColor('#047857').text(String(cert.recipient_name || 'Participante'), m, y, { width: w, align: 'center' });
  y += 42;
  doc.font('Helvetica').fontSize(14).fillColor('#1e293b').text(String(cert.title || ''), m, y, { width: w, align: 'center' });
  y += 32;

  const footerY = height - m - 56;
  const maxBodyBottom = footerY - 16;
  if (cert.body) {
    const bodyHeight = Math.max(48, maxBodyBottom - y);
    doc.font('Helvetica').fontSize(11).fillColor('#475569').text(String(cert.body), m + 64, y, {
      width: w - 128,
      align: 'justify',
      lineGap: 2,
      height: bodyHeight,
      ellipsis: true,
    });
  }

  doc.font('Helvetica').fontSize(9).fillColor('#64748b');
  doc.text(
    `Emitido el ${new Date(cert.created_at).toLocaleDateString('es-ES', { dateStyle: 'long' })}`,
    m + 32,
    footerY,
    { width: w - 64 },
  );
  if (cert.expires_at) {
    doc.text(
      `Importante: descarga este PDF ahora. El certificado en la web puede eliminarse automáticamente después del ${new Date(cert.expires_at).toLocaleDateString('es-ES', { dateStyle: 'long' })} (aprox. 30 días desde la emisión).`,
      m + 32,
      footerY + 14,
      { width: w - 64 },
    );
  } else {
    doc.text('Descarga y guarda este documento para conservar tu reconocimiento.', m + 32, footerY + 14, { width: w - 64 });
  }

  doc.end();
}

module.exports = { streamCertificatePdf };
