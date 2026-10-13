import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SpotPublishedResult } from './spotRoundService';

/**
 * Generates an official PDF document for the Spot Round selection results matching Panchayat College official format.
 * Each department is rendered on a dedicated separate page with blank Notice No. and Date.
 */
export function generateSpotOfficialPdf(publishedResult: SpotPublishedResult) {
  if (!publishedResult || !publishedResult.departments || publishedResult.departments.length === 0) {
    alert('No published results available to generate PDF.');
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  publishedResult.departments.forEach((dept, idx) => {
    if (idx > 0) {
      doc.addPage();
    }

    let y = 18;

    // Header 1: OFFICE OF THE PRINCIPAL, PANCHAYAT COLLEGE, BARAGADA
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('OFFICE OF THE PRINCIPAL, PANCHAYAT COLLEGE, BARAGADA', 105, y, { align: 'center' });
    y += 7;

    // Header 2: NOTICE NO. _________   DATE: _________ (Blank as requested)
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('NOTICE NO. ____________   DATE: ____________', 105, y, { align: 'center' });
    y += 9;

    // Preamble Paragraph
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    const preamble = 'The provisional selection list and waiting list for the Phase-II waiting round/spot round of UG e-Admission for the session 2026-27 are prescribed below with respect to departmental vacant seats.';
    const splitPreamble = doc.splitTextToSize(preamble, 180);
    doc.text(splitPreamble, 15, y);
    y += (splitPreamble.length * 4.5) + 6;

    // Department & Vacancy Header Line
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    const deptStr = `DEPARTMENT: ${dept.deptName.toUpperCase()}`;
    const vacancyFormatted = dept.vacancy === 0 ? 'NIL' : String(dept.vacancy).padStart(2, '0');
    const vacancyStr = `VACANCY: ${vacancyFormatted}`;

    doc.text(deptStr, 15, y);
    doc.text(vacancyStr, 195, y, { align: 'right' });
    y += 6;

    // Sequential counter for SL NO / RANK
    let currentSlNo = 1;

    // --- 1. PROVISIONALLY SELECTED LIST ---
    if (dept.selectedStudents && dept.selectedStudents.length > 0) {
      const selectedRows = dept.selectedStudents.map((s) => {
        const sl = currentSlNo;
        currentSlNo++;
        const pctStr = s.percentage !== undefined ? `${s.percentage}` : (s.mark ? `${s.mark}` : '—');
        const maxM = s.maxMark ?? 600;
        const secM = s.securedMark ?? s.mark ?? '—';

        return [
          String(sl),
          s.barcode || '—',
          (s.name || '').toUpperCase(),
          s.phone || '—',
          String(maxM),
          String(secM),
          String(pctStr),
          String(sl)
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [
          [
            { content: 'PROVISIONALLY SELECTED LIST', colSpan: 8, styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
          ],
          ['SL\nNO', 'BARCODE', 'NAME OF THE\nSTUDENT', 'MOBILE\nNO', 'MAX\nMARKS', 'MARKS\nSECURED', 'PERCENTAGE\n(%)', 'RANK']
        ],
        body: selectedRows,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 8.5,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          cellPadding: 2,
          valign: 'middle'
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', fontStyle: 'bold', textColor: [29, 78, 216], cellWidth: 26 },
          2: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 24 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 22 },
          7: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }
        },
        margin: { left: 15, right: 15 }
      });

      y = (doc as any).lastAutoTable.finalY + 6;
    }

    // --- 2. WAITING LIST ---
    if (dept.waitingStudents && dept.waitingStudents.length > 0) {
      const waitingRows = dept.waitingStudents.map((s) => {
        const sl = currentSlNo;
        currentSlNo++;
        const pctStr = s.percentage !== undefined ? `${s.percentage}` : (s.mark ? `${s.mark}` : '—');
        const maxM = s.maxMark ?? 600;
        const secM = s.securedMark ?? s.mark ?? '—';

        return [
          String(sl),
          s.barcode || '—',
          (s.name || '').toUpperCase(),
          s.phone || '—',
          String(maxM),
          String(secM),
          String(pctStr),
          String(sl)
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [
          [
            { content: 'WAITING LIST', colSpan: 8, styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
          ],
          ['SL\nNO', 'BARCODE', 'NAME OF THE\nSTUDENT', 'MOBILE\nNO', 'MAX\nMARKS', 'MARKS\nSECURED', 'PERCENTAGE\n(%)', 'RANK']
        ],
        body: waitingRows,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 8.5,
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.2,
          cellPadding: 2,
          valign: 'middle'
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.2
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', fontStyle: 'bold', textColor: [29, 78, 216], cellWidth: 26 },
          2: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
          3: { halign: 'center', cellWidth: 24 },
          4: { halign: 'center', cellWidth: 16 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 22 },
          7: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }
        },
        margin: { left: 15, right: 15 }
      });

      y = (doc as any).lastAutoTable.finalY + 12;
    } else {
      y += 6;
    }

    // Signature Footer Block at bottom right
    const pageHeight = doc.internal.pageSize.getHeight();
    const sigY = Math.max(y + 15, pageHeight - 35);

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Principal', 165, sigY, { align: 'center' });
    doc.text('Panchayat College, Baragada', 165, sigY + 5, { align: 'center' });
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Spot_Round_Official_List_${dateStr}.pdf`);
}

/**
 * Legacy alias for printing window fallback (calls PDF generator directly)
 */
export function printSpotOfficialListWindow(publishedResult: SpotPublishedResult) {
  generateSpotOfficialPdf(publishedResult);
}
