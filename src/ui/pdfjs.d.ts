/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * ENP-011: ambient types for the pdf.js legacy build used by pdfText.ts.
 *
 * The bundled `pdf.min.mjs` entry is imported (rather than `pdf.mjs`, which
 * carries a `.d.mts`) so that pdf.js's own declarations stay out of the
 * program: they reach into the optional `@napi-rs/canvas` package, whose
 * types need a newer `lib` than this project targets. Only the surface
 * pdfText.ts uses is declared here.
 */

declare module "pdfjs-dist/legacy/build/pdf.min.mjs" {
  export interface PdfTextContent {
    items: unknown[];
  }
  export interface PdfPageProxy {
    getTextContent(): Promise<PdfTextContent>;
    cleanup(): boolean;
  }
  export interface PdfDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PdfPageProxy>;
    destroy(): Promise<void>;
  }
  export interface PdfDocumentLoadingTask {
    promise: Promise<PdfDocumentProxy>;
  }
  export interface PdfDocumentInitParameters {
    data: Uint8Array;
    isEvalSupported?: boolean;
    useWorkerFetch?: boolean;
    disableAutoFetch?: boolean;
  }
  export function getDocument(params: PdfDocumentInitParameters): PdfDocumentLoadingTask;
  export const GlobalWorkerOptions: { workerSrc: string; workerPort: unknown };
  export class PasswordException extends Error {}
}

/**
 * webpack emits the pdf.js worker as a same-origin asset (`asset/resource`
 * rule in webpack.config.js); importing it yields the asset URL, which
 * pdfText.ts hands to pdf.js as `workerSrc`.
 */
declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs" {
  const workerUrl: string;
  export default workerUrl;
}
