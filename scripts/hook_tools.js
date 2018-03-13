#!/usr/bin/env node
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
 * Portions of this file are based on a project by Devin Jett (Github: @djett41), released under the Apache 2.0 license with permission.
 *
 */

// global constants
const fs = require('fs');
const path = require('path');
const elementTree = require('elementtree');

const PLUGIN_ACTIVITY_NAME = 'DeepLinkingCordovaActivity';

const platformConfig = (function () {

    return {
        /**
         * Parses an xml file and returns parsed file in an ElementTree object.
         * @param filePath The location/name of file to be parsed.
         * @returns {elementTree.ElementTree} ElementTree object containing Xml file inParsed file in ElementTree object.
         */
        parseElementTreeSync: function (filePath) {
            let contents = "";
            contents = this.getFileContent(filePath)
            if (contents) {
                //Windows is the BOM. Skip the Byte Order Mark.
                contents = contents.substring(contents.indexOf('<'));
            }
            return new elementTree.ElementTree(elementTree.XML(contents));
        },

        /**
         * Returns ElementTree object of xml file.
         * @param targetFile Filename in string format.
         * @returns {elementTree.ElementTree} Parsed XML file as an ElementTree object.
         */
        getTargetXml: function (targetFile) {
            return this.parseElementTreeSync(targetFile);
        },

        /**
         * Creates location of AndroidManifest in Cordova project based on project root.
         * @param context Cordova context for hook
         * @returns {string} Filename of AndroidManifest.
         */
        getAndroidManifestPath: function (context) {
            const manifestName = 'AndroidManifest.xml';
            const projectRoot = this.getProjectRoot(context);
            if (!projectRoot) {
                throw new Error('No project root');
            }
            let manifestPathArray = ['platforms', 'android'];
            if (!fs.existsSync(path.join(projectRoot, ...manifestPathArray, manifestName))) {
                manifestPathArray.push('app','src','main');
            }
            return path.join(projectRoot, ...manifestPathArray, manifestName);
        },

        /**
         * Gets root of project from context
         * @param context Cordova context for hook
         * @returns {string} Path of project
         */
        getProjectRoot: function(context) {
            return context.opts.projectRoot;
        },

        /**
         * Gets the location of the plugin within the project
         * @param context Cordova context for the hook
         * @returns {string} Path of plugin in project
         */
        getPluginDirectory: function(context) {
            return context.opts.plugin.dir;
        },

        /**
         * Gets the version number from context.
         * @param context Cordova context for the hook
         * @returns {Number} Version number of current Cordova project
         */
        getCordovaVersion: function(context) {
            return parseFloat(context.opts.cordova.version);
        },

        /**
         * Creates location of config.xml in Cordova project based on project root.
         * @param projectRoot Root of Cordova project.
         * @returns {string} Filename of config.xml.
         */
        getProjectConfigPath: function(projectRoot) {
            if (!projectRoot) {
                throw new Error('No project root');
            }
            return path.join(projectRoot, 'config.xml');
        },

        /**
         * Edits the Cordova Android application to enable deep linking. Edits main activity to extend DeepLinkingCordovaActivity.
         * Modifies DeepLinkingCordovaActivity to be part of Cordova package and copies into main activity folder.
         * @param context The context the script is running from used to get package root and plugin dir.
         */
        preparePackageForDeepLinking: function(context) {
            if (this.isAndroidIncludedInProject(context)) {
                console.error('Android not part of cordova app');
                return;
            }
            try {

                const activityPathInPlugin = ['src', 'com', 'amazon', 'cordova', 'plugins', 'launcher', PLUGIN_ACTIVITY_NAME + '.java'];

                const projectRoot = this.getProjectRoot(context);
                const pluginDir = this.getPluginDirectory(context);

                const mainActivityName = this.getMainActivityName(context);

                if (typeof mainActivityName !== 'string') {
                    console.error('Could not find a Main Activity. Follow online documentation to edit your launch Activity to enable deep linking.');
                    return;
                }

                const packageName = this.getProjectPackageName(projectRoot);
                const packageLocation = packageName.split(new RegExp('\\.', 'g'));

                let srcPath = ['src'];
                let packageLocationInProject = [projectRoot, 'platforms', 'android', ...srcPath, ...packageLocation];
                if (!fs.existsSync(path.join(...packageLocationInProject))) {
                    srcPath = ['app', 'src', 'main', 'java'];
                    packageLocationInProject = [projectRoot, 'platforms', 'android', ...srcPath, ...packageLocation];
                }

                const pluginActivityLocation = path.join(pluginDir, ...activityPathInPlugin);
                const activityLocation = path.join(...packageLocationInProject, PLUGIN_ACTIVITY_NAME + '.java');
                const mainActivityLocation = path.join(...packageLocationInProject, mainActivityName + '.java');


                this.copyDeepLinkingActivity(pluginActivityLocation,activityLocation);
                this.changeActivityPackage(activityLocation, packageName);
                this.changeActivityParentClass(mainActivityLocation, "CordovaActivity", PLUGIN_ACTIVITY_NAME);
            } catch (e) {
                console.error(e.toString());
            }
        },

        /**
         * Undos all of the changes made for deep linking. Deletes the DeepLinkingCordovaActivity class from the project and changes the main activity's parent class to the parent class of the DeepLinkingCordovaActivity.
         * @param context Cordova context for the hook.
         */
        removeDeepLinkingSupport: function(context) {
            if (this.isAndroidIncludedInProject(context)) {
                console.error('Android not part of cordova app');
                return;
            }
            const projectRoot = this.getProjectRoot(context);
            const mainActivityName = this.getMainActivityName(context);
            const packageName = this.getProjectPackageName(projectRoot);
            const packageLocation = packageName.split(new RegExp('\\.', 'g'));

            let srcPath = ['src'];
            let packageLocationInProject = [projectRoot, 'platforms', 'android', ...srcPath, ...packageLocation];

            if (!fs.existsSync(path.join(...packageLocationInProject))) {
                srcPath = ['app', 'src', 'main', 'java'];
                packageLocationInProject = [projectRoot, 'platforms', 'android', ...srcPath, ...packageLocation];
            }

            const activityLocation = path.join(...packageLocationInProject, PLUGIN_ACTIVITY_NAME + '.java');
            const mainActivityLocation = path.join(...packageLocationInProject, mainActivityName + '.java');
            const originalClassName = this.getParentClassName(activityLocation);

            this.deleteFile(activityLocation);
            this.changeActivityParentClass(mainActivityLocation, "DeepLinkingCordovaActivity", originalClassName);
        },

        /**
         * Synchronously reads the content of the given filePath. Throws formatted error
         * @param filePath Path of the file to be read.
         * @returns {string} Content of the file in string format.
         */
        getFileContent: function(filePath) {
            try {
                return fs.readFileSync(filePath, 'utf8');
            } catch (e) {
                let errMessage = "Error reading file located at: " + filePath;
                throw new Error(errMessage);
            }
        },

        /**
         * Delete the file located at the filePath
         * @param filePath path to file to be deleted
         */
        deleteFile: function(filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error("Failed to delete file located at: " + filePath);
                return;
            }
        },

        /**
         * Gets the launch/main acitivity from the android manifest.
         * @param context Cordova context for hook
         * @returns {string} The name of the main activity of the application.
         */
        getMainActivityName: function(context) {
            const manifestPath = this.getAndroidManifestPath(context);
            const manifest = this.getTargetXml(manifestPath);
            return this.findLaunchActivity(manifest).attrib['android:name'];
        },

        /**
         * Get's the package name from the config file of the Cordova project.
         * @param projectRoot The root of the Cordova project.
         * @returns {string} Package name
         */
        getProjectPackageName: function(projectRoot) {
            const configPath = this.getProjectConfigPath(projectRoot);
            const configFile = this.getTargetXml(configPath);
            return configFile.getroot().attrib.id;

        },

        /**
         * Copies the deep linking Cordova activity from the plugin directory to a new project directory.
         * @param pluginActivityLocation Original location of the Activity.
         * @param newLocation Location to copy activity to.
         */
        copyDeepLinkingActivity: function(pluginActivityLocation, newLocation) {
            try {
                const data = this.getFileContent(pluginActivityLocation);
                fs.writeFileSync(newLocation, data, 'utf8');
                console.log('New Activity Extending CordovaActivity created');
            } catch (e) {
                let errMessage = 'Copy DeepLinkingActivity failed. Please fix error and try again.';
                errMessage += '\n';
                errMessage += e.toString();
                throw new Error(errMessage);
            }
        },

        /**
         * Modifies the package name of the provided Android Activity to be part of a different package.
         * @param activityLocation Location of activity to be modified.
         * @param packageName New name of package.
         */
        changeActivityPackage: function(activityLocation, packageName) {
            try {
                const data = this.getFileContent(activityLocation);
                const packageNameRegex = /package .*;/;
                const newActivity = data.replace(packageNameRegex, 'package ' + packageName + ';');
                fs.writeFileSync(activityLocation, newActivity, 'utf8');
                console.log('New Activity package adjusted to match project package');
            } catch (e) {
                let errMessage = 'Editing DeepLinkingCordovaAcivity package name failed. Please do so manually or fix error and try again.';
                errMessage += '\n';
                errMessage += e.toString();
                throw new Error(errMessage);
            }

        },

        /**
         * Uses a regex to obtain the name of the class that the given class extends
         * @param filePath Java class's absolute path to get the parent class from
         * @returns {String} Name of the parent class of the java class located at filePath
         */

        getParentClassName: function(filePath) {
            let data = this.getFileContent(filePath);

            const captureParentClassRegex = /.*extends\s(.+?)\s.*/;
            if (!captureParentClassRegex.test(data)) {
                let errMessage = "Could not find parent class of activity located at: " + filePath;
                throw new Error(errMessage);
            }
            return captureParentClassRegex.exec(data)[1];

        },

        /**
         * Modifies an activity to extend a new activity.
         * @param mainActivityLocation Filename of activity to be modified.
         * @param oldParentClassName The old parent class name that is expected to be replaced
         * @param newParentClassName Name of new parent class.
         */
        changeActivityParentClass(mainActivityLocation, oldParentClassName, newParentClassName) {
            try {
                const data = this.getFileContent(mainActivityLocation);
                const captureAllExceptParentClassRegex = new RegExp("(.*extends )" + oldParentClassName + "(.*)");
                if (!captureAllExceptParentClassRegex.test(data)) {
                    throw new Error("File located at: " + mainActivityLocation + " does not extend " + oldParentClassName);
                }
                const newActivity = data.replace(captureAllExceptParentClassRegex, '$1' + newParentClassName + '$2');
                fs.writeFileSync(mainActivityLocation, newActivity, 'utf8');
                console.log('Parent Class of file located at: ' + mainActivityLocation + ' changed to ' + newParentClassName);
            } catch (e) {
                let errMessage = 'Editing MainActivity parent class failed. Please do so manually by changing parent class to DeepLinkingCordovaActivity or fix error and try again.';
                errMessage += '\n';
                errMessage += e.toString();
                throw new Error(errMessage);
            }
        },

        /**
         * Creates intent filter to capture intents with name=android.intent.action.VIEW and action=android.intent.category.DEFAULT
         * @returns XML object representation of the intent filter.
         */
        createIntentFilter: function () {
            const intentFilter = new elementTree.Element('intent-filter');
            const action = elementTree.SubElement(intentFilter, 'action');
            action.set('android:name', 'android.intent.action.VIEW');
            const category = elementTree.SubElement(intentFilter, 'category');
            category.set('android:name', 'android.intent.category.DEFAULT');

            return intentFilter;
        },

        /**
         * Find's the launch activity of the Cordova activity. First looks for activity titled "MainActivity." If not found, looks to see if there is only one activity specified. Finally, finds launch activity as specified by Manifest.
         * @param manifest ElementTree object representing the android manifest.
         * @returns {string} Returns the name of the launch activity.
         */
        findLaunchActivity: function(manifest) {
            const activityEl = manifest.find('*/activity[@android:name="MainActivity"]');
            if (activityEl) {
                return activityEl;
            }
            const allActivities = manifest.findall('*/activity');
            if (allActivities.length === 1) {
                return allActivities[0];
            }
            const launchActivity = allActivities.filter(function(activity) {
                return activity.findall('intent-filter')
                    .filter(function(child) {
                        const action = child.find('action[@android:name="android.intent.action.MAIN"]');
                        const category = child.find('category[@android:name="android.intent.category.LAUNCHER"]');
                        const data = child.find('data');
                        return (action && category && !data);
                    })
                    .length > 0;
            });
            if (launchActivity.length > 0) {
                return launchActivity[0];
            }

        },

        /**
         * Removes intent filter added to android manifest when plugin is added to project.
         * @param context Cordova context for hook
         */
        removeIntentFilter: function (context) {
            if (this.isAndroidIncludedInProject(context)) {
                console.error('Android not part of cordova app');
                return;
            }
            const manifestPath = this.getAndroidManifestPath(context);
            const tempManifest = this.getTargetXml(manifestPath);

            const activityEl = this.findLaunchActivity(tempManifest);
            if (!activityEl) {
                throw new Error('Could not find MainActivity, to finish removal process please remove the intent filter with action android.intent.action.VIEW and category android.intent.category.DEFAULT from the launch activity');
            }

            activityEl.findall('intent-filter')
                .forEach(function(child) {
                    const action = child.find('action[@android:name="android.intent.action.VIEW"]');
                    const category = child.find('category[@android:name="android.intent.category.DEFAULT"]');
                    const data = child.find('data');
                    if (action && category && !data) {
                        console.log('Removing intent-filter from Android Manifest');
                        activityEl.remove(child);
                    }
                });

            fs.writeFileSync(manifestPath, tempManifest.write({indent: 4}), 'utf-8');
        },

        /**
         * Adds an intent filter to AndroidManifest.
         * @param context Cordova context for hook
         */
        addIntentFilter: function (context) {
            if (this.isAndroidIncludedInProject(context)) {
                console.error('Android not part of cordova app');
                return;
            }
            const manifestPath = this.getAndroidManifestPath(context);
            const tempManifest = this.getTargetXml(manifestPath);

            const activityEl = this.findLaunchActivity(tempManifest);
            if (!activityEl) {
                throw new Error('Could not find MainActivity, please add an intentintent filter with action android.intent.action.VIEW and category android.intent.category.DEFAULT to the launch activity');
            }

            let intentFilter = this.createIntentFilter();
            console.log('Adding intent-filter to Android Manifest');
            activityEl.append(intentFilter);

            fs.writeFileSync(manifestPath, tempManifest.write({indent: 4}), 'utf-8');
        },

        /**
         * Determines if the Android platform has been included in Cordova project.
         * @param context Cordova context for hook
         * @returns {boolean} True if Android is installed, false otherwise
         */
        isAndroidIncludedInProject: function(context) {
            return context.opts.cordova.platforms.indexOf('android') < 0;
        },
    };
})();

// Main
module.exports = platformConfig;
