
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
            const logsArr = data.logs.map(l => [
                l.timestamp, l.type === 'in' ? 'Masuk' : 'Keluar', l.itemName, l.qty, l.price, l.buyPrice, l.qty * l.price
            ]);
            sheetLogs.getRange(2, 1, logsArr.length, 7).setValues(logsArr);
        }

        // 3. Simpan Data Hutang (Debts) - NEW
        let sheetDebts = ss.getSheetByName("Buku Hutang");
        if (!sheetDebts) {
            sheetDebts = ss.insertSheet("Buku Hutang");
            sheetDebts.appendRow(["ID", "Timestamp", "Peminjam", "Barang", "Qty", "Harga", "Modal", "Total", "Status"]);
        }

        if (sheetDebts.getLastRow() > 1) {
            sheetDebts.getRange(2, 1, sheetDebts.getLastRow() - 1, 9).clearContent();
        }

        if (data.debts && data.debts.length > 0) {
            const debtsArr = data.debts.map(d => [
                d.id, d.timestamp, d.customerName, d.itemName, d.qty, d.price, d.buyPrice || 0, d.total, d.status
            ]);
            sheetDebts.getRange(2, 1, debtsArr.length, 9).setValues(debtsArr);
        }

        return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetItems = ss.getSheetByName("Master Barang");
        const sheetLogs = ss.getSheetByName("Riwayat Transaksi");
        const sheetDebts = ss.getSheetByName("Buku Hutang"); // NEW

        let items = [];
        let logs = [];
        let debts = [];

        // 1. Read Items
        if (sheetItems && sheetItems.getLastRow() > 1) {
            const data = sheetItems.getRange(2, 1, sheetItems.getLastRow() - 1, 5).getValues();
            items = data.map(row => ({ id: row[0], name: row[1], buyPrice: row[2], sellPrice: row[3], stock: row[4] }));
        }

        // 2. Read Logs
        if (sheetLogs && sheetLogs.getLastRow() > 1) {
            const data = sheetLogs.getRange(2, 1, sheetLogs.getLastRow() - 1, 7).getValues();
            logs = data.map(row => ({
                timestamp: row[0], type: row[1] === 'Masuk' ? 'in' : 'out', itemName: row[2], qty: row[3], price: row[4], buyPrice: row[5]
            })).map(l => ({ ...l, id: new Date(l.timestamp).getTime() }));
        }

        // 3. Read Debts - NEW
        if (sheetDebts && sheetDebts.getLastRow() > 1) {
            const data = sheetDebts.getRange(2, 1, sheetDebts.getLastRow() - 1, 9).getValues();
            debts = data.map(row => ({
                id: row[0], timestamp: row[1], customerName: row[2], itemName: row[3], qty: row[4], price: row[5], buyPrice: row[6], total: row[7], status: row[8]
            }));
        }

        return ContentService.createTextOutput(JSON.stringify({ items, logs, debts }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
