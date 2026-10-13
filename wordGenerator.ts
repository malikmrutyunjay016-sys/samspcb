import { SpotPublishedResult } from './spotRoundService';

/**
 * Generates and triggers download of an official Microsoft Word document (.doc / .docx)
 * for the Spot Round selection results.
 * Each department is placed on its own page with Panchayat College official headers, 
 * blank Notice No & Date, and structured tables matching the official template.
 */
export function generateSpotOfficialWord(publishedResult: SpotPublishedResult) {
  if (!publishedResult || !publishedResult.departments || publishedResult.departments.length === 0) {
    alert('No published results available to generate Word document.');
    return;
  }

  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Spot Admission Official List</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 18mm 15mm 18mm 15mm;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            font-size: 10pt;
            line-height: 1.3;
          }
          .dept-page {
            page-break-after: always;
            mso-break-type: page-break;
          }
          .dept-page:last-child {
            page-break-after: auto;
          }
          .college-header {
            text-align: center;
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .notice-line {
            text-align: center;
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 12px;
          }
          .preamble {
            font-size: 9.5pt;
            text-align: justify;
            margin-bottom: 12px;
          }
          table.spot-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
            font-size: 9pt;
          }
          table.spot-table th, table.spot-table td {
            border: 1px solid #000000;
            padding: 4px 6px;
            vertical-align: middle;
          }
          table.spot-table th {
            font-weight: bold;
            text-align: center;
            background-color: #ffffff;
          }
          .section-banner {
            font-weight: bold;
            text-align: center;
            font-size: 9.5pt;
            background-color: #ffffff;
            padding: 4px;
          }
          .center { text-align: center; }
          .left { text-align: left; }
          .bold { font-weight: bold; }
          .barcode-cell { color: #1d4ed8; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
  `;

  publishedResult.departments.forEach((dept) => {
    const vacancyFormatted = dept.vacancy === 0 ? 'NIL' : String(dept.vacancy).padStart(2, '0');
    let currentSlNo = 1;

    htmlContent += `
      <div class="dept-page">
        <div class="college-header">
          OFFICE OF THE PRINCIPAL, PANCHAYAT COLLEGE, BARAGADA
        </div>
        <div class="notice-line">
          NOTICE NO. ____________ &nbsp;&nbsp;&nbsp;&nbsp; DATE: ____________
        </div>

        <div class="preamble">
          The provisional selection list and waiting list for the Phase-II waiting round/spot round of UG e-Admission for the session 2026-27 are prescribed below with respect to departmental vacant seats.
        </div>

        <table style="width:100%; margin-bottom:10px; font-weight:bold; font-size:10pt; border:none;">
          <tr>
            <td align="left" style="border:none;">DEPARTMENT: ${dept.deptName.toUpperCase()}</td>
            <td align="right" style="border:none;">VACANCY: ${vacancyFormatted}</td>
          </tr>
        </table>

        <!-- PROVISIONALLY SELECTED LIST TABLE -->
        <table class="spot-table">
          <thead>
            <tr>
              <th colspan="8" class="section-banner">PROVISIONALLY SELECTED LIST</th>
            </tr>
            <tr>
              <th style="width:6%;">SL NO</th>
              <th style="width:15%;">BARCODE</th>
              <th style="width:30%;">NAME OF THE STUDENT</th>
              <th style="width:15%;">MOBILE NO</th>
              <th style="width:9%;">MAX MARKS</th>
              <th style="width:10%;">MARKS SECURED</th>
              <th style="width:9%;">PERCENTAGE (%)</th>
              <th style="width:6%;">RANK</th>
            </tr>
          </thead>
          <tbody>
            ${
              dept.selectedStudents && dept.selectedStudents.length > 0
                ? dept.selectedStudents
                    .map((s) => {
                      const sl = currentSlNo++;
                      const pctStr = s.percentage !== undefined ? `${s.percentage}` : (s.mark ? `${s.mark}` : '—');
                      const maxM = s.maxMark ?? 600;
                      const secM = s.securedMark ?? s.mark ?? '—';
                      return `
                        <tr>
                          <td class="center bold">${sl}</td>
                          <td class="barcode-cell">${s.barcode || '—'}</td>
                          <td class="left bold">${(s.name || '').toUpperCase()}</td>
                          <td class="center">${s.phone || '—'}</td>
                          <td class="center">${maxM}</td>
                          <td class="center">${secM}</td>
                          <td class="center">${pctStr}</td>
                          <td class="center bold">${sl}</td>
                        </tr>
                      `;
                    })
                    .join('')
                : `<tr><td colspan="8" class="center" style="padding:10px; color:#555;">No candidates provisionally selected.</td></tr>`
            }
          </tbody>
        </table>

        <!-- WAITING LIST TABLE -->
        ${
          dept.waitingStudents && dept.waitingStudents.length > 0
            ? `
              <table class="spot-table">
                <thead>
                  <tr>
                    <th colspan="8" class="section-banner">WAITING LIST</th>
                  </tr>
                  <tr>
                    <th style="width:6%;">SL NO</th>
                    <th style="width:15%;">BARCODE</th>
                    <th style="width:30%;">NAME OF THE STUDENT</th>
                    <th style="width:15%;">MOBILE NO</th>
                    <th style="width:9%;">MAX MARKS</th>
                    <th style="width:10%;">MARKS SECURED</th>
                    <th style="width:9%;">PERCENTAGE (%)</th>
                    <th style="width:6%;">RANK</th>
                  </tr>
                </thead>
                <tbody>
                  ${dept.waitingStudents
                    .map((s) => {
                      const sl = currentSlNo++;
                      const pctStr = s.percentage !== undefined ? `${s.percentage}` : (s.mark ? `${s.mark}` : '—');
                      const maxM = s.maxMark ?? 600;
                      const secM = s.securedMark ?? s.mark ?? '—';
                      return `
                        <tr>
                          <td class="center bold">${sl}</td>
                          <td class="barcode-cell">${s.barcode || '—'}</td>
                          <td class="left bold">${(s.name || '').toUpperCase()}</td>
                          <td class="center">${s.phone || '—'}</td>
                          <td class="center">${maxM}</td>
                          <td class="center">${secM}</td>
                          <td class="center">${pctStr}</td>
                          <td class="center bold">${sl}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
            : ''
        }

        <div style="margin-top:35px; width:100%;">
          <table style="width:100%; border:none;">
            <tr>
              <td style="border:none;"></td>
              <td align="center" style="width:220px; border:none; font-size:10pt;">
                Principal<br/>
                <b>Panchayat College, Baragada</b>
              </td>
            </tr>
          </table>
        </div>
      </div>
    `;
  });

  htmlContent += `
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Spot_Round_Official_List_${dateStr}.doc`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
