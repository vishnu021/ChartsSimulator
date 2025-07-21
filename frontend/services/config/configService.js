class ConfigService {
    constructor() {
        this.config = null;
        this.loading = false;
        this.error = null;
    }

    async loadConfig() {
        if (this.loading) {
            // Wait for ongoing request
            while (this.loading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.config;
        }

        if (this.config) {
            return this.config;
        }

        this.loading = true;
        this.error = null;

        try {
            // Try to load config from server
            const config = await this.fetchServerConfig();
            this.config = config;
            return config;
        } catch (error) {
            console.warn('Failed to load server config, using fallback:', error.message);
            // Use fallback configuration
            this.config = this.getFallbackConfig();
            this.error = error;
            return this.config;
        } finally {
            this.loading = false;
        }
    }

    async fetchServerConfig() {
        const baseUrl = this.detectBaseUrl();
        const configUrl = `${baseUrl}/api/config`;
        
        const response = await fetch(configUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error(`Config fetch failed: ${response.status}`);
        }

        const config = await response.json();
        return this.normalizeConfig(config);
    }

    detectBaseUrl() {
        if (typeof window === 'undefined') {
            // Server-side rendering
            return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';
        }

        // Client-side detection
        const { protocol, hostname, port } = window.location;
        
        // If we're on localhost or development, try common development ports
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Check if we're likely in development mode
            if (port === '3000' || port === '3001') {
                return `${protocol}//localhost:9090`;
            }
        }

        // For production or same-origin deployment, use current origin
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }

    getFallbackConfig() {
        const baseUrl = this.detectBaseUrl();
        
        return {
            apiUrl: baseUrl,
            wsUrl: baseUrl.replace(/^http/, 'ws') + '/ws',
            environment: 'fallback',
            wsEndpoint: '/ws',
            version: 'unknown'
        };
    }

    normalizeConfig(config) {
        const baseUrl = this.detectBaseUrl();
        
        return {
            apiUrl: config.apiUrl || baseUrl,
            wsUrl: config.wsUrl || (baseUrl.replace(/^http/, 'ws') + '/ws'),
            environment: config.environment || 'unknown',
            wsEndpoint: config.wsEndpoint || '/ws',
            version: config.version || 'unknown'
        };
    }

    getConfig() {
        return this.config;
    }

    isLoaded() {
        return this.config !== null;
    }

    hasError() {
        return this.error !== null;
    }

    getError() {
        return this.error;
    }

    // Getters for specific config values
    getApiUrl() {
        return this.config?.apiUrl || this.detectBaseUrl();
    }

    getWsUrl() {
        return this.config?.wsUrl || (this.detectBaseUrl().replace(/^http/, 'ws') + '/ws');
    }

    getEnvironment() {
        return this.config?.environment || 'unknown';
    }
}

// Export singleton instance
export const configService = new ConfigService();

// Convenience function to ensure config is loaded
export async function ensureConfig() {
    return await configService.loadConfig();
}

// Export for testing
export { ConfigService };