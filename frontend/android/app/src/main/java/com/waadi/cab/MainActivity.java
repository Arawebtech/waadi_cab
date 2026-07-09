package com.MP.Waadi_App;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyNonOverlappingSystemBars();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Capacitor / Android 15 may re-enable edge-to-edge after startup — re-apply.
        applyNonOverlappingSystemBars();
    }

    private void applyNonOverlappingSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
