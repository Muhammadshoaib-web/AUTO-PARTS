import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@autoparts/shared-types';

@ApiTags('Audit')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit log trail (admin only)' })
  findAll(@Query('resourceType') resourceType?: string) {
    return this.svc.findAll(resourceType);
  }
}
