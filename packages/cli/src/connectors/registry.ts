/**
 * Connector Registry
 *
 * Central registry for pluggable connector management. Enables dynamic
 * connector discovery and instantiation for multi-source data extraction.
 *
 * The registry pattern allows new connectors (GitHub, Jira, etc.) to be
 * added without modifying core CLI logic. Each connector is registered
 * once at application startup and retrieved by type when needed.
 */

import type { Connector } from './types';
import { GitConnector } from './git-connector';
import { GitHubConnector } from './github-connector';
import logger from '../utils/logger';

/**
 * Connector Registry - Manages pluggable connector registration and discovery.
 *
 * Provides a singleton registry for all connector implementations, enabling
 * the CLI to support multiple data sources through a consistent interface.
 *
 * @example
 * // Register connectors on startup
 * initializeConnectors();
 *
 * // Retrieve connector by type
 * const git = connectorRegistry.get('git');
 *
 * // Check if connector is available
 * if (connectorRegistry.has('github')) {
 *   const github = connectorRegistry.get('github');
 * }
 *
 * // List all available connectors
 * const types = connectorRegistry.types();
 */
export class ConnectorRegistry {
  private connectors: Map<string, Connector> = new Map();

  /**
   * Register a connector type.
   *
   * Associates a connector instance with a type identifier for later retrieval.
   * Called during application startup to register all available connectors.
   *
   * @param type - Connector type identifier (e.g., 'git', 'github', 'jira')
   * @param connector - Connector instance implementing the Connector interface
   *
   * @example
   * const registry = new ConnectorRegistry();
   * registry.register('git', new GitConnector());
   * registry.register('github', new GitHubConnector());
   */
  register(type: string, connector: Connector): void {
    this.connectors.set(type, connector);
    logger.debug(`Registered connector: ${type}`);
  }

  /**
   * Get connector by type.
   *
   * Retrieves a registered connector instance by its type identifier.
   * Throws an error if the type is not registered.
   *
   * @param type - Connector type identifier
   * @returns Connector instance for the specified type
   * @throws Error if connector type is not registered
   *
   * @example
   * const git = connectorRegistry.get('git');
   * if (!connectorRegistry.has('jira')) {
   *   throw new Error('Jira connector not available');
   * }
   */
  get(type: string): Connector {
    const connector = this.connectors.get(type);
    if (!connector) {
      throw new Error(
        `No connector registered for type: ${type}. Available types: ${Array.from(this.connectors.keys()).join(', ')}`,
      );
    }
    return connector;
  }

  /**
   * Check if connector is registered.
   *
   * Determines whether a connector for the specified type is available.
   *
   * @param type - Connector type identifier
   * @returns true if connector is registered, false otherwise
   *
   * @example
   * if (connectorRegistry.has('github')) {
   *   const github = connectorRegistry.get('github');
   * }
   */
  has(type: string): boolean {
    return this.connectors.has(type);
  }

  /**
   * List all registered connector types.
   *
   * Returns an array of all type identifiers currently registered.
   *
   * @returns Array of registered connector type strings
   *
   * @example
   * const types = connectorRegistry.types();
   * console.log(`Available connectors: ${types.join(', ')}`);
   */
  types(): string[] {
    return Array.from(this.connectors.keys());
  }
}

/**
 * Singleton instance of the connector registry.
 *
 * Used globally throughout the CLI to register and retrieve connectors.
 * Initialized with built-in connectors on application startup.
 *
 * @example
 * import { connectorRegistry, initializeConnectors } from './connectors/registry';
 *
 * initializeConnectors();
 * const git = connectorRegistry.get('git');
 */
export const connectorRegistry = new ConnectorRegistry();

/**
 * Initialize connectors and register with the registry.
 *
 * Called once on CLI startup to register all built-in connectors.
 * Extensions or plugins can register additional connectors by calling
 * connectorRegistry.register() directly.
 *
 * Registered connectors in Phase 1:
 * - git: GitConnector for extracting from Git repositories
 *
 * Future connectors to be added in Phase 2:
 * - github: GitHubConnector for extracting from GitHub
 * - jira: JiraConnector for extracting from Jira
 *
 * @example
 * // Called during CLI initialization
 * initializeConnectors();
 *
 * // Future: Register custom connectors
 * // connectorRegistry.register('custom', new CustomConnector());
 */
export function initializeConnectors(): void {
  // Register Git connector
  connectorRegistry.register('git', new GitConnector());

  // Register GitHub connector
  connectorRegistry.register('github', new GitHubConnector());

  // Future registrations:
  // connectorRegistry.register('jira', new JiraConnector());

  logger.debug(
    `Connectors initialized: ${connectorRegistry.types().join(', ')}`,
  );
}
