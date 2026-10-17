import Foundation
import HealthKit
import SQLite3

/// Imported Apple Health workouts never enter the server-synchronized openGym state.
final class HealthWorkoutStore {
    private let db: OpaquePointer
    private let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    init() throws {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("HealthHistory", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var resources = URLResourceValues()
        resources.isExcludedFromBackup = true
        var mutableDirectory = directory
        try mutableDirectory.setResourceValues(resources)
        try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: directory.path
        )
        let url = directory.appendingPathComponent("health-workouts.sqlite")
        var handle: OpaquePointer?
        guard sqlite3_open_v2(url.path, &handle, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK,
              let handle else {
            throw NSError(domain: "HealthHistory", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot open local workout database"])
        }
        db = handle
        do {
            try exec("PRAGMA journal_mode=DELETE")
            try exec("CREATE TABLE IF NOT EXISTS workouts (id TEXT PRIMARY KEY, start REAL NOT NULL, end REAL NOT NULL, duration REAL NOT NULL, activity INTEGER NOT NULL, energy REAL, source TEXT NOT NULL, source_bundle TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)")
            try exec("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value BLOB NOT NULL)")
        } catch { sqlite3_close(handle); throw error }
    }

    deinit { sqlite3_close(db) }

    private func exec(_ sql: String) throws {
        guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw databaseError() }
    }
    private func databaseError() -> NSError {
        NSError(domain: "HealthHistory", code: Int(sqlite3_errcode(db)),
                userInfo: [NSLocalizedDescriptionKey: String(cString: sqlite3_errmsg(db))])
    }
    private func prepare(_ sql: String) throws -> OpaquePointer {
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK, let stmt else { throw databaseError() }
        return stmt
    }
    private func columnText(_ stmt: OpaquePointer, _ index: Int32) -> String {
        guard let p = sqlite3_column_text(stmt, index) else { return "" }
        return String(cString: UnsafeRawPointer(p).assumingMemoryBound(to: CChar.self))
    }
    private func bindText(_ s: String, _ index: Int32, _ stmt: OpaquePointer) {
        sqlite3_bind_text(stmt, index, s, -1, transient)
    }
    private func setMeta(_ name: String, _ data: Data) throws {
        let stmt = try prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)")
        defer { sqlite3_finalize(stmt) }
        bindText(name, 1, stmt)
        let outcome = data.withUnsafeBytes { buffer -> Int32 in
            sqlite3_bind_blob(stmt, 2, buffer.baseAddress, Int32(buffer.count), transient)
            return sqlite3_step(stmt)
        }
        guard outcome == SQLITE_DONE else { throw databaseError() }
    }
    private func getMeta(_ name: String) throws -> Data? {
        let stmt = try prepare("SELECT value FROM metadata WHERE key = ?")
        defer { sqlite3_finalize(stmt) }
        bindText(name, 1, stmt)
        guard sqlite3_step(stmt) == SQLITE_ROW else { return nil }
        let size = Int(sqlite3_column_bytes(stmt, 0))
        guard let p = sqlite3_column_blob(stmt, 0) else { return nil }
        return Data(bytes: p, count: size)
    }
    func startDate() throws -> Date {
        if let data = try getMeta("startDate"),
           let sec = Double(String(data: data, encoding: .utf8) ?? "") {
            return Date(timeIntervalSince1970: sec)
        }
        let date = Calendar.current.date(byAdding: .month, value: -12, to: Date()) ?? Date(timeIntervalSince1970: 0)
        try setMeta("startDate", Data(String(date.timeIntervalSince1970).utf8))
        return date
    }
    func anchor() throws -> HKQueryAnchor? {
        guard let data = try getMeta("workoutAnchor") else { return nil }
        return try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
    }
    /// Atomically save the page and its query anchor; never advance an anchor on an uncommitted page.
    func apply(workouts: [HKWorkout], deleted: [HKDeletedObject], anchor: HKQueryAnchor?) throws {
        try exec("BEGIN IMMEDIATE")
        do {
            for workout in workouts {
                let stmt = try prepare("INSERT INTO workouts (id,start,end,duration,activity,energy,source,source_bundle,deleted) VALUES (?,?,?,?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET start=excluded.start,end=excluded.end,duration=excluded.duration,activity=excluded.activity,energy=excluded.energy,source=excluded.source,source_bundle=excluded.source_bundle,deleted=0")
                defer { sqlite3_finalize(stmt) }
                bindText(workout.uuid.uuidString, 1, stmt)
                sqlite3_bind_double(stmt, 2, workout.startDate.timeIntervalSince1970)
                sqlite3_bind_double(stmt, 3, workout.endDate.timeIntervalSince1970)
                sqlite3_bind_double(stmt, 4, workout.duration)
                sqlite3_bind_int64(stmt, 5, Int64(workout.workoutActivityType.rawValue))
                if let kCal = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) {
                    sqlite3_bind_double(stmt, 6, kCal)
                } else { sqlite3_bind_null(stmt, 6) }
                bindText(workout.sourceRevision.source.name, 7, stmt)
                bindText(workout.sourceRevision.source.bundleIdentifier, 8, stmt)
                guard sqlite3_step(stmt) == SQLITE_DONE else { throw databaseError() }
            }
            for item in deleted {
                let stmt = try prepare("UPDATE workouts SET deleted=1 WHERE id=?")
                defer { sqlite3_finalize(stmt) }
                bindText(item.uuid.uuidString, 1, stmt)
                guard sqlite3_step(stmt) == SQLITE_DONE else { throw databaseError() }
            }
            if let anchor {
                try setMeta("workoutAnchor", try NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true))
            }
            try exec("COMMIT")
        } catch {
            try? exec("ROLLBACK")
            throw error
        }
    }
    func list(limit: Int = 80) throws -> [[String: Any]] {
        let stmt = try prepare("SELECT id,start,end,duration,activity,energy,source,source_bundle,deleted FROM workouts ORDER BY start DESC LIMIT ?")
        defer { sqlite3_finalize(stmt) }
        sqlite3_bind_int(stmt, 1, Int32(min(max(limit, 1), 250)))
        var result: [[String: Any]] = []
        while sqlite3_step(stmt) == SQLITE_ROW {
            result.append([
                "id": columnText(stmt, 0),
                "start": sqlite3_column_double(stmt, 1) * 1000,
                "end": sqlite3_column_double(stmt, 2) * 1000,
                "duration": sqlite3_column_double(stmt, 3),
                "activity": Int(sqlite3_column_int64(stmt, 4)),
                "energyKcal": sqlite3_column_type(stmt, 5) == SQLITE_NULL ? NSNull() : NSNumber(value: sqlite3_column_double(stmt, 5)),
                "source": columnText(stmt, 6),
                "sourceBundle": columnText(stmt, 7),
                "sourceDeleted": sqlite3_column_int(stmt, 8) != 0
            ])
        }
        return result
    }
    func clear() throws {
        try exec("BEGIN IMMEDIATE")
        do {
            try exec("DELETE FROM workouts")
            try exec("DELETE FROM metadata")
            try exec("COMMIT")
        } catch { try? exec("ROLLBACK"); throw error }
    }
}
