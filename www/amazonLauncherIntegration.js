cordova.define("com.amazon.cordova.plugins.launcher", function (require, exports, module) {
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

    /** @module amazonLauncherIntegration*/

    var exec = require('cordova/exec');

    var amazonLauncherIntegration = {

        /**
         * Used to check the signed in status stored by the application, passes a boolean to the success callback
         *
         * @param {requestCallback} success - The callback that the signedIn status is passed to
         * @param {requestCallback} failure - The callback that is called when an error occurs accessing the signedIn status
         */
        isSignedIn: function (success, failure) {
            exec(success, failure, "LauncherIntegrationPlugin", "isSignedIn", []);
        },

        /**
         * Used to set the signed in status stored by the application that determines the intent sent to the launcher.
         *
         * @param {boolean} status - The signedIn status to be set
         * @param success - The callback that is called when the signedIn status is successfully set
         * @param failure - The callback that is called when an error occurs while setting the signedIn status
         */
        setSignedInStatus: function (status, success, failure) {
            exec(success, failure, "LauncherIntegrationPlugin", "setSignedInStatus", [status]);
        }

    };

    module.exports = amazonLauncherIntegration;
});
