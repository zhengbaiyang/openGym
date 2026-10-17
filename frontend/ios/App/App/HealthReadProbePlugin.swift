import Foundation
import Capacitor
import HealthKit

/// Apple's workout store is strictly READ ONLY. The default unsigned IPA contains
/// this plugin but disables the import feature at compile time. Health import requires
/// a separately built IPA signed using a HealthKit-capable provisioning profile.
@objc(HealthReadProbePlugin)
public class HealthReadProbePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthReadProbePlugin"
    public let jsName = "HealthReadProbe"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "inspect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorizeWorkouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncWorkouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listWorkouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disableSync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLocalData", returnType: CAPPluginReturnPromise)
    ]

    private let health = HKHealthStore()
    private var syncing = false
    private let preference = "openGym.health.readWorkouts.enabled"

    private var importBuild: Bool {
        #if HEALTHKIT_IMPORT_ENABLED
        return true
        #else
        return false
        #endif
    }

    @objc func inspect(_ call: CAPPluginCall) {
        call.resolve([
            "available": HKHealthStore.isHealthDataAvailable(),
            "importBuild": importBuild,
            "syncEnabled": importBuild && UserDefaults.standard.bool(forKey: preference),
            "signingVerified": false,
            "readOnly": true,
            "permissionRequested": false
        ])
    }

    @objc func authorizeWorkouts(_ call: CAPPluginCall) {
        guard importBuild else { call.reject("This is a UI-only IPA. HealthKit requires a separately signed import build."); return }
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health is unavailable"); return }
        // Called only from the explicit user-facing consent button, never on boot.
        health.requestAuthorization(toShare: [], read: [HKObjectType.workoutType()]) { [weak self] completed, error in
            DispatchQueue.main.async {
                if let error { call.reject(error.localizedDescription); return }
                guard completed else { call.reject("Apple Health authorization request was not completed"); return }
                // HealthKit deliberately does not disclose whether a user DENIED READ access.
                // This signal only means the system processed the permission request.
                UserDefaults.standard.set(true, forKey: self?.preference ?? "openGym.health.readWorkouts.enabled")
                call.resolve(["requestCompleted": true, "readPermissionGranted": NSNull()])
            }
        }
    }

    @objc func disableSync(_ call: CAPPluginCall) {
        UserDefaults.standard.set(false, forKey: preference)
        call.resolve(["syncEnabled": false, "localDataRetained": true])
    }

    @objc func syncWorkouts(_ call: CAPPluginCall) {
        guard importBuild else { call.reject("Health import is not enabled in this IPA"); return }
        guard UserDefaults.standard.bool(forKey: preference) else { call.reject("Request workout read access first"); return }
        guard HKHealthStore.isHealthDataAvailable() else { call.reject("Apple Health is unavailable"); return }
        guard !syncing else { call.reject("Workout sync is already running"); return }
        syncing = true
        do {
            let store = try HealthWorkoutStore()
            try fetchPage(store: store, start: store.startDate(), total: 0, removed: 0, call: call)
        } catch {
            syncing = false
            call.reject(error.localizedDescription)
        }
    }

    private func fetchPage(store: HealthWorkoutStore, start: Date, total: Int, removed: Int, call: CAPPluginCall) throws {
        let anchor = try store.anchor()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)
        let query = HKAnchoredObjectQuery(type: HKObjectType.workoutType(), predicate: predicate,
                                         anchor: anchor, limit: 200) { [weak self] _, samples, deleted, newAnchor, error in
            DispatchQueue.main.async {
                guard let self else { call.reject("HealthKit bridge no longer available"); return }
                if let error { self.syncing = false; call.reject(error.localizedDescription); return }
                let workouts = (samples ?? []).compactMap { $0 as? HKWorkout }
                let removals = deleted ?? []
                do {
                    try store.apply(workouts: workouts, deleted: removals, anchor: newAnchor)
                    let newTotal = total + workouts.count
                    let newRemoved = removed + removals.count
                    if workouts.count + removals.count >= 200 && newAnchor != nil {
                        try self.fetchPage(store: store, start: start, total: newTotal, removed: newRemoved, call: call)
                    } else {
                        self.syncing = false
                        call.resolve([
                            "addedOrUpdated": newTotal,
                            "markedDeleted": newRemoved,
                            "workouts": try store.list(),
                            "readPermissionGranted": NSNull()
                        ])
                    }
                } catch {
                    self.syncing = false
                    call.reject(error.localizedDescription)
                }
            }
        }
        health.execute(query)
    }

    @objc func listWorkouts(_ call: CAPPluginCall) {
        guard importBuild else { call.resolve(["workouts": [], "importBuild": false]); return }
        do { call.resolve(["workouts": try HealthWorkoutStore().list(), "importBuild": true]) }
        catch { call.reject(error.localizedDescription) }
    }

    @objc func clearLocalData(_ call: CAPPluginCall) {
        guard importBuild else { call.reject("Unavailable in UI-only IPA"); return }
        guard call.getBool("confirmed") == true else { call.reject("Explicit confirmation required"); return }
        guard !syncing else { call.reject("Wait for synchronization to finish"); return }
        do { try HealthWorkoutStore().clear(); call.resolve(["localDataCleared": true, "appleHealthUnchanged": true]) }
        catch { call.reject(error.localizedDescription) }
    }
}
