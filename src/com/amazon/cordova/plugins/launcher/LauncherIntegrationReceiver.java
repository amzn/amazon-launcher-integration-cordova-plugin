/**
 *
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations under the License.
 *
 */
package com.amazon.cordova.plugins.launcher;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * A receiver to handle when the system requests app capabilities for the launcher.
 */
public class LauncherIntegrationReceiver extends BroadcastReceiver {

    /**
     * Broadcasts the capabilities of application when a request is received from FireTV launcher.
     * @param context The Context in which the receiver is running.
     * @param intent The intent being received.
     */
    @Override
    public void onReceive(Context context, Intent intent) {
        // build the launch intent and send the app details back to the launcher
        LauncherIntegrationUtils.broadcastCapabilities(context);
    }

}
