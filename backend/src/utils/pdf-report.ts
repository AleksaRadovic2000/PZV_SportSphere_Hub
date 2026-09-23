import PDFDocument from "pdfkit";

export type OccupancyRow = {
  resourceName: string;
  availableHours: number;
  occupiedHours: number;
  percentage: number;
};

export type SalesRow = {
  productName: string;
  quantity: number;
  amount: number;
};

const addTitle = (document: PDFKit.PDFDocument, title: string, facility: string, month: string) => {
  document.font("Helvetica-Bold").fontSize(14).fillColor("black").text(title);
  document.moveDown(0.75);
  document.font("Helvetica").fontSize(10).text(`Sportski objekat: ${facility}`);
  document.text(`Mesec: ${month}`);
  document.moveDown();
};

const drawRow = (
  document: PDFKit.PDFDocument,
  values: string[],
  widths: number[],
  header = false,
) => {
  const rowHeight = 24;
  const startX = document.page.margins.left;
  const startY = document.y;
  let x = startX;

  document.font(header ? "Helvetica-Bold" : "Helvetica").fillColor("black").fontSize(10);

  values.forEach((value, index) => {
    document.rect(x, startY, widths[index], rowHeight).stroke("#9aa7b0");
    document.text(value, x + 5, startY + 7, {
      width: widths[index] - 10,
      height: rowHeight - 8,
      ellipsis: true,
    });
    x += widths[index];
  });

  document.x = startX;
  document.y = startY + rowHeight;
};

export const createOccupancyDocument = (
  facilityName: string,
  month: string,
  rows: OccupancyRow[],
) => {
  const document = new PDFDocument({ size: "A4", margin: 50 });
  const widths = [190, 110, 110, 85];

  addTitle(document, "Mesecni izvestaj o popunjenosti", facilityName, month);
  drawRow(document, ["Resurs", "Dostupni sati", "Zauzeti sati", "Popunjenost"], widths, true);

  rows.forEach((row) => {
    if (document.y > 740) {
      document.addPage();
      drawRow(document, ["Resurs", "Dostupni sati", "Zauzeti sati", "Popunjenost"], widths, true);
    }

    drawRow(
      document,
      [
        row.resourceName,
        row.availableHours.toFixed(1),
        row.occupiedHours.toFixed(1),
        `${row.percentage.toFixed(1)}%`,
      ],
      widths,
    );
  });
  return document;
};

export const createSalesDocument = (
  facilityName: string,
  month: string,
  rows: SalesRow[],
  total: number,
) => {
  const document = new PDFDocument({ size: "A4", margin: 50 });
  const widths = [280, 100, 115];

  addTitle(document, "Mesecni izvestaj o prometu opreme", facilityName, month);
  drawRow(document, ["Proizvod", "Kolicina", "Iznos"], widths, true);

  rows.forEach((row) => {
    if (document.y > 740) {
      document.addPage();
      drawRow(document, ["Proizvod", "Kolicina", "Iznos"], widths, true);
    }

    drawRow(document, [row.productName, String(row.quantity), `${row.amount.toFixed(2)} RSD`], widths);
  });

  document.moveDown();
  document.font("Helvetica-Bold").fontSize(10).fillColor("black");
  document.text(`Ukupan promet: ${total.toFixed(2)} RSD`);
  return document;
};
