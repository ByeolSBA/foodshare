const { v4: uuidv4 } = require('uuid');

async function insertCertificate(db, { userId, title, body, donationId, expiresInDays = 30 }) {
  const id = uuidv4();
  const days = Number.isFinite(Number(expiresInDays)) ? Math.min(3650, Math.max(1, Number(expiresInDays))) : 30;
  await db.execute(
    `INSERT INTO certificates (id, user_id, title, body, donation_id, expires_at)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))`,
    [id, userId, String(title).slice(0, 255), body || '', donationId || null, days],
  );
  return id;
}

/**
 * Tras una entrega completada: reconoce a donador, ONG (si reclamó) y voluntario (si transportó).
 */
async function createDeliveryCertificatesForDonation(db, donation) {
  const donationId = donation.id;
  const titleBase = (donation.title || 'Donación').slice(0, 200);

  await insertCertificate(db, {
    userId: donation.donor_id,
    title: `Reconocimiento — donación entregada: ${titleBase}`,
    body:
      'FoodShare certifica que esta donación fue registrada como entregada. Gracias por contribuir a reducir el desperdicio de alimentos y apoyar a quienes más lo necesitan.',
    donationId,
  });

  if (donation.claimed_by) {
    await insertCertificate(db, {
      userId: donation.claimed_by,
      title: `Reconocimiento — recepción de donación: ${titleBase}`,
      body:
        'FoodShare certifica la participación de la organización en la recepción y gestión de esta donación hasta su entrega.',
      donationId,
    });
  }

  if (donation.transported_by) {
    await insertCertificate(db, {
      userId: donation.transported_by,
      title: `Reconocimiento — apoyo logístico: ${titleBase}`,
      body:
        'FoodShare certifica la participación en el transporte y la entrega final de esta donación.',
      donationId,
    });
  }
}

module.exports = {
  insertCertificate,
  createDeliveryCertificatesForDonation,
};
