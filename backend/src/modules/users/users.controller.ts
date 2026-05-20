import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@autoparts/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/** Resolve which shopId to stamp on a new user.
 *  SUPER_ADMIN can specify any shopId via dto.shopId.
 *  All other roles are always locked to their own shopId. */
function resolveShopId(creator: any, dto: CreateUserDto): string | null {
  if (creator?.role === UserRole.SUPER_ADMIN) return dto.shopId ?? null;
  return creator?.shopId ?? null;
}

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user (admin only)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.svc.create(dto, resolveShopId(user, dto));
  }

  @Get()
  @ApiOperation({ summary: 'List users (paginated, searchable)' })
  findAll(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(user?.shopId, q, page ? +page : 1, limit ? +limit : 50);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user name / email / role' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() requester: { id: string },
  ) {
    return this.svc.update(id, dto, requester?.id);
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Admin resets a user password' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.svc.resetPassword(id, dto.newPassword);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle user active / inactive' })
  toggleStatus(
    @Param('id') id: string,
    @CurrentUser() requester: { id: string },
  ) {
    return this.svc.toggleStatus(id, requester?.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete (deactivate) user' })
  remove(@Param('id') id: string, @CurrentUser() requester: { id: string }) {
    return this.svc.remove(id, requester?.id);
  }
}
