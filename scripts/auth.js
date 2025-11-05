/**
 * Authentication Module
 * Handles GitHub Personal Access Token (PAT) authentication
 */

import { Storage } from './storage.js';

export class Auth {
    constructor() {
        // No OAuth configuration needed for PAT authentication
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
     * Login with Personal Access Token
     */
    async login(token) {
        try {
            if (!token || token.trim() === '') {
                throw new Error('Please enter a valid token');
            }

            // Verify token by making a test API call
            const isValid = await this.verifyToken(token);

            if (!isValid) {
                throw new Error('Invalid token. Please check your Personal Access Token.');
            }

            // Store the token
            Storage.setAuthToken(token);

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
