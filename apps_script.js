
// PANDUAN CARA PASANG (DEPLOY) GOOGLE SHEETS SYNC:
// 1. Buka https://spreadsheet.google.com dan buat sheet baru.
// 2. Klik menu "Extensions" > "Apps Script".
// 3. Hapus semua kode yang ada, lalu COPY & PASTE kode di bawah ini.
// 4. Klik tombol "Deploy" (Warna Biru diatas) > "New deployment".
// 5. Klik icon Roda Gigi (Select type) > pilih "Web app".
// 6. Isi Description bebas (misal: "Warung Syifa v1").
// 7. PENTING:
//    - Execute as: "Me" (email anda)
//    - Who has access: "Anyone" (Siapa saja)  <-- WAJIB INI AGAR BISA DISIMPAN DARI HP
// 8. Klik "Deploy".
// 9. Salin "Web App URL" yang muncul (akhiran /exec).
// 10. Tempel URL tersebut di menu Pengaturan Aplikasi Warung Syifa.

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // 1. Simpan Data Barang (Master Items)
        let sheetItems = ss.getSheetByName("Master Barang");
        if (!sheetItems) {
            sheetItems = ss.insertSheet("Master Barang");
            sheetItems.appendRow(["ID", "Nama Barang", "Harga Beli", "Harga Jual", "Stok"]); // Header
        }

        // Clear data lama (kecuali header) & update stok terbaru
        if (sheetItems.getLastRow() > 1) {
            sheetItems.getRange(2, 1, sheetItems.getLastRow() - 1, 5).clearContent();
        }

        // Tulis ulang data barang
        if (data.items && data.items.length > 0) {
            const itemsArr = data.items.map(i => [i.id, i.name, i.buyPrice, i.sellPrice, i.stock]);
            sheetItems.getRange(2, 1, itemsArr.length, 5).setValues(itemsArr);
        }

        // 2. Simpan Riwayat Transaksi (Logs)
        // Kita append (tambahkan) yang baru saja, atau bisa juga replace all.
        // Agar aman dan simple: Kita REPLACE ALL history (Sinkronisasi penuh)
        let sheetLogs = ss.getSheetByName("Riwayat Transaksi");
        if (!sheetLogs) {
            sheetLogs = ss.insertSheet("Riwayat Transaksi");
            sheetLogs.appendRow(["Timestamp", "Tipe", "Nama Barang", "Qty", "Harga", "Modal", "Total"]); // Header
        }

        if (sheetLogs.getLastRow() > 1) {
            sheetLogs.getRange(2, 1, sheetLogs.getLastRow() - 1, 7).clearContent();
        }

        if (data.logs && data.logs.length > 0) {
            // Sort log dari terlama ke terbaru biar rapi di sheet (optional)
            // data.logs.reverse(); 

            const logsArr = data.logs.map(l => [
                l.timestamp,
                l.type === 'in' ? 'Masuk' : 'Keluar',
                l.itemName,
                l.qty,
                l.price,
                l.buyPrice,
                l.qty * l.price
            ]);
            sheetLogs.getRange(2, 1, logsArr.length, 7).setValues(logsArr);
        }

        return ContentService.createTextOutput(JSON.stringify({ result: "success", timestamp: new Date() }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
