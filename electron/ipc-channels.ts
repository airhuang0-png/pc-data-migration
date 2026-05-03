export const IPC = {
  SCAN_START: 'scan:start',
  SCAN_PROGRESS: 'scan:progress',
  SCAN_COMPLETE: 'scan:complete',

  PAIRING_GENERATE: 'pairing:generate',
  PAIRING_CONNECT: 'pairing:connect',
  PAIRING_READY: 'pairing:ready',

  TRANSFER_START: 'transfer:start',
  TRANSFER_PROGRESS: 'transfer:progress',
  TRANSFER_COMPLETE: 'transfer:complete',
  TRANSFER_CANCEL: 'transfer:cancel',
  TRANSFER_ERROR: 'transfer:error',

  EXPORT_START: 'export:start',
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_COMPLETE: 'export:complete',

  IMPORT_START: 'import:start',
  IMPORT_PROGRESS: 'import:progress',
  IMPORT_COMPLETE: 'import:complete',

  GET_SYSTEM_INFO: 'system:info',
  GET_DISK_SPACE: 'system:disk-space',
} as const;
