import PDFDocument from "pdfkit";

interface PdfGuest {
  firstName: string;
  lastName: string;
  email: string | null;
  rsvpStatus: string;
  mealPreference: string | null;
  dietaryRequirements: string | null;
  isVip: boolean;
  checkedIn: boolean;
  additionalGuestsCount: number;
  party?: { fullName: string }[];
  seatAssignment: { table: { name: string }; seat: { seatNumber: number } | null } | null;
}

// Renders a printable guest list: one row per guest (plus their named
// party members indented underneath), grouped nothing-fancy -- just sorted
// by last name, since that's how the on-screen list is sorted too.
export function guestsToPdf(eventName: string, guests: PdfGuest[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.fontSize(18).font("Helvetica-Bold").text(eventName, { align: "left" });
  doc.fontSize(11).font("Helvetica").fillColor("#64748b").text("Guest list", { align: "left" });
  doc.moveDown(0.5);
  doc.fillColor("#000000");

  const confirmed = guests.filter((g) => g.rsvpStatus === "CONFIRMED").length;
  const checkedIn = guests.filter((g) => g.checkedIn).length;
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .text(`${guests.length} total invited  ·  ${confirmed} confirmed  ·  ${checkedIn} checked in`);
  doc.fillColor("#000000");
  doc.moveDown(0.75);

  const colX = { name: 40, status: 230, table: 310, meal: 400, checkin: 500 };
  function drawHeader() {
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#475569");
    doc.text("Guest", colX.name, doc.y, { continued: false, width: colX.status - colX.name });
    const y = doc.y - doc.currentLineHeight();
    doc.text("RSVP", colX.status, y, { width: colX.table - colX.status });
    doc.text("Table / Seat", colX.table, y, { width: colX.meal - colX.table });
    doc.text("Meal", colX.meal, y, { width: colX.checkin - colX.meal });
    doc.text("Checked in", colX.checkin, y);
    doc.moveDown(0.3);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor("#e2e8f0")
      .stroke();
    doc.moveDown(0.3);
    doc.fillColor("#000000").font("Helvetica");
  }

  drawHeader();

  for (const guest of guests) {
    if (doc.y > 760) {
      doc.addPage();
      drawHeader();
    }

    const rowY = doc.y;
    const name = `${guest.firstName} ${guest.lastName}${guest.isVip ? "  ★" : ""}`;
    const table = guest.seatAssignment
      ? `${guest.seatAssignment.table.name}${guest.seatAssignment.seat ? ` / Seat ${guest.seatAssignment.seat.seatNumber}` : ""}`
      : "—";

    doc.fontSize(10).text(name, colX.name, rowY, { width: colX.status - colX.name });
    doc.fontSize(10).text(guest.rsvpStatus, colX.status, rowY, { width: colX.table - colX.status });
    doc.fontSize(10).text(table, colX.table, rowY, { width: colX.meal - colX.table });
    doc.fontSize(10).text(guest.mealPreference || "—", colX.meal, rowY, { width: colX.checkin - colX.meal });
    doc.fontSize(10).text(guest.checkedIn ? "Yes" : "No", colX.checkin, rowY);
    doc.moveDown(0.15);

    if (guest.party && guest.party.length > 0) {
      for (const member of guest.party) {
        if (doc.y > 770) {
          doc.addPage();
          drawHeader();
        }
        doc
          .fontSize(9)
          .fillColor("#64748b")
          .text(`   + ${member.fullName}`, colX.name, doc.y, { width: colX.status - colX.name });
        doc.fillColor("#000000");
      }
    }
    doc.moveDown(0.2);
  }

  // Caller is responsible for piping this to a destination and then
  // calling doc.end() -- ending it here (before anything is piped) risks
  // losing buffered data.
  return doc;
}
