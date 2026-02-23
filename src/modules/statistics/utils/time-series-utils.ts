/**
 * Utility functions for creating and aggregating time series data.
 * These helpers optimize performance by sorting data once and iterating sequentially (O(n+m))
 * instead of repeatedly filtering (O(n*m)).
 */

