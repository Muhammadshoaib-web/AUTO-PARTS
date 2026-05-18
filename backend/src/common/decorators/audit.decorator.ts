import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';
export const Audit = () => SetMetadata(AUDIT_KEY, true);
