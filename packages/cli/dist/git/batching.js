"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInBatches = processInBatches;
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Process commits in batches, sending them to the API
 */
async function* processInBatches(repository, commits, config, apiUrl, apiToken) {
    const batchSize = config.maxCommitsPerBatch;
    const maxRetries = config.maxRetries || 3;
    const retryDelayMs = config.retryDelayMs || 1000;
    const totalBatches = Math.ceil(commits.length / batchSize);
    logger_1.default.info(`Processing ${commits.length} commits in ${totalBatches} batches`);
    logger_1.default.debug(`Batch config: size=${batchSize}, maxRetries=${maxRetries}, retryDelay=${retryDelayMs}ms`);
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const start = batchNum * batchSize;
        const end = Math.min(start + batchSize, commits.length);
        const batchCommits = commits.slice(start, end);
        // Log progress
        logger_1.default.info(`\nProcessing batch ${batchNum + 1}/${totalBatches} (${batchCommits.length} commits)...`);
        let lastError = null;
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                if (attempt > 0) {
                    logger_1.default.warn(`Retry attempt ${attempt}/${maxRetries - 1} for batch ${batchNum + 1}...`);
                    // Use injected delay function or setTimeout
                    const delay = config.delayFn || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
                    await delay(retryDelayMs);
                }
                const payload = {
                    repository,
                    commits: batchCommits,
                };
                logger_1.default.debug(`Sending batch ${batchNum + 1} to API: ${apiUrl}/api/cli/commits`);
                logger_1.default.debug(`Batch payload: ${JSON.stringify(payload, null, 2)}`);
                const response = await fetch(`${apiUrl}/api/cli/commits`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiToken}`,
                    },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`API error (status ${response.status}): ${errorText}`);
                }
                const result = await response.json();
                if (attempt > 0) {
                    logger_1.default.info(`Successfully processed batch ${batchNum + 1} after ${attempt + 1} attempts`);
                }
                logger_1.default.debug(`Batch ${batchNum + 1} results: ${result.processedCount} commits processed, ` +
                    `${result.achievements.length} achievements found, ` +
                    `${result.errors?.length || 0} errors`);
                yield result;
                // Success, break the retry loop
                break;
            }
            catch (error) {
                lastError = error;
                attempt++;
                if (attempt === maxRetries) {
                    logger_1.default.error(`Failed to process batch ${batchNum + 1}/${totalBatches} after ${maxRetries} attempts: ${error.message}`);
                    throw new Error(`Maximum retries (${maxRetries}) exceeded for batch ${batchNum + 1}. Last error: ${error.message}`);
                }
                else {
                    logger_1.default.warn(`Error processing batch ${batchNum + 1} (attempt ${attempt}/${maxRetries}): ${error.message}`);
                }
            }
        }
    }
}
