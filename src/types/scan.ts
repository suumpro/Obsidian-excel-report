/**
 * Types for folder scan mode
 * Extends core models with source file tracking
 */

import type { Task, Feature, Blocker } from './models';

/**
 * Task with source file tracking
 */
export interface TaskWithSource extends Task {
  /** Path to the source markdown file (relative to vault root) */
  sourceFile: string;
  /** Parent folder of the source file */
  sourceFolder: string;
}

/**
 * Feature with source file tracking
 */
export interface FeatureWithSource extends Feature {
  sourceFile: string;
}

/**
 * Blocker with source file tracking
 */
export interface BlockerWithSource extends Blocker {
  sourceFile: string;
}

/**
 * Per-file scan result (cached individually)
 */
export interface FileScanResult {
  tasks: TaskWithSource[];
  features: FeatureWithSource[];
  blockers: BlockerWithSource[];
}

/**
 * Aggregated scan result from one or more folders
 */
export interface ScanResult {
  tasks: TaskWithSource[];
  features: FeatureWithSource[];
  blockers: BlockerWithSource[];
  /** Number of markdown files scanned */
  scannedFiles: number;
  /** Total scan duration in milliseconds */
  scanDuration: number;
}

/**
 * Create an empty ScanResult
 */
export function emptyScanResult(): ScanResult {
  return {
    tasks: [],
    features: [],
    blockers: [],
    scannedFiles: 0,
    scanDuration: 0,
  };
}
