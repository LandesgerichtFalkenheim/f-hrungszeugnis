const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const ARCHIV_FILE = "archiv.json";

// Archiv initialisieren
if (!fs.existsSync(ARCHIV_FILE)) fs.writeFileSync(ARCHIV_FILE, "[]");

// Sicherheitsnummer generieren
function generateSecureNumber() {
    const num = Math.floor(Math.random() * 1e16);
    return num.toString();
}

function toHex(str) {
    return Buffer.from(str).toString("hex");
}

app.post("/create", async (req, res) => {
    const data = req.body;

    const sicherheitsnummer = generateSecureNumber();

    const templateBytes = fs.readFileSync("public/template.pdf");
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Text einfügen
    page.drawText(`Sicherheitsnummer: ${sicherheitsnummer}`, { x: 50, y: 750, size: 12, font });
    page.drawText(`Antragsteller: ${data.antragsteller}`, { x: 50, y: 720, size: 12, font });
    page.drawText(`Geburtsdatum: ${data.geburtsdatum}`, { x: 50, y: 700, size: 12, font });
    page.drawText(`Geburtsort: ${data.geburtsort}`, { x: 50, y: 680, size: 12, font });
    page.drawText(`Vorstrafen: ${data.vorstrafen}`, { x: 50, y: 650, size: 12, font });
    page.drawText(`Datum: ${data.datum}`, { x: 50, y: 630, size: 12, font });

    page.drawText(`Sachbearbeiter: ${data.sb_name}`, { x: 50, y: 600, size: 12, font });
    page.drawText(`${data.sb_dienstgrad}`, { x: 50, y: 580, size: 12, font });

    const pdfBytes = await pdfDoc.save();

    const filename = `fz_${Date.now()}.pdf`;
    fs.writeFileSync(`public/${filename}`, pdfBytes);

    // Archiv speichern
    const archiv = JSON.parse(fs.readFileSync(ARCHIV_FILE));
    archiv.push({
        sicherheitsnummer_hex: toHex(sicherheitsnummer),
        datei: filename,
        antragsteller: data.antragsteller,
        datum: data.datum
    });
    fs.writeFileSync(ARCHIV_FILE, JSON.stringify(archiv, null, 2));

    res.send(`
        <h2>Führungszeugnis erstellt</h2>
        <a href="${filename}" download>PDF herunterladen</a><br><br>
        <a href="/archiv">Zum Archiv</a>
    `);
});

// Archiv anzeigen
app.get("/archiv", (req, res) => {
    const archiv = JSON.parse(fs.readFileSync(ARCHIV_FILE));

    let html = "<h2>Archiv</h2><table border='1' cellpadding='8'><tr><th>Sicherheitsnummer (Hex)</th><th>Antragsteller</th><th>Datum</th><th>PDF</th></tr>";

    archiv.forEach(entry => {
        html += `<tr>
            <td>${entry.sicherheitsnummer_hex}</td>
            <td>${entry.antragsteller}</td>
            <td>${entry.datum}</td>
            <td><a href="${entry.datei}" download>Download</a></td>
        </tr>`;
    });

    html += "</table><br><a href='/'>Neues Führungszeugnis</a>";

    res.send(html);
});

app.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));
