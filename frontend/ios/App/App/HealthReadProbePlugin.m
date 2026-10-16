#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Register a capability-only probe; there are deliberately no write or read methods.
CAP_PLUGIN(HealthReadProbePlugin, "HealthReadProbe",
           CAP_PLUGIN_METHOD(inspect, CAPPluginReturnPromise);
)
