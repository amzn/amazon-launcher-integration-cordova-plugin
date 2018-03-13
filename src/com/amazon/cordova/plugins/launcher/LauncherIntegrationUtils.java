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

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.text.TextUtils;
import android.util.Log;

public class LauncherIntegrationUtils {

    static final String TAG = "LauncherIntegration";
    static final String PREF_SIGNED_IN_STATUS = "signedInStatus";
    static final String ACTION_IS_SIGNED_IN = "isSignedIn";
    static final String ACTION_SET_SIGNED_IN = "setSignedInStatus";
    private static final String PARTNER_ID_METADATA_KEY = "com.amazon.cordova.plugins.launcher.PARTNER_ID";
    private static final String DISPLAY_NAME_METADATA_KEY = "com.amazon.cordova.plugins.launcher.DISPLAY_NAME";
    private static final String DEFAULT_SIGNEDIN_STATUS_METADATA_KEY = "com.amazon.cordova.plugins.launcher.DEFAULT_SIGNEDIN_STATUS";
    private static final String VIDEO_ID_IS_URI_KEY = "com.amazon.cordova.plugins.launcher.VIDEO_ID_IS_URI";
    private static final String VIDEO_ID_DATA_EXTRA_NAME = "amazonLauncherIntegrationVideoId";;

    /**
     * Broadcasts the launcher integration capabilities of the application.
     * @param context The android context that broadcastCapabilities is being called from. Used to access PARTNER_ID and DISPLAY_NAME stored in app metadata.
     */
    static void broadcastCapabilities(Context context) {
        Intent intent;
        try {
            intent = generateIntent(context);

            ApplicationInfo appInfo = context.getPackageManager().getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
            String PARTNER_ID = appInfo.metaData.getString(PARTNER_ID_METADATA_KEY);
            String DISPLAY_NAME = appInfo.metaData.getString(DISPLAY_NAME_METADATA_KEY);
            intent.putExtra("amazon.intent.extra.PARTNER_ID", PARTNER_ID);
            intent.putExtra("amazon.intent.extra.DISPLAY_NAME", DISPLAY_NAME);
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, "Error broadcasting capabilities", e);
            return;
        }

        // send the intent to the Launcher
        context.sendBroadcast(intent);
    }

    /**
     * Checks the signedIn status stored in shared preferences. If nothing stored in shared preferences, uses the DEFAULT_SIGNEDIN_STATUS from app metadata.
     * @param context The android context that isSignedIn is being called from. Used to access DEFAULT_SIGNEDIN_STATUS stored in app metadata.
     * @return boolean value indicating if user is signedIn.
     * @throws PackageManager.NameNotFoundException
     */
    static boolean isSignedIn(Context context) throws PackageManager.NameNotFoundException {
        ApplicationInfo appInfo = context.getPackageManager().getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
        boolean DEFAULT_SIGNEDIN_STATUS = appInfo.metaData.getBoolean(DEFAULT_SIGNEDIN_STATUS_METADATA_KEY);
        SharedPreferences sharedPref = context.getSharedPreferences(TAG, Context.MODE_PRIVATE);

        return sharedPref.getBoolean(PREF_SIGNED_IN_STATUS, DEFAULT_SIGNEDIN_STATUS);
    }

    /**
     * Checks the app metadata to determine if videoID is in URI format, determines if videoID is close to 280
     * @param context App Context
     * @return boolean value indicating if videoID is in URI format
     * @throws PackageManager.NameNotFoundException
     */
    public static boolean isVideoIdInIntentData(Context context) throws PackageManager.NameNotFoundException {
        ApplicationInfo appInfo = context.getPackageManager().getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
        return appInfo.metaData.getBoolean(VIDEO_ID_IS_URI_KEY);
    }

    /**
     * Adds the extras required by Amazon launcher to enable content to be launched directly by search.
     * @param intent The intent to be modified.
     * @param context The context used to determine activity that should be launched by FireOS launcher.
     * @param intentModifier The modifier of the intents, either PLAY or SIGNIN based on signedInStatus
     */
    static void putAmazonExtras(Intent intent, Context context, String intentModifier) {
        PackageManager packageManager = context.getPackageManager();
        Intent launchIntent = packageManager.getLaunchIntentForPackage(context.getPackageName());
        String launchClassName = launchIntent.getComponent().getClassName();

        final String AMAZON_INTENT_PREFIX = "amazon.intent.extra.";

        intent.putExtra(AMAZON_INTENT_PREFIX + intentModifier + "_INTENT_ACTION", Intent.ACTION_VIEW);
        intent.putExtra(AMAZON_INTENT_PREFIX + intentModifier + "_INTENT_PACKAGE", context.getPackageName());
        intent.putExtra(AMAZON_INTENT_PREFIX + intentModifier + "_INTENT_CLASS", launchClassName);
        intent.putExtra(AMAZON_INTENT_PREFIX + intentModifier + "_INTENT_FLAGS", Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);

        try {
            if (!isVideoIdInIntentData(context)) {
                intent.putExtra(AMAZON_INTENT_PREFIX + "DATA_EXTRA_NAME", VIDEO_ID_DATA_EXTRA_NAME);
            }
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, "Could not determine if videoID is in intent data", e);
        }
    }

    /**
     * Creates an intent to be sent back to FireOS launcher detailing capabilities of application.
     * @param context Android context of the application
     * @return An intent that contains all the information required by the launcher for Catalog Integration.
     * @throws PackageManager.NameNotFoundException
     */
    static Intent generateIntent(Context context) throws PackageManager.NameNotFoundException {
        Intent intent = new Intent();
        intent.setPackage("com.amazon.tv.launcher");
        intent.setAction("com.amazon.device.CAPABILITIES");


        //The same activity is launched regardless of signin status. The Web App is responsible for determining signin status and displaying correct
        if (isSignedIn(context)) {
            putAmazonExtras(intent, context, "PLAY");
        } else {
            putAmazonExtras(intent, context, "SIGNIN");
        }

        return intent;
    }

    /**
     * Used to retrieve the string extra name the video id will be stored in, if it is not a URI
     * @return String that is the key for the string extra video id in the intent sent by launcher
     */
    public static String getVideoIdDataExtraName() {
        return VIDEO_ID_DATA_EXTRA_NAME;
    }
}
