import PDFDocument from "pdfkit";

interface PdfSeat {
  seatNumber: number;
  assignment: { guest: { firstName: string; lastName: string; isVip: boolean } } | null;
  partyAssignment: { partyMember: { fullName: string } } | null;
}

interface PdfTable {
  name: string;
  capacity: number;
  seats: PdfSeat[];
}

interface PdfUnassignedGuest {
  firstName: string;
  lastName: string;
  party: { fullName: string }[];
}

// A practical, printable seating chart: one section per table listing every
// seat and who's in it (including named plus-ones as their own line), plus
// a trailing section for anyone confirmed but not yet seated. This is a
// text listing rather than a to-scale floor plan -- reliable to generate
// without a headless browser, and it's what most check-in tables actually
// want to tape up or hold.
export function seatingToPdf(eventName: string, tables: PdfTable[], unassignedGuests: PdfUnassignedGuest[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  doc.fontSize(18).font("Helvetica-Bold").text(eventName, { align: "left" });
  doc.fontSize(11).font("Helvetica").fillColor("#64748b").text("Seating chart", { align: "left" });
  doc.fillColor("#000000");
  doc.moveDown(1);

  const sortedTables = [...tables].sort((a, b) => a.name.localeCompare(b.name));

  for (const table of sortedTables) {
    if (doc.y > 700) doc.addPage();

    const occupied = table.seats.filter((s) => s.assignment || s.partyAssignment).length;
    doc.fontSize(13).font("Helvetica-Bold").text(`${table.name}`, { continued: true });
    doc.fontSize(10).font("Helvetica").fillColor("#64748b").text(`   ${occupied}/${table.capacity} seated`);
    doc.fillColor("#000000");
    doc.moveDown(0.3);

    const ordered = [...table.seats].sort((a, b) => a.seatNumber - b.seatNumber);
    for (const seat of ordered) {
      if (doc.y > 770) {
        doc.addPage();
      }
      let label: string;
      if (seat.assignment) {
        label = `${seat.assignment.guest.firstName} ${seat.assignment.guest.lastName}${seat.assignment.guest.isVip ? "  ★" : ""}`;
      } else if (seat.partyAssignment) {
        label = `${seat.partyAssignment.partyMember.fullName}  (guest of a nearby seat)`;
      } else {
        label = "— empty —";
      }
      doc.fontSize(10).fillColor(seat.assignment || seat.partyAssignment ? "#000000" : "#94a3b8");
      doc.text(`  Seat ${seat.seatNumber}:  ${label}`);
    }
    doc.fillColor("#000000");
    doc.moveDown(0.8);
  }

  if (unassignedGuests.length > 0) {
    if (doc.y > 650) doc.addPage();
    doc.fontSize(13).font("Helvetica-Bold").text("Not yet seated");
    doc.moveDown(0.3);
    for (const guest of unassignedGuests) {
      if (doc.y > 770) doc.addPage();
      doc.fontSize(10).font("Helvetica").text(`  ${guest.firstName} ${guest.lastName}`);
      for (const member of guest.party) {
        doc.fontSize(9).fillColor("#64748b").text(`     + ${member.fullName}`);
        doc.fillColor("#000000");
      }
    }
  }

  return doc;
}
