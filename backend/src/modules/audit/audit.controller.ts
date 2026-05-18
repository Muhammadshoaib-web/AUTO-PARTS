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
  @ApiOperation({ summary: 'Get audit log trail with pagination and filters' })
  findAll(
    @Query('q')            q?: string,
    @Query('userId')       userId?: string,
    @Query('action')       action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('from')         from?: string,
    @Query('to')           to?: string,
    @Query('page')         page?: string,
    @Query('limit')        limit?: string,
  ) {
    return this.svc.findAll({
      q,
      userId,
      action,
      resourceType,
      from,
      to,
      page:  page  ? +page  : 1,
      limit: limit ? +limit : 50,
    });
  }

  @Get('meta')
  @ApiOperation({ summary: 'Distinct action and resourceType values for filter dropdowns' })
  getDistinctValues() {
    return this.svc.getDistinctValues();
  }
}
