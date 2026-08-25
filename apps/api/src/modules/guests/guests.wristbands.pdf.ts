import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface WristbandGuest {
  firstName: string;
  lastName: string;
  inviteUrl: string;
}

// Printable wristband/badge sheet: one QR + guest name per guest, laid out
// 3-per-row on A4 so it prints onto standard label/card sheets rather than
// a single full-page invite. Each QR encodes the guest's existing
// invitation link (same one already used for emailed invites -- see
// buildInviteUrl in invite.service.ts) so scanning it at the door works
// whether staff scan a printed wristband, a badge, or the guest's phone
// showing their invite email.
export async function guestsToWristbandsPdf(eventName: string, guests: WristbandGuest[]): Promise<PDFKit.PDFDocument> {
  const doc = new PDFDocument({ size: "A4", margin: 24 });

  if (guests.length === 0) {
    doc.fontSize(12).fillColor("#64748b").text("No guests to print wristbands for yet.");
    return doc;
  }

  const pageWidth = 595.28; // A4 in points
  const pageHeight = 841.89;
  const cols = 3;
  const cardWidth = (pageWidth - 24 * 2) / cols;
  const cardHeight = 170;
  const qrSize = 100;
  const rowsPerPage = Math.floor((pageHeight - 24 * 2) / cardHeight);

  // Generate every QR up front (async) so the rest of the layout below can
  // stay synchronous, same reasoning as the batched approach elsewhere.
  const qrDataUrls = await Promise.all(
    guests.map((g) => QRCode.toDataURL(g.inviteUrl, { margin: 1, width: 300 }))
  );

  let col = 0;
  let row = 0;

  guests.forEach((guest, i) => {
    if (row >= rowsPerPage) {
      doc.addPage();
      row = 0;
      col = 0;
    }

    const x = 24 + col * cardWidth;
    const y = 24 + row * cardHeight;

    doc
      .roundedRect(x + 4, y + 4, cardWidth - 8, cardHeight - 8, 6)
      .strokeColor("#e2e8f0")
      .lineWidth(1)
      .stroke();

    const qrBase64 = qrDataUrls[i].split(",")[1];
    doc.image(Buffer.from(qrBase64, "base64"), x + (cardWidth - qrSize) / 2, y + 14, {
      width: qrSize,
      height: qrSize,
    });

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text(`${guest.firstName} ${guest.lastName}`, x + 8, y + qrSize + 22, {
        width: cardWidth - 16,
        align: "center",
      });
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(eventName, x + 8, y + qrSize + 36, { width: cardWidth - 16, align: "center" });

    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  });

  return doc;
}
