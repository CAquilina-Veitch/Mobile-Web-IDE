/**
 * Authentication Module
 * Handles GitHub OAuth Device Flow authentication
 */

import { Storage } from './storage.js';

export class Auth {
    constructor() {
        // GitHub OAuth App credentials
        // NOTE: For production use, you'll need to create a GitHub OAuth App
        // and replace this with your actual client ID
        // Get one at: https://github.com/settings/developers
        this.clientId = 'Ov23liPCN3KvBJnJ5rhf'; // Replace with your GitHub OAuth App Client ID
        this.deviceCodeEndpoint = 'https://github.com/login/device/code';
        this.accessTokenEndpoint = 'https://github.com/login/oauth/access_token';
        this.pollInterval = 5000; // 5 seconds
        this.pollTimeout = null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = Storage.getAuthToken();
        return token !== null && token !== '';
    }

    /**
     * Get stored auth token
     */
    getToken() {
        return Storage.getAuthToken();
    }

    /**
     * Initiate Device Flow authentication
     */
    async initiateDeviceFlow() {
        try {
            const response = await fetch(this.deviceCodeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    scope: 'repo user'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to initiate device flow');
            }

            const data = await response.json();
            return {
                deviceCode: data.device_code,
                userCode: data.user_code,
                verificationUri: data.verification_uri,
                expiresIn: data.expires_in,
                interval: data.interval
            };
        } catch (error) {
            console.error('Device flow initiation failed:', error);
            throw error;
        }
    }

    /**
     * Poll for access token
     */
    async pollForToken(deviceCode, interval = 5) {
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const response = await fetch(this.accessTokenEndpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            client_id: this.clientId,
                            device_code: deviceCode,
                            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
                        })
                    });

                    const data = await response.json();

                    if (data.access_token) {
                        // Success! We got the token
                        clearTimeout(this.pollTimeout);
                        Storage.setAuthToken(data.access_token);
                        resolve(data.access_token);
                    } else if (data.error === 'authorization_pending') {
                        // User hasn't authorized yet, keep polling
                        this.pollTimeout = setTimeout(poll, interval * 1000);
                    } else if (data.error === 'slow_down') {
                        // We're polling too fast, slow down
                        this.pollTimeout = setTimeout(poll, (interval + 5) * 1000);
                    } else if (data.error === 'expired_token') {
                        // Token expired, user took too long
                        clearTimeout(this.pollTimeout);
                        reject(new Error('Device code expired. Please try again.'));
                    } else if (data.error === 'access_denied') {
                        // User declined the authorization
                        clearTimeout(this.pollTimeout);
                        reject(new Error('Authorization denied by user.'));
                    } else {
                        // Unknown error
                        clearTimeout(this.pollTimeout);
                        reject(new Error(data.error_description || 'Unknown error occurred.'));
                    }
                } catch (error) {
                    clearTimeout(this.pollTimeout);
                    reject(error);
                }
            };

            // Start polling
            poll();
        });
    }

    /**
     * Cancel ongoing polling
     */
    cancelPolling() {
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
    }

    /**
     * Complete login flow
     */
    async login(onDeviceCode) {
        try {
            // Initiate device flow
            const deviceFlowData = await this.initiateDeviceFlow();

            // Notify callback with device code info
            if (onDeviceCode) {
                onDeviceCode({
                    userCode: deviceFlowData.userCode,
                    verificationUri: deviceFlowData.verificationUri,
                    expiresIn: deviceFlowData.expiresIn
                });
            }

            // Poll for token
            const token = await this.pollForToken(
                deviceFlowData.deviceCode,
                deviceFlowData.interval
            );

            return token;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    }

    /**
     * Logout
     */
    logout() {
        this.cancelPolling();
        Storage.clearAll();
    }

    /**
     * Verify token is still valid
     */
    async verifyToken(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    /**
     * Get user info with token
     */
    async getUserInfo(token) {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get user info');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get user info:', error);
            throw error;
        }
    }
}

export default Auth;
