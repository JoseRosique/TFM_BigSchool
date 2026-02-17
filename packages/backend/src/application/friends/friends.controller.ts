import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get('friends')
  async getFriends(@Request() req: any) {
    return this.friendsService.getFriends(req.user.userId);
  }

  @Get('friends/requests')
  async getRequests(@Request() req: any) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }

  @Get('friends/pending')
  async getPending(@Request() req: any) {
    return this.friendsService.getPendingRequests(req.user.userId);
  }

  @Get('friends/blocked')
  async getBlocked(@Request() req: any) {
    return this.friendsService.getBlockedUsers(req.user.userId);
  }

  @Get('friends/lists')
  async getLists(@Request() req: any) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('USER_NOT_FOUND');
    }
    return this.friendsService.getFriendLists(userId);
  }

  @Get('users/search')
  async searchUsers(@Request() req: any, @Query('query') query?: string, @Query('q') q?: string) {
    return this.friendsService.searchUsers(req.user.userId, query ?? q ?? '');
  }

  @Get('friends/search')
  async searchUsersAlias(
    @Request() req: any,
    @Query('query') query?: string,
    @Query('q') q?: string,
  ) {
    return this.friendsService.searchUsers(req.user.userId, query ?? q ?? '');
  }

  @Post('friends/request/:userId')
  async sendRequest(@Request() req: any, @Param('userId') userId: string) {
    const requesterId = req.user?.userId;
    if (!requesterId) {
      throw new BadRequestException('USER_NOT_FOUND');
    }
    if (!isUUID(userId)) {
      throw new BadRequestException('INVALID_USER_ID');
    }
    if (userId === requesterId) {
      throw new BadRequestException('CANNOT_FRIEND_SELF');
    }
    const friendship = await this.friendsService.createRequest(requesterId, userId);
    return { message: 'REQUEST_SENT', requestId: friendship.id };
  }

  @Post('friends/requests')
  async sendRequestBody(
    @Request() req: any,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: SendFriendRequestDto,
  ) {
    const requesterId = req.user?.userId;
    if (!requesterId) {
      throw new BadRequestException('USER_NOT_FOUND');
    }
    if (dto.userId === requesterId) {
      throw new BadRequestException('CANNOT_FRIEND_SELF');
    }
    const friendship = await this.friendsService.createRequest(requesterId, dto.userId);
    return { message: 'REQUEST_SENT', requestId: friendship.id };
  }

  @Post('friends/requests/:requestId/accept')
  async accept(@Request() req: any, @Param('requestId') requestId: string) {
    await this.friendsService.acceptRequest(req.user.userId, requestId);
    return { message: 'REQUEST_ACCEPTED' };
  }

  @Post('friends/accept/:requestId')
  async acceptAlias(@Request() req: any, @Param('requestId') requestId: string) {
    await this.friendsService.acceptRequest(req.user.userId, requestId);
    return { message: 'REQUEST_ACCEPTED' };
  }

  @Delete('friends/:id')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.friendsService.deleteRelationship(req.user.userId, id);
    return { message: 'FRIEND_REMOVED' };
  }

  @Delete('friends/requests/:id/decline')
  async declineAlias(@Request() req: any, @Param('id') id: string) {
    await this.friendsService.deleteRelationship(req.user.userId, id);
    return { message: 'REQUEST_DECLINED' };
  }

  @Put('friends/block/:userId')
  async block(@Request() req: any, @Param('userId') userId: string) {
    await this.friendsService.blockUser(req.user.userId, userId);
    return { message: 'USER_BLOCKED' };
  }

  @Put('friends/unblock/:userId')
  async unblock(@Request() req: any, @Param('userId') userId: string) {
    await this.friendsService.unblockUser(req.user.userId, userId);
    return { message: 'USER_UNBLOCKED' };
  }

  @Put('friends/blocked/:userId/unblock')
  async unblockAlias(@Request() req: any, @Param('userId') userId: string) {
    await this.friendsService.unblockUser(req.user.userId, userId);
    return { message: 'USER_UNBLOCKED' };
  }
}
