package com.amazon.cordova.plugins.launcher;

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

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaInterface;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CordovaWebView;
import org.json.JSONArray;

/**
 * A feature plugin used to pass launch intent information to the web application.
 */
public class LauncherIntegrationPlugin extends CordovaPlugin {

    @Override
    public void initialize(CordovaInterface cordova, CordovaWebView webView) {
        super.initialize(cordova, webView);

        // on each app launch we must broadcast the launcher details
        LauncherIntegrationUtils.broadcastCapabilities(cordova.getActivity().getApplicationContext());
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        String matchedAction = null;
        try {
            if (action.equals(LauncherIntegrationUtils.ACTION_IS_SIGNED_IN)) {
                matchedAction = LauncherIntegrationUtils.ACTION_IS_SIGNED_IN;
                callbackContext.success(LauncherIntegrationUtils.isSignedIn(cordova.getActivity().getApplicationContext()) ? 1 : 0);
                return true;
            }
            if (action.equals(LauncherIntegrationUtils.ACTION_SET_SIGNED_IN)) {
                matchedAction = LauncherIntegrationUtils.ACTION_SET_SIGNED_IN;
                this.setSignedInStatus(args.getBoolean(0));
                callbackContext.success();
                return true;
            }
            return false;
        } catch (Exception e) {
            if (matchedAction == null) {
                matchedAction = "Unknown Action";
            }
            Log.e(LauncherIntegrationUtils.TAG, "Error executing " + matchedAction, e);
            callbackContext.error(e.getMessage());
            return false;
        }
    }

    /**
     * Modifies the SharedPreferences to store the signedIn status as a boolean.
     * @param status Boolean indicating if user is singedIn.
     */
    private void setSignedInStatus(boolean status) {
        SharedPreferences sharedPref = cordova.getActivity().getApplicationContext().getSharedPreferences(LauncherIntegrationUtils.TAG, Context.MODE_PRIVATE);
        sharedPref.edit()
                .putBoolean(LauncherIntegrationUtils.PREF_SIGNED_IN_STATUS, status)
                .commit();
    }

}
